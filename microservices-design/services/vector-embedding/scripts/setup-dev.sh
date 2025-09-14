#!/bin/bash

# Vector Embedding Service Development Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up Vector Embedding Service Development Environment..."

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
    
    # Check OpenAI API key
    if [ -z "$OPENAI_API_KEY" ]; then
        print_warning "OPENAI_API_KEY environment variable is not set."
        print_warning "The service will work with local models only."
    else
        print_success "OpenAI API key is configured"
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies..."
    
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Create environment file
create_env_file() {
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# Vector Embedding Service Environment Variables

# Service Configuration
NODE_ENV=development
PORT=3001

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY:-}
OPENAI_MODEL=text-embedding-3-small
OPENAI_DIMENSIONS=1536
OPENAI_MAX_TOKENS=8191
OPENAI_RATE_LIMIT=3000

# Local Model Configuration
LOCAL_MODEL=sentence-transformers/all-MiniLM-L6-v2
LOCAL_DIMENSIONS=384
LOCAL_DEVICE=cpu
LOCAL_BATCH_SIZE=32

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cache Configuration
CACHE_TTL=86400
CACHE_COMPRESSION=true

# FAISS Configuration
FAISS_INDEX_TYPE=IndexFlatIP
FAISS_DIMENSION=1536
FAISS_BATCH_SIZE=1000

# Clustering Configuration
CLUSTERING_ALGORITHM=kmeans
MAX_CLUSTERS=50
MIN_CLUSTER_SIZE=3
SIMILARITY_THRESHOLD=0.7

# Rate Limiting
RATE_LIMIT_MAX=1000
EOF
        print_success ".env file created"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Start services with Docker Compose
start_services() {
    print_header "Starting Services..."
    
    print_status "Starting Redis..."
    docker-compose up -d redis
    
    # Wait for Redis to be ready
    print_status "Waiting for Redis..."
    until docker-compose exec redis redis-cli ping; do
        sleep 2
    done
    print_success "Redis is ready"
    
    print_status "Starting Redis Commander..."
    docker-compose up -d redis-commander
    print_success "Redis Commander started"
}

# Run tests
run_tests() {
    print_header "Running Tests..."
    
    print_status "Waiting for service to be ready..."
    sleep 5
    
    # Test if service is running
    if curl -f http://localhost:3001/health/ready > /dev/null 2>&1; then
        print_status "Running embedding tests..."
        node test/embedding-test.js
        print_success "Tests completed"
    else
        print_warning "Service not ready, skipping tests"
        print_warning "Run 'npm run test:embedding' after starting the service"
    fi
}

# Start the development server
start_dev_server() {
    print_header "Starting Development Server..."
    
    print_success "Development environment is ready!"
    echo ""
    echo "📋 Available services:"
    echo "  • Vector Embedding Service: http://localhost:3001"
    echo "  • Health Check: http://localhost:3001/health/ready"
    echo "  • Metrics: http://localhost:3001/metrics"
    echo "  • Redis Commander: http://localhost:8081"
    echo ""
    echo "🔧 Useful commands:"
    echo "  • View logs: docker-compose logs -f vector-embedding"
    echo "  • Stop services: docker-compose down"
    echo "  • Restart service: docker-compose restart vector-embedding"
    echo "  • Run tests: npm run test:embedding"
    echo "  • Check health: npm run health"
    echo ""
    echo "🧪 Test the service:"
    echo "  • Generate embedding: curl -X POST http://localhost:3001/embeddings/generate -H 'Content-Type: application/json' -d '{\"text\": \"Hello world\"}'"
    echo "  • Search embeddings: curl -X POST http://localhost:3001/embeddings/search -H 'Content-Type: application/json' -d '{\"query\": \"test search\"}'"
    echo ""
    
    # Start the development server
    npm run dev
}

# Cleanup function
cleanup() {
    print_header "Cleaning up..."
    docker-compose down
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "🎯 Vector Embedding Service Development Setup"
    echo "============================================="
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Setup environment
    install_dependencies
    create_env_file
    
    # Start infrastructure services
    start_services
    
    # Run tests
    run_tests
    
    # Start development server
    start_dev_server
}

# Handle script interruption
trap cleanup INT TERM

# Run main function
main "$@"