-- Memory Storage Service Database Schema
-- PostgreSQL 14+ required

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Main memories table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  user_id VARCHAR(255) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version VARCHAR(255) NOT NULL DEFAULT '1',
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Constraints
  CONSTRAINT memories_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT memories_user_id_not_empty CHECK (length(trim(user_id)) > 0)
);

-- Memory relationships table for graph connections
CREATE TABLE memory_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  target_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'related',
  strength DECIMAL(3,2) DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT memory_relationships_no_self_reference CHECK (source_memory_id != target_memory_id),
  CONSTRAINT memory_relationships_unique UNIQUE (source_memory_id, target_memory_id, relationship_type)
);

-- Memory tags for categorization
CREATE TABLE memory_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  tag_value VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT memory_tags_unique UNIQUE (memory_id, tag_name),
  CONSTRAINT memory_tags_name_not_empty CHECK (length(trim(tag_name)) > 0)
);

-- Memory versions for history tracking
CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  
  -- Constraints
  CONSTRAINT memory_versions_unique UNIQUE (memory_id, version_number)
);

-- User preferences and settings
CREATE TABLE user_preferences (
  user_id VARCHAR(255) PRIMARY KEY,
  preferences JSONB DEFAULT '{}',
  cache_settings JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch operations tracking
CREATE TABLE batch_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Performance and audit logging
CREATE TABLE operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization

-- Primary lookup indexes
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_updated_at ON memories(updated_at DESC);
CREATE INDEX idx_memories_priority ON memories(priority);
CREATE INDEX idx_memories_deleted_at ON memories(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search indexes
CREATE INDEX idx_memories_content_gin ON memories USING gin(to_tsvector('english', content));
CREATE INDEX idx_memories_content_trgm ON memories USING gin(content gin_trgm_ops);

-- Metadata search index
CREATE INDEX idx_memories_metadata_gin ON memories USING gin(metadata);

-- Relationship indexes
CREATE INDEX idx_memory_relationships_source ON memory_relationships(source_memory_id);
CREATE INDEX idx_memory_relationships_target ON memory_relationships(target_memory_id);
CREATE INDEX idx_memory_relationships_type ON memory_relationships(relationship_type);

-- Tag indexes
CREATE INDEX idx_memory_tags_memory_id ON memory_tags(memory_id);
CREATE INDEX idx_memory_tags_name ON memory_tags(tag_name);
CREATE INDEX idx_memory_tags_value ON memory_tags(tag_value);

-- Version indexes
CREATE INDEX idx_memory_versions_memory_id ON memory_versions(memory_id);
CREATE INDEX idx_memory_versions_created_at ON memory_versions(created_at DESC);

-- Batch operation indexes
CREATE INDEX idx_batch_operations_user_id ON batch_operations(user_id);
CREATE INDEX idx_batch_operations_status ON batch_operations(status);
CREATE INDEX idx_batch_operations_created_at ON batch_operations(created_at DESC);

-- Operation log indexes
CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_operation_type ON operation_logs(operation_type);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at DESC);
CREATE INDEX idx_operation_logs_success ON operation_logs(success);

-- Partial indexes for active records
CREATE INDEX idx_memories_active ON memories(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memory_relationships_active ON memory_relationships(source_memory_id, relationship_type) WHERE source_memory_id IS NOT NULL;

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for version management
CREATE OR REPLACE FUNCTION create_memory_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM memory_versions
    WHERE memory_id = NEW.id;
    
    -- Insert version record
    INSERT INTO memory_versions (
        memory_id,
        version_number,
        content,
        metadata,
        change_type,
        change_summary
    ) VALUES (
        NEW.id,
        next_version,
        NEW.content,
        NEW.metadata,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'create'
            WHEN TG_OP = 'UPDATE' THEN 'update'
            ELSE 'unknown'
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Initial memory creation'
            WHEN TG_OP = 'UPDATE' THEN 'Memory updated'
            ELSE 'Unknown operation'
        END
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for version tracking
CREATE TRIGGER track_memory_versions AFTER INSERT OR UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION create_memory_version();

-- Function for soft delete
CREATE OR REPLACE FUNCTION soft_delete_memory()
RETURNS TRIGGER AS $$
BEGIN
    -- Set deleted_at timestamp
    NEW.deleted_at = NOW();
    
    -- Create version record for deletion
    INSERT INTO memory_versions (
        memory_id,
        version_number,
        content,
        metadata,
        change_type,
        change_summary
    ) VALUES (
        OLD.id,
        (SELECT COALESCE(MAX(version_number), 0) + 1 FROM memory_versions WHERE memory_id = OLD.id),
        OLD.content,
        OLD.metadata,
        'delete',
        'Memory soft deleted'
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for soft delete
CREATE TRIGGER soft_delete_memory_trigger BEFORE UPDATE ON memories
    FOR EACH ROW 
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION soft_delete_memory();

-- Views for common queries

-- Active memories view (excludes soft-deleted)
CREATE VIEW active_memories AS
SELECT 
    m.*,
    COUNT(mr.id) as relationship_count,
    COUNT(mt.id) as tag_count
FROM memories m
LEFT JOIN memory_relationships mr ON m.id = mr.source_memory_id
LEFT JOIN memory_tags mt ON m.id = mt.memory_id
WHERE m.deleted_at IS NULL
GROUP BY m.id;

-- User memory statistics view
CREATE VIEW user_memory_stats AS
SELECT 
    user_id,
    COUNT(*) as total_memories,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_memories,
    COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_memories,
    MIN(created_at) as first_memory_created,
    MAX(created_at) as last_memory_created,
    AVG(length(content)) as avg_content_length
FROM memories
WHERE deleted_at IS NULL
GROUP BY user_id;

-- Recent activity view
CREATE VIEW recent_activity AS
SELECT 
    'memory_created' as activity_type,
    id as entity_id,
    user_id,
    created_at as activity_time,
    content as activity_data
FROM memories
WHERE deleted_at IS NULL

UNION ALL

SELECT 
    'memory_updated' as activity_type,
    id as entity_id,
    user_id,
    updated_at as activity_time,
    content as activity_data
FROM memories
WHERE deleted_at IS NULL AND updated_at > created_at

ORDER BY activity_time DESC;

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO recall_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO recall_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO recall_user;