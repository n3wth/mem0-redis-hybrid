'use client'

import { Book, Code2, Terminal, Zap, Shield, Database, ChevronRight, Copy, Check, ArrowLeft, Search } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: Book },
    { id: 'installation', label: 'Installation', icon: Terminal },
    { id: 'api-reference', label: 'API Reference', icon: Code2 },
    { id: 'integration', label: 'Integration Guides', icon: Zap },
    { id: 'architecture', label: 'Architecture', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  const codeExamples = {
    quickStart: `npm install @n3wth/mem0-redis-hybrid

# Set environment variables
export MEM0_API_KEY="your-api-key"
export REDIS_URL="redis://localhost:6379"`,

    basicUsage: `import { Mem0Hybrid } from '@n3wth/mem0-redis-hybrid';

const memory = new Mem0Hybrid({
  redis: 'redis://localhost:6379',
  apiKey: process.env.MEM0_KEY,
  cacheStrategy: 'aggressive'
});

// Add memory
await memory.add({
  content: 'User preferences: dark mode, language: en',
  priority: 'high',
  ttl: 3600
});

// Search memories
const results = await memory.search({
  query: 'user preferences',
  prefer_cache: true
});`,

    claudeIntegration: `{
  "mcpServers": {
    "mem0-hybrid": {
      "command": "npx",
      "args": ["@n3wth/mem0-redis-hybrid"],
      "env": {
        "MEM0_API_KEY": "your-api-key",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}`,

    advancedConfig: `const memory = new Mem0Hybrid({
  redis: {
    url: 'redis://localhost:6379',
    maxRetries: 3,
    connectionTimeout: 5000,
    enableOfflineQueue: true
  },
  mem0: {
    apiKey: process.env.MEM0_KEY,
    baseUrl: 'https://api.mem0.ai/v1',
    timeout: 30000
  },
  cache: {
    strategy: 'aggressive', // or 'balanced', 'conservative'
    ttl: {
      l1: 86400,    // 24 hours for hot data
      l2: 604800,   // 7 days for warm data
      search: 300   // 5 minutes for search results
    },
    maxSize: 10000,
    enableCompression: true
  },
  sync: {
    enabled: true,
    interval: 300000, // 5 minutes
    batchSize: 100
  }
});`,

    apiMethods: `// Core Methods
await memory.add(params)           // Add new memory
await memory.search(params)        // Search memories
await memory.get(id)              // Get specific memory
await memory.update(id, params)   // Update memory
await memory.delete(id)           // Delete memory
await memory.list(params)         // List all memories

// Cache Management
await memory.cacheWarm()          // Warm cache from cloud
await memory.cacheInvalidate(id)  // Invalidate specific entry
await memory.cacheStats()         // Get cache statistics
await memory.cacheOptimize()      // Optimize cache performance

// Health & Monitoring
await memory.health()             // Check system health
await memory.metrics()            // Get performance metrics`,

    dockerSetup: `# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  mem0-hybrid:
    image: n3wth/mem0-hybrid:latest
    environment:
      - MEM0_API_KEY=\${MEM0_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    ports:
      - "3000:3000"

volumes:
  redis-data:`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="font-semibold text-gray-900">Docs</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-white border-r border-gray-100 sticky top-16">
          <div className="p-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Documentation</h3>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-8 py-12 max-w-4xl">
          {/* Getting Started */}
          {activeSection === 'getting-started' && (
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Getting Started</h1>
              <p className="text-lg text-gray-600 mb-8">
                Get up and running with Mem0-Redis Hybrid in under 5 minutes.
              </p>

              <div className="bg-violet-50 border border-violet-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-violet-900 mb-2">Prerequisites</h3>
                <ul className="space-y-2 text-violet-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Node.js 18.0.0 or higher
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Redis server (optional, but recommended)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Mem0 API key (get free at mem0.ai)
                  </li>
                </ul>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Quick Install</h2>
              <div className="relative bg-gray-900 rounded-lg p-4 mb-8">
                <button
                  onClick={() => copyToClipboard(codeExamples.quickStart, 'quickStart')}
                  className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  {copiedCode === 'quickStart' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{codeExamples.quickStart}</code>
                </pre>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Basic Usage</h2>
              <div className="relative bg-gray-900 rounded-lg p-4 mb-8">
                <button
                  onClick={() => copyToClipboard(codeExamples.basicUsage, 'basicUsage')}
                  className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  {copiedCode === 'basicUsage' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{codeExamples.basicUsage}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Installation */}
          {activeSection === 'installation' && (
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Installation</h1>
              <p className="text-lg text-gray-600 mb-8">
                Multiple ways to install and configure Mem0-Redis Hybrid for your project.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">NPM Installation</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                <code className="text-sm bg-white px-2 py-1 rounded border border-gray-200">
                  npm install @n3wth/mem0-redis-hybrid
                </code>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Docker Setup</h2>
              <div className="relative bg-gray-900 rounded-lg p-4 mb-8">
                <button
                  onClick={() => copyToClipboard(codeExamples.dockerSetup, 'dockerSetup')}
                  className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  {copiedCode === 'dockerSetup' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{codeExamples.dockerSetup}</code>
                </pre>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Environment Variables</h2>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-8">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variable</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">MEM0_API_KEY</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Yes</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Your Mem0 API key</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">REDIS_URL</td>
                      <td className="px-6 py-4 text-sm text-gray-500">No</td>
                      <td className="px-6 py-4 text-sm text-gray-500">Redis connection URL</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">CACHE_STRATEGY</td>
                      <td className="px-6 py-4 text-sm text-gray-500">No</td>
                      <td className="px-6 py-4 text-sm text-gray-500">aggressive | balanced | conservative</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* API Reference */}
          {activeSection === 'api-reference' && (
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">API Reference</h1>
              <p className="text-lg text-gray-600 mb-8">
                Complete reference for all available methods and configurations.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Core Methods</h2>
              <div className="relative bg-gray-900 rounded-lg p-4 mb-8">
                <button
                  onClick={() => copyToClipboard(codeExamples.apiMethods, 'apiMethods')}
                  className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  {copiedCode === 'apiMethods' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{codeExamples.apiMethods}</code>
                </pre>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Advanced Configuration</h2>
              <div className="relative bg-gray-900 rounded-lg p-4 mb-8">
                <button
                  onClick={() => copyToClipboard(codeExamples.advancedConfig, 'advancedConfig')}
                  className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  {copiedCode === 'advancedConfig' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{codeExamples.advancedConfig}</code>
                </pre>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Response Types</h2>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Memory Object</h3>
                  <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                    <code>{`{
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  relevance_score?: number;
  cache_tier?: 'L1' | 'L2' | 'cloud';
}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Integration Guides */}
          {activeSection === 'integration' && (
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Integration Guides</h1>
              <p className="text-lg text-gray-600 mb-8">
                Step-by-step guides for integrating with popular AI tools and frameworks.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Claude Desktop Integration</h2>
              <p className="text-gray-600 mb-4">
                Add to your Claude Desktop configuration file:
              </p>
              <div className="relative bg-gray-900 rounded-lg p-4 mb-8">
                <button
                  onClick={() => copyToClipboard(codeExamples.claudeIntegration, 'claudeIntegration')}
                  className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  {copiedCode === 'claudeIntegration' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{codeExamples.claudeIntegration}</code>
                </pre>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Location of config file</h3>
                <ul className="space-y-2 text-blue-700">
                  <li>• macOS: ~/Library/Application Support/Claude/claude_desktop_config.json</li>
                  <li>• Windows: %APPDATA%/Claude/claude_desktop_config.json</li>
                  <li>• Linux: ~/.config/Claude/claude_desktop_config.json</li>
                </ul>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">LangChain Integration</h2>
              <p className="text-gray-600 mb-4">Coming soon...</p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">OpenAI Integration</h2>
              <p className="text-gray-600 mb-4">Coming soon...</p>
            </div>
          )}

          {/* Architecture */}
          {activeSection === 'architecture' && (
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Architecture</h1>
              <p className="text-lg text-gray-600 mb-8">
                Understanding the hybrid memory architecture and data flow.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">System Overview</h2>
              <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-12 bg-violet-100 border-2 border-violet-300 rounded flex items-center justify-center font-semibold text-violet-700">
                      Application
                    </div>
                    <ChevronRight className="h-6 w-6 text-gray-400" />
                    <div className="w-32 h-12 bg-blue-100 border-2 border-blue-300 rounded flex items-center justify-center font-semibold text-blue-700">
                      MCP Server
                    </div>
                  </div>
                  <div className="ml-36 flex items-center gap-4">
                    <div className="w-32 h-12 bg-green-100 border-2 border-green-300 rounded flex items-center justify-center font-semibold text-green-700">
                      Redis Cache
                    </div>
                    <ChevronRight className="h-6 w-6 text-gray-400" />
                    <div className="w-32 h-12 bg-orange-100 border-2 border-orange-300 rounded flex items-center justify-center font-semibold text-orange-700">
                      Mem0 Cloud
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Two-Tier Caching</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">L1 Cache (Hot Data)</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• 24-hour TTL</li>
                    <li>• Most frequently accessed</li>
                    <li>• Sub-millisecond access</li>
                    <li>• Auto-promoted from L2</li>
                  </ul>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">L2 Cache (Warm Data)</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• 7-day TTL</li>
                    <li>• Moderately accessed</li>
                    <li>• 1-5ms access time</li>
                    <li>• Background sync from cloud</li>
                  </ul>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Data Flow</h2>
              <ol className="space-y-4 text-gray-600">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-semibold">1</span>
                  <span>Application makes memory request through MCP protocol</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-semibold">2</span>
                  <span>Server checks L1 cache for immediate response</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-semibold">3</span>
                  <span>If L1 miss, checks L2 cache</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-semibold">4</span>
                  <span>If L2 miss, queries Mem0 cloud</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-semibold">5</span>
                  <span>Background job updates cache asynchronously</span>
                </li>
              </ol>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="prose prose-gray max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Security</h1>
              <p className="text-lg text-gray-600 mb-8">
                Enterprise-grade security features and best practices.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <Shield className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">SOC 2 Compliant</h3>
                  <p className="text-gray-600">Regular audits and compliance verification</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <Shield className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">GDPR Ready</h3>
                  <p className="text-gray-600">Full data privacy and right to deletion</p>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Encryption</h2>
              <ul className="space-y-3 text-gray-600 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  End-to-end encryption for all data in transit
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  AES-256 encryption for data at rest
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  TLS 1.3 for all API communications
                </li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Access Control</h2>
              <ul className="space-y-3 text-gray-600 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  API key authentication
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  Role-based access control (RBAC)
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  IP allowlisting available
                </li>
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Best Practices</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Security Recommendations</h3>
                <ul className="space-y-2 text-yellow-700">
                  <li>• Never commit API keys to version control</li>
                  <li>• Use environment variables for sensitive data</li>
                  <li>• Rotate API keys regularly</li>
                  <li>• Enable audit logging for compliance</li>
                  <li>• Use VPC peering for Redis connections</li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}