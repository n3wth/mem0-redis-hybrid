#!/bin/bash

# Recall Microservices Development Environment Setup
# Complete development setup for all services

set -e

echo "🚀 Setting up Recall Microservices Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

print_service() {
    echo -e "${CYAN}[SERVICE]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
    
    # Check available disk space
    AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 10 ]; then
        print_warning "Low disk space: ${AVAILABLE_SPACE}GB available. Recommend at least 10GB."
    fi
    
    print_success "Prerequisites check completed"
}

# Create environment file
create_env_file() {
    print_header "Creating Environment Configuration..."
    
    if [ ! -f .env ]; then
        cat > .env << EOF
# Recall Microservices Environment Variables

# OpenAI API Key (required for vector embedding service)
OPENAI_API_KEY=${OPENAI_API_KEY:-}

# Service Ports
MEMORY_STORAGE_PORT=3000
VECTOR_EMBEDDING_PORT=3001
SEARCH_QUERY_PORT=3002
MEMORY_GRAPH_PORT=3003
REALTIME_SYNC_PORT=3004
ANALYTICS_PORT=3005

# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=recall
POSTGRES_USER=recall_user
POSTGRES_PASSWORD=recall_password

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://elasticsearch:9200

# Neo4j Configuration
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=recall_password

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Monitoring Configuration
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
CLICKHOUSE_URL=http://clickhouse:8123

# Development Configuration
NODE_ENV=development
LOG_LEVEL=info
EOF
        print_success ".env file created"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Create service directories
create_service_directories() {
    print_header "Creating Service Directories..."
    
    SERVICES=(
        "vector-embedding"
        "search-query"
        "memory-graph"
        "realtime-sync"
        "analytics"
    )
    
    for service in "${SERVICES[@]}"; do
        if [ ! -d "services/$service" ]; then
            mkdir -p "services/$service/src"
            print_status "Created directory for $service service"
        else
            print_warning "$service service directory already exists"
        fi
    done
    
    print_success "Service directories created"
}

# Install dependencies for implemented services
install_dependencies() {
    print_header "Installing Dependencies..."
    
    # Memory Storage Service
    if [ -d "services/memory-storage" ]; then
        print_service "Installing dependencies for Memory Storage Service..."
        cd services/memory-storage
        npm install
        cd ../..
        print_success "Memory Storage Service dependencies installed"
    fi
    
    print_success "Dependencies installation completed"
}

# Create monitoring configuration
create_monitoring_config() {
    print_header "Creating Monitoring Configuration..."
    
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    
    # Prometheus configuration
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'memory-storage'
    static_configs:
      - targets: ['memory-storage:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'vector-embedding'
    static_configs:
      - targets: ['vector-embedding:3001']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'search-query'
    static_configs:
      - targets: ['search-query:3002']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'memory-graph'
    static_configs:
      - targets: ['memory-graph:3003']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'realtime-sync'
    static_configs:
      - targets: ['realtime-sync:3004']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'analytics'
    static_configs:
      - targets: ['analytics:3005']
    metrics_path: '/metrics'
    scrape_interval: 5s
EOF

    # Grafana datasource configuration
    cat > monitoring/grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    # ClickHouse configuration
    cat > monitoring/clickhouse/config.xml << EOF
<clickhouse>
    <listen_host>0.0.0.0</listen_host>
    <http_port>8123</http_port>
    <tcp_port>9000</tcp_port>
    
    <users>
        <default>
            <password></password>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
        </default>
    </users>
    
    <profiles>
        <default>
            <max_memory_usage>10000000000</max_memory_usage>
            <use_uncompressed_cache>0</use_uncompressed_cache>
            <load_balancing>random</load_balancing>
        </default>
    </profiles>
    
    <quotas>
        <default>
            <interval>3600</interval>
            <queries>0</queries>
            <errors>0</errors>
            <result_rows>0</result_rows>
            <read_rows>0</read_rows>
            <execution_time>0</execution_time>
        </default>
    </quotas>
</clickhouse>
EOF

    print_success "Monitoring configuration created"
}

# Create API Gateway configuration
create_gateway_config() {
    print_header "Creating API Gateway Configuration..."
    
    mkdir -p gateway
    
    cat > gateway/kong.yml << EOF
_format_version: "3.0"

services:
  - name: memory-storage
    url: http://memory-storage:3000
    routes:
      - name: memory-storage-route
        paths:
          - /api/memories
        methods:
          - GET
          - POST
          - PUT
          - DELETE
        strip_path: true

  - name: vector-embedding
    url: http://vector-embedding:3001
    routes:
      - name: vector-embedding-route
        paths:
          - /api/embeddings
        methods:
          - GET
          - POST
        strip_path: true

  - name: search-query
    url: http://search-query:3002
    routes:
      - name: search-query-route
        paths:
          - /api/search
        methods:
          - GET
          - POST
        strip_path: true

  - name: memory-graph
    url: http://memory-graph:3003
    routes:
      - name: memory-graph-route
        paths:
          - /api/graph
        methods:
          - GET
          - POST
        strip_path: true

  - name: realtime-sync
    url: http://realtime-sync:3004
    routes:
      - name: realtime-sync-route
        paths:
          - /api/sync
        methods:
          - GET
          - POST
        strip_path: true

  - name: analytics
    url: http://analytics:3005
    routes:
      - name: analytics-route
        paths:
          - /api/analytics
        methods:
          - GET
          - POST
        strip_path: true

plugins:
  - name: cors
    config:
      origins:
        - "*"
      methods:
        - GET
        - POST
        - PUT
        - DELETE
        - OPTIONS
      headers:
        - Accept
        - Accept-Version
        - Content-Length
        - Content-MD5
        - Content-Type
        - Date
        - X-Auth-Token
      exposed_headers:
        - X-Auth-Token
      credentials: true
      max_age: 3600
      preflight_continue: false

  - name: rate-limiting
    config:
      minute: 100
      hour: 1000
      policy: local
EOF

    print_success "API Gateway configuration created"
}

# Start infrastructure services
start_infrastructure() {
    print_header "Starting Infrastructure Services..."
    
    print_status "Starting PostgreSQL, Redis, Elasticsearch, Neo4j, RabbitMQ..."
    docker-compose up -d postgres redis elasticsearch neo4j rabbitmq
    
    # Wait for services to be ready
    print_status "Waiting for infrastructure services to be ready..."
    
    # Wait for PostgreSQL
    print_status "Waiting for PostgreSQL..."
    until docker-compose exec postgres pg_isready -U recall_user -d recall; do
        sleep 2
    done
    print_success "PostgreSQL is ready"
    
    # Wait for Redis
    print_status "Waiting for Redis..."
    until docker-compose exec redis redis-cli ping; do
        sleep 2
    done
    print_success "Redis is ready"
    
    # Wait for Elasticsearch
    print_status "Waiting for Elasticsearch..."
    until curl -f http://localhost:9200/_cluster/health; do
        sleep 5
    done
    print_success "Elasticsearch is ready"
    
    # Wait for Neo4j
    print_status "Waiting for Neo4j..."
    until docker-compose exec neo4j cypher-shell -u neo4j -p recall_password "RETURN 1"; do
        sleep 5
    done
    print_success "Neo4j is ready"
    
    # Wait for RabbitMQ
    print_status "Waiting for RabbitMQ..."
    until docker-compose exec rabbitmq rabbitmq-diagnostics ping; do
        sleep 2
    done
    print_success "RabbitMQ is ready"
}

# Start monitoring services
start_monitoring() {
    print_header "Starting Monitoring Services..."
    
    print_status "Starting Prometheus, Grafana, ClickHouse..."
    docker-compose up -d prometheus grafana clickhouse
    
    # Wait for monitoring services
    print_status "Waiting for monitoring services..."
    sleep 10
    
    print_success "Monitoring services started"
}

# Start admin UIs
start_admin_uis() {
    print_header "Starting Admin UIs..."
    
    print_status "Starting pgAdmin, Redis Commander, Elasticsearch Head..."
    docker-compose up -d pgadmin redis-commander elasticsearch-head
    
    print_success "Admin UIs started"
}

# Start implemented services
start_services() {
    print_header "Starting Implemented Services..."
    
    # Start Memory Storage Service
    if [ -d "services/memory-storage" ]; then
        print_service "Starting Memory Storage Service..."
        docker-compose up -d memory-storage
        
        # Wait for service to be ready
        print_status "Waiting for Memory Storage Service..."
        until curl -f http://localhost:3000/health/ready; do
            sleep 5
        done
        print_success "Memory Storage Service is ready"
    fi
    
    # Start API Gateway
    print_service "Starting API Gateway..."
    docker-compose up -d api-gateway
    
    print_success "Services started"
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations..."
    
    if [ -d "services/memory-storage" ]; then
        print_status "Running Memory Storage Service migrations..."
        cd services/memory-storage
        npm run db:migrate
        cd ../..
        print_success "Memory Storage Service migrations completed"
    fi
}

# Display service information
display_service_info() {
    print_header "Service Information"
    echo ""
    echo "🎯 Core Services:"
    echo "  • Memory Storage Service: http://localhost:3000"
    echo "  • API Gateway: http://localhost:8000"
    echo ""
    echo "🔧 Admin Interfaces:"
    echo "  • pgAdmin: http://localhost:8080 (admin@recall.local / admin)"
    echo "  • Redis Commander: http://localhost:8081"
    echo "  • Elasticsearch Head: http://localhost:9100"
    echo "  • Neo4j Browser: http://localhost:7474 (neo4j / recall_password)"
    echo "  • RabbitMQ Management: http://localhost:15672 (guest / guest)"
    echo ""
    echo "📊 Monitoring:"
    echo "  • Grafana: http://localhost:3000 (admin / admin)"
    echo "  • Prometheus: http://localhost:9090"
    echo "  • ClickHouse: http://localhost:8123"
    echo ""
    echo "🔍 Health Checks:"
    echo "  • Memory Storage: http://localhost:3000/health/ready"
    echo "  • Memory Storage Metrics: http://localhost:3000/metrics"
    echo ""
    echo "📋 Useful Commands:"
    echo "  • View all logs: docker-compose logs -f"
    echo "  • View service logs: docker-compose logs -f memory-storage"
    echo "  • Stop all services: docker-compose down"
    echo "  • Restart service: docker-compose restart memory-storage"
    echo "  • Scale service: docker-compose up -d --scale memory-storage=3"
    echo ""
    echo "🧪 Testing:"
    echo "  • Test Memory Storage: curl http://localhost:3000/health/ready"
    echo "  • Test API Gateway: curl http://localhost:8000/api/memories"
    echo ""
}

# Cleanup function
cleanup() {
    print_header "Cleaning up..."
    docker-compose down
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "🎯 Recall Microservices Development Environment Setup"
    echo "====================================================="
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Setup environment
    create_env_file
    create_service_directories
    install_dependencies
    create_monitoring_config
    create_gateway_config
    
    # Start services
    start_infrastructure
    start_monitoring
    start_admin_uis
    start_services
    
    # Setup database
    run_migrations
    
    # Display information
    display_service_info
    
    print_success "🎉 Recall Microservices Development Environment is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Implement additional services in their respective directories"
    echo "2. Add service-specific configurations"
    echo "3. Run tests: docker-compose exec memory-storage npm test"
    echo "4. Monitor services: http://localhost:3000 (Grafana)"
    echo ""
}

# Handle script interruption
trap cleanup INT TERM

# Run main function
main "$@"