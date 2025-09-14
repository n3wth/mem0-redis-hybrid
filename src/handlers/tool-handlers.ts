/**
 * MCP Tool Handlers - Extracted and refactored tool handling logic
 */

import * as crypto from "crypto";
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { CacheManager, Memory } from "../lib/cache-manager.js";
import { PubSubManager } from "../lib/pubsub-manager.js";
import {
  ErrorHandler,
  ValidationError,
  DuplicateMemoryError,
  Mem0APIError,
  IntelligenceError,
} from "../lib/errors.js";
import { EntityExtractor } from "../lib/entity-extractor.js";
import { EnhancedVectraMemory } from "../lib/enhanced-vectra-memory.js";

interface ToolContext {
  cacheManager: CacheManager;
  pubSubManager: PubSubManager;
  entityExtractor?: EntityExtractor;
  enhancedVectra?: EnhancedVectraMemory;
  mem0ApiKey?: string;
  mem0UserId: string;
  mem0BaseUrl: string;
  mode: "local" | "hybrid" | "demo";
  intelligenceMode: "basic" | "enhanced";
}

interface DuplicateCheck {
  isDuplicate: boolean;
  existingId?: string;
  existingMemory?: string;
  similarity?: number;
}

export class ToolHandlers {
  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  // Main handler dispatcher
  async handleToolCall(request: CallToolRequest): Promise<any> {
    const { name, arguments: rawArgs } = request.params;

    if (!rawArgs) {
      throw new ValidationError("arguments", "No arguments provided");
    }

    const args = rawArgs as any;

    try {
      switch (name) {
        case "add_memory":
          return await this.handleAddMemory(args);
        case "search_memory":
          return await this.handleSearchMemory(args);
        case "get_all_memories":
          return await this.handleGetAllMemories(args);
        case "delete_memory":
          return await this.handleDeleteMemory(args);
        case "deduplicate_memories":
          return await this.handleDeduplicateMemories(args);
        case "optimize_cache":
          return await this.handleOptimizeCache(args);
        case "cache_stats":
          return await this.handleCacheStats();
        case "sync_status":
          return await this.handleSyncStatus();
        case "extract_entities":
          return await this.handleExtractEntities(args);
        case "get_knowledge_graph":
          return await this.handleGetKnowledgeGraph(args);
        case "find_connections":
          return await this.handleFindConnections(args);
        default:
          throw new ValidationError("tool", `Unknown tool: ${name}`);
      }
    } catch (error: any) {
      ErrorHandler.logError(error, `Tool handler: ${name}`);
      throw error;
    }
  }

  // Add memory handler
  private async handleAddMemory(args: any): Promise<any> {
    const user_id = args.user_id || this.context.mem0UserId;
    const isAsync = args.async !== false;
    const skipDuplicateCheck = args.skip_duplicate_check || false;

    // Prepare memory content
    let body: any = { user_id };
    let contentToCheck = "";

    if (args.messages) {
      body.messages = args.messages;
      contentToCheck = args.messages.map((m: any) => m.content).join(" ");
    } else if (args.content) {
      contentToCheck = args.content;
      body.messages = [
        { role: "user", content: args.content },
        { role: "assistant", content: "I'll remember that." },
      ];
    }

    if (args.metadata) {
      body.metadata = args.metadata;
    }

    // Check for duplicates
    if (!skipDuplicateCheck && contentToCheck) {
      const duplicateCheck = await this.checkForDuplicate(
        contentToCheck,
        user_id,
      );
      if (duplicateCheck?.isDuplicate) {
        throw new DuplicateMemoryError(
          duplicateCheck.existingId!,
          duplicateCheck.similarity!,
          duplicateCheck.existingMemory,
        );
      }
    }

    // Add memory (async or sync)
    if (isAsync) {
      return await this.addMemoryAsync(body, args.priority);
    } else {
      return await this.addMemorySync(body, args.priority);
    }
  }

  // Search memory handler
  private async handleSearchMemory(args: any): Promise<any> {
    const results = await this.smartSearch(
      args.query,
      args.limit || 10,
      args.prefer_cache !== false,
    );

    if (results.length === 0) {
      return { content: [{ type: "text", text: "No memories found" }] };
    }

    // Clean and format results
    const memories = results
      .map((r) => {
        const cleanMemory = r.memory
          ? r.memory
              .replace(/\n\n+/g, "\n")
              .replace(/[ \t]+/g, " ")
              .trim()
          : "";
        return cleanMemory;
      })
      .filter((m) => m);

    if (memories.length === 1) {
      return { content: [{ type: "text", text: memories[0] }] };
    }

    return { content: [{ type: "text", text: memories.join("\n---\n") }] };
  }

  // Get all memories handler
  private async handleGetAllMemories(args: any): Promise<any> {
    const user_id = args.user_id || this.context.mem0UserId;
    const limit = Math.min(args.limit || 100, 500);
    const offset = args.offset || 0;
    const preferCache = args.prefer_cache !== false;

    let memories: Memory[] = [];

    // Try cache first if preferred
    if (preferCache) {
      memories = await this.context.cacheManager.searchFromCache("*", limit);
    }

    // Fallback to API if needed
    if (memories.length === 0) {
      const endpoint = `/v1/memories/?user_id=${user_id}&limit=${limit + offset}`;
      const response = await this.callMem0API(endpoint, "GET");
      const allMemories = Array.isArray(response)
        ? response
        : response.results || response.memories || [];
      memories = allMemories.slice(offset, offset + limit);
    }

    return {
      content: [
        {
          type: "text",
          text:
            memories.length === 0
              ? "No memories found"
              : `${memories.length} ${memories.length === 1 ? "memory" : "memories"} retrieved`,
        },
      ],
    };
  }

  // Delete memory handler
  private async handleDeleteMemory(args: any): Promise<any> {
    const memoryId = args.memory_id;

    if (!memoryId) {
      throw new ValidationError("memory_id", "Memory ID is required");
    }

    // Delete from API
    const endpoint = `/v1/memories/${memoryId}/?user_id=${this.context.mem0UserId}`;
    await this.callMem0API(endpoint, "DELETE");

    // Invalidate cache
    await this.context.pubSubManager.invalidateCache(memoryId, "delete");
    await this.context.cacheManager.deleteCachedMemory(memoryId);

    return { content: [{ type: "text", text: "Deleted" }] };
  }

  // Deduplicate memories handler
  private async handleDeduplicateMemories(args: any): Promise<any> {
    const user_id = args.user_id || this.context.mem0UserId;
    const threshold = args.similarity_threshold || 0.85;
    const isDryRun = args.dry_run !== false;

    // Get all memories
    const endpoint = `/v1/memories/?user_id=${user_id}&limit=1000`;
    const response = await this.callMem0API(endpoint, "GET");
    const memories = Array.isArray(response)
      ? response
      : response.results || [];

    // Find duplicates
    const duplicates = this.findDuplicates(memories, threshold);

    let deleteCount = 0;
    if (!isDryRun && duplicates.length > 0) {
      deleteCount = await this.deleteDuplicates(duplicates, user_id);
      await this.context.cacheManager.invalidateSearchCache();
    }

    const totalDuplicates = duplicates.reduce(
      (sum, g) => sum + g.duplicates.length,
      0,
    );

    const message = isDryRun
      ? `${totalDuplicates} dups in ${duplicates.length} groups → dry_run:false to delete`
      : `✗ ${deleteCount} dups`;

    return { content: [{ type: "text", text: message }] };
  }

  // Optimize cache handler
  private async handleOptimizeCache(args: any): Promise<any> {
    const maxMemories = args.max_memories || 1000;
    const forceRefresh = args.force_refresh || false;

    // Get memories from API
    const endpoint = `/v1/memories/?user_id=${this.context.mem0UserId}&limit=${maxMemories}`;
    const response = await this.callMem0API(endpoint, "GET");
    const memories = Array.isArray(response)
      ? response
      : response.results || response.memories || [];

    // Optimize cache
    const stats = await this.context.cacheManager.optimizeCache(
      memories,
      maxMemories,
      forceRefresh,
    );

    return {
      content: [
        {
          type: "text",
          text: `Cache optimized: ${stats.cached} memories ready`,
        },
      ],
    };
  }

  // Cache stats handler
  private async handleCacheStats(): Promise<any> {
    try {
      const stats = await this.context.cacheManager.getCacheStats();
      return {
        content: [
          {
            type: "text",
            text: `${stats.totalMemories} memories cached`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: "Could not retrieve cache statistics",
          },
        ],
      };
    }
  }

  // Sync status handler
  private async handleSyncStatus(): Promise<any> {
    const stats = this.context.pubSubManager.getQueueStats();
    const pendingCount = stats.jobQueueSize + stats.pendingMemoriesSize;

    const statusText =
      pendingCount > 0
        ? `${pendingCount} operations pending`
        : "All operations complete";

    return { content: [{ type: "text", text: statusText }] };
  }

  // Extract entities handler
  private async handleExtractEntities(args: any): Promise<any> {
    if (
      this.context.intelligenceMode !== "enhanced" ||
      !this.context.entityExtractor
    ) {
      throw new IntelligenceError(
        "entity-extraction",
        "Entity extraction not available in basic mode",
        false,
      );
    }

    const { text } = args;
    if (!text) {
      throw new ValidationError(
        "text",
        "Text is required for entity extraction",
      );
    }

    const extraction = await this.context.entityExtractor.extract(text);

    const entitySummary = {
      people: extraction.entities.people.map((e) => e.text),
      organizations: extraction.entities.organizations.map((e) => e.text),
      technologies: extraction.entities.technologies.map((e) => e.text),
      projects: extraction.entities.projects.map((e) => e.text),
      relationships: extraction.relationships.map(
        (r) => `${r.from} --[${r.type}]--> ${r.to}`,
      ),
      keywords: extraction.keywords.slice(0, 10),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(entitySummary, null, 2) }],
    };
  }

  // Get knowledge graph handler
  private async handleGetKnowledgeGraph(args: any): Promise<any> {
    if (
      this.context.intelligenceMode !== "enhanced" ||
      !this.context.enhancedVectra
    ) {
      throw new IntelligenceError(
        "knowledge-graph",
        "Knowledge graph not available in basic mode",
        false,
      );
    }

    const { entity_type, entity_name, relationship_type, limit = 20 } = args;

    const allMemories = await this.context.enhancedVectra.getAllMemories();
    const { nodes, edges } = this.buildKnowledgeGraph(
      allMemories,
      { entity_type, entity_name, relationship_type },
      limit,
    );

    return {
      content: [
        { type: "text", text: JSON.stringify({ nodes, edges }, null, 2) },
      ],
    };
  }

  // Find connections handler
  private async handleFindConnections(args: any): Promise<any> {
    if (
      this.context.intelligenceMode !== "enhanced" ||
      !this.context.enhancedVectra
    ) {
      throw new IntelligenceError(
        "find-connections",
        "Connection finding not available in basic mode",
        false,
      );
    }

    const { from_entity, to_entity, max_depth = 2 } = args;

    if (!from_entity) {
      throw new ValidationError("from_entity", "Starting entity is required");
    }

    const allMemories = await this.context.enhancedVectra.getAllMemories();
    const paths = this.findConnectionPaths(
      allMemories,
      from_entity,
      to_entity,
      max_depth,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              from: from_entity,
              to: to_entity || "any",
              max_depth,
              paths_found: paths.length,
              paths,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  // Helper: Check for duplicate memories
  private async checkForDuplicate(
    content: string,
    user_id: string,
  ): Promise<DuplicateCheck | null> {
    if (!content) return null;

    try {
      const searchResponse = await this.callMem0API(
        "/v1/memories/search/",
        "POST",
        {
          query: content.substring(0, 100),
          user_id: user_id,
          limit: 5,
        },
      );

      const results = searchResponse.results || [];

      for (const result of results) {
        if (result.memory) {
          const similarity = this.calculateSimilarity(
            content.toLowerCase(),
            result.memory.toLowerCase(),
          );
          if (similarity > 0.85) {
            return {
              isDuplicate: true,
              existingId: result.id,
              existingMemory: result.memory,
              similarity: similarity,
            };
          }
        }
      }
    } catch (error) {
      ErrorHandler.logError(error, "Duplicate check failed");
    }

    return null;
  }

  // Helper: Calculate similarity between strings
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Helper: Smart search with caching and fallback
  private async smartSearch(
    query: string,
    limit: number,
    preferCache: boolean,
  ): Promise<Memory[]> {
    // Check cache first
    if (preferCache) {
      const cached = await this.context.cacheManager.getCachedSearchResults(
        query,
        limit,
      );
      if (cached) return cached;
    }

    let results: Memory[] = [];

    // Try enhanced search if available
    if (
      this.context.intelligenceMode === "enhanced" &&
      this.context.enhancedVectra
    ) {
      try {
        const vectorResults = await this.context.enhancedVectra.searchMemories(
          query,
          limit,
        );
        results = vectorResults.map((r) => ({
          id: r.id,
          memory: r.content,
          user_id: r.user_id,
          created_at: r.metadata?.created_at || new Date().toISOString(),
          metadata: r.metadata,
          source: "enhanced_vector",
        }));
      } catch (error) {
        ErrorHandler.logError(error, "Enhanced search failed");
      }
    }

    // Fallback to cache or API search
    if (results.length < limit) {
      if (preferCache) {
        const cacheResults = await this.context.cacheManager.searchFromCache(
          query,
          limit - results.length,
        );
        results = [...results, ...cacheResults];
      }

      if (results.length < limit) {
        const apiResults = await this.searchFromMem0(
          query,
          limit - results.length,
        );
        results = [...results, ...apiResults];
      }
    }

    // Cache results
    await this.context.cacheManager.cacheSearchResults(query, limit, results);

    return results.slice(0, limit);
  }

  // Helper: Search from Mem0 API
  private async searchFromMem0(
    query: string,
    limit: number,
  ): Promise<Memory[]> {
    try {
      const endpoint = `/v1/memories/?user_id=${this.context.mem0UserId}&query=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await this.callMem0API(endpoint, "GET");

      let mem0Results = Array.isArray(response)
        ? response
        : response.results || response.memories || [];

      if (mem0Results.length > limit) {
        mem0Results = mem0Results.slice(0, limit);
      }

      return mem0Results.map((m: any) => ({ ...m, source: "mem0_cloud" }));
    } catch (error) {
      ErrorHandler.logError(error, "Mem0 search failed");
      return [];
    }
  }

  // Helper: Add memory asynchronously
  private async addMemoryAsync(body: any, priority?: string): Promise<any> {
    const jobId = crypto.randomBytes(16).toString("hex");

    // Create async job
    const jobPromise = this.context.pubSubManager.createAsyncJob(jobId);

    // Process in background
    this.callMem0API("/v1/memories/", "POST", body)
      .then(async (result) => {
        // Cache high-priority memories immediately
        if (priority === "high" && result.length > 0) {
          for (const memory of result) {
            if (memory.id) {
              await this.context.cacheManager.setCachedMemory(
                memory.id,
                memory,
              );
              await this.context.pubSubManager.queueMemoryProcessing(
                memory.id,
                "high",
              );
            }
          }
        }

        await this.context.cacheManager.invalidateSearchCache();
        await this.context.pubSubManager.completeJob(jobId, result.length);
      })
      .catch(async (error) => {
        await this.context.pubSubManager.completeJob(
          jobId,
          undefined,
          error.message,
        );
      });

    return { content: [{ type: "text", text: "Saved" }] };
  }

  // Helper: Add memory synchronously
  private async addMemorySync(body: any, priority?: string): Promise<any> {
    const result = await this.callMem0API("/v1/memories/", "POST", body);

    if (priority === "high" && result.length > 0) {
      for (const memory of result) {
        if (memory.id) {
          await this.context.cacheManager.setCachedMemory(memory.id, memory);
        }
      }
      await this.context.cacheManager.invalidateSearchCache();
    }

    return { content: [{ type: "text", text: "Saved" }] };
  }

  // Helper: Find duplicate memories
  private findDuplicates(memories: any[], threshold: number): any[] {
    const duplicates: any[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < memories.length; i++) {
      if (processed.has(memories[i].id)) continue;

      const group = {
        primary: memories[i],
        duplicates: [] as any[],
      };

      for (let j = i + 1; j < memories.length; j++) {
        if (processed.has(memories[j].id)) continue;

        const similarity = this.calculateSimilarity(
          memories[i].memory?.toLowerCase() || "",
          memories[j].memory?.toLowerCase() || "",
        );

        if (similarity >= threshold) {
          group.duplicates.push({
            ...memories[j],
            similarity: Math.round(similarity * 100),
          });
          processed.add(memories[j].id);
        }
      }

      if (group.duplicates.length > 0) {
        duplicates.push(group);
        processed.add(memories[i].id);
      }
    }

    return duplicates;
  }

  // Helper: Delete duplicate memories
  private async deleteDuplicates(
    duplicates: any[],
    user_id: string,
  ): Promise<number> {
    let deleteCount = 0;

    for (const group of duplicates) {
      for (const dup of group.duplicates) {
        try {
          await this.callMem0API(
            `/v1/memories/${dup.id}/?user_id=${user_id}`,
            "DELETE",
          );
          deleteCount++;
          await this.context.cacheManager.deleteCachedMemory(dup.id);
        } catch (error) {
          ErrorHandler.logError(error, `Failed to delete duplicate ${dup.id}`);
        }
      }
    }

    return deleteCount;
  }

  // Helper: Build knowledge graph
  private buildKnowledgeGraph(
    memories: any[],
    filters: any,
    limit: number,
  ): { nodes: any[]; edges: any[] } {
    const graphNodes: any[] = [];
    const graphEdges: any[] = [];
    const entityMap = new Map<string, any>();

    for (const memory of memories) {
      if (!memory.metadata?.entities) continue;

      // Process entities
      const entities = memory.metadata.entities;
      for (const [type, entityList] of Object.entries(entities)) {
        if (filters.entity_type && type !== filters.entity_type) continue;

        for (const entity of entityList as any[]) {
          if (
            filters.entity_name &&
            !entity.text
              .toLowerCase()
              .includes(filters.entity_name.toLowerCase())
          )
            continue;

          const key = `${type}:${entity.text}`;
          if (!entityMap.has(key)) {
            entityMap.set(key, {
              id: key,
              type,
              name: entity.text,
              memories: [],
            });
          }
          entityMap.get(key).memories.push(memory.id);
        }
      }

      // Process relationships
      if (memory.metadata.relationships) {
        for (const rel of memory.metadata.relationships) {
          if (
            filters.relationship_type &&
            rel.type !== filters.relationship_type
          )
            continue;

          graphEdges.push({
            from: rel.from,
            to: rel.to,
            type: rel.type,
            confidence: rel.confidence,
            memory_id: memory.id,
          });
        }
      }
    }

    graphNodes.push(...Array.from(entityMap.values()).slice(0, limit));

    return { nodes: graphNodes, edges: graphEdges };
  }

  // Helper: Find connection paths
  private findConnectionPaths(
    memories: any[],
    fromEntity: string,
    toEntity: string | undefined,
    maxDepth: number,
  ): any[] {
    // Build adjacency list
    const graph = new Map<string, Set<{ to: string; type: string }>>();

    for (const memory of memories) {
      if (!memory.metadata?.relationships) continue;

      for (const rel of memory.metadata.relationships) {
        if (!graph.has(rel.from)) {
          graph.set(rel.from, new Set());
        }
        graph.get(rel.from)!.add({ to: rel.to, type: rel.type });
      }
    }

    // BFS to find paths
    const paths: any[] = [];
    const queue: Array<{ node: string; path: any[]; depth: number }> = [
      { node: fromEntity, path: [], depth: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0 && paths.length < 10) {
      const { node, path, depth } = queue.shift()!;

      if (visited.has(node) || depth > maxDepth) continue;
      visited.add(node);

      // Check if we reached target
      if (toEntity && node === toEntity && path.length > 0) {
        paths.push(path);
        continue;
      }

      // Explore neighbors
      const neighbors = graph.get(node);
      if (neighbors && depth < maxDepth) {
        for (const neighbor of neighbors) {
          const newPath = [
            ...path,
            { from: node, to: neighbor.to, type: neighbor.type },
          ];

          if (!toEntity && depth === maxDepth - 1) {
            paths.push(newPath);
          } else {
            queue.push({ node: neighbor.to, path: newPath, depth: depth + 1 });
          }
        }
      }
    }

    return paths;
  }

  // Helper: Call Mem0 API
  private async callMem0API(
    endpoint: string,
    method: string = "GET",
    body: any = null,
  ): Promise<any> {
    // Handle different modes
    if (this.context.mode === "local") {
      return this.simulateLocalAPI(endpoint, method, body);
    }

    if (this.context.mode === "demo") {
      return this.simulateDemoAPI(endpoint, method, body);
    }

    // Hybrid mode - use actual API
    const url = `${this.context.mem0BaseUrl}${endpoint}`;
    const options: any = {
      method,
      headers: {
        Authorization: `Token ${this.context.mem0ApiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = (await response.json()) as any;

      if (!response.ok) {
        throw new Mem0APIError(
          response.status,
          data.error || `API error: ${response.status}`,
        );
      }

      return data;
    } catch (error: any) {
      if (error instanceof Mem0APIError) throw error;
      throw new Mem0APIError(undefined, error.message);
    }
  }

  // Simulate local API (implementation would go here)
  private simulateLocalAPI(endpoint: string, method: string, body: any): any {
    // This would interact with LocalMemory
    return { message: "Local mode - operation completed" };
  }

  // Simulate demo API (implementation would go here)
  private simulateDemoAPI(endpoint: string, method: string, body: any): any {
    // This would use in-memory storage
    return { message: "Demo mode - operation simulated" };
  }
}
