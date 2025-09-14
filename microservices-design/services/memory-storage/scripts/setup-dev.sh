#!/bin/bash

# Memory Storage Service Development Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up Memory Storage Service Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Node.js is installed
check_node() {
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
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Create environment file
create_env_file() {
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# Memory Storage Service Environment Variables

# Service Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=recall
POSTGRES_USER=recall_user
POSTGRES_PASSWORD=recall_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Performance Configuration
BATCH_SIZE=100
CACHE_WARMING=true
COMPRESSION=true
COMPRESSION_THRESHOLD=1024

# Security Configuration
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Cache TTL Configuration (in seconds)
CACHE_TTL_MEMORY=86400
CACHE_TTL_SEARCH=300
CACHE_TTL_USER_LIST=3600

# Database Pool Configuration
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE=30000
EOF
        print_success ".env file created"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Start services with Docker Compose
start_services() {
    print_status "Starting services with Docker Compose..."
    docker-compose up -d postgres redis
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if PostgreSQL is ready
    print_status "Checking PostgreSQL connection..."
    until docker-compose exec postgres pg_isready -U recall_user -d recall; do
        print_status "Waiting for PostgreSQL..."
        sleep 2
    done
    print_success "PostgreSQL is ready"
    
    # Check if Redis is ready
    print_status "Checking Redis connection..."
    until docker-compose exec redis redis-cli ping; do
        print_status "Waiting for Redis..."
        sleep 2
    done
    print_success "Redis is ready"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    npm run db:migrate
    print_success "Database migrations completed"
}

# Seed database with test data
seed_database() {
    print_status "Seeding database with test data..."
    npm run db:seed
    print_success "Database seeded with test data"
}

# Start the development server
start_dev_server() {
    print_status "Starting development server..."
    print_success "Development environment is ready!"
    echo ""
    echo "📋 Available services:"
    echo "  • Memory Storage Service: http://localhost:3000"
    echo "  • Health Check: http://localhost:3000/health/ready"
    echo "  • Metrics: http://localhost:3000/metrics"
    echo "  • pgAdmin: http://localhost:8080 (admin@recall.local / admin)"
    echo "  • Redis Commander: http://localhost:8081"
    echo ""
    echo "🔧 Useful commands:"
    echo "  • View logs: docker-compose logs -f memory-storage"
    echo "  • Stop services: docker-compose down"
    echo "  • Restart service: docker-compose restart memory-storage"
    echo "  • Run tests: npm test"
    echo "  • Check health: npm run health"
    echo ""
    
    # Start the development server
    npm run dev
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    docker-compose down
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "🎯 Memory Storage Service Development Setup"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    check_docker
    check_node
    
    # Setup environment
    install_dependencies
    create_env_file
    
    # Start infrastructure services
    start_services
    
    # Setup database
    run_migrations
    seed_database
    
    # Start development server
    start_dev_server
}

# Handle script interruption
trap cleanup INT TERM

# Run main function
main "$@"