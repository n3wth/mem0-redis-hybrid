'use client'

import { Book, Code2, Terminal, Zap, Shield, Database, ChevronRight, Copy, Check, Github, Search, ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'

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
    quickStart: `npm install @n3wth/recall

# Set environment variables
export MEM0_API_KEY="your-api-key"
export REDIS_URL="redis://localhost:6379"`,

    basicUsage: `import { Recall } from '@n3wth/recall';

const memory = new Recall({
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
    "recall": {
      "command": "npx",
      "args": ["@n3wth/recall"],
      "env": {
        "MEM0_API_KEY": "your-api-key",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}`,

    advancedConfig: `const memory = new Recall({
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

// Cache Management
await memory.cache.clear()        // Clear all cache
await memory.cache.stats()        // Get cache statistics
await memory.cache.optimize()     // Optimize cache

// Sync Operations
await memory.sync.force()         // Force synchronization
await memory.sync.status()        // Check sync status`,
  }

  const CodeBlock = ({ code, language = 'typescript', id }: { code: string; language?: string; id: string }) => (
    <div className="relative group">
      <div className="absolute inset-0 bg-blue-600/20 rounded-lg blur-xl group-hover:blur-2xl transition-all" />
      <div className="relative rounded-lg overflow-hidden glass-effect">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
          <span className="text-xs text-gray-400">{language}</span>
          <button
            onClick={() => copyToClipboard(code, id)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {copiedCode === id ? (
              <>
                <Check className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm text-gray-300">{code}</code>
        </pre>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gray-950 py-20">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse animation-delay-2000" />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold text-white mb-4">
              Documentation
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to integrate intelligent memory into your AI applications
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden lg:block w-64 flex-shrink-0"
          >
            <div className="sticky top-20">
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search docs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg bg-gray-900/50 border border-white/10 py-2 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all
                        ${activeSection === section.id
                          ? 'bg-blue-600/20 text-white border border-white/10'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                      {activeSection === section.id && (
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>
          </motion.aside>

          {/* Main Content Area */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            <AnimatePresence mode="wait">
              {activeSection === 'getting-started' && (
                <motion.div
                  key="getting-started"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-4">Getting Started</h2>
                    <p className="text-gray-400 mb-8">
                      Get up and running with Recall in minutes. This guide will walk you through
                      installation, configuration, and your first API calls.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Quick Start</h3>
                    <CodeBlock code={codeExamples.quickStart} language="bash" id="quickstart" />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Basic Usage</h3>
                    <CodeBlock code={codeExamples.basicUsage} language="typescript" id="basic" />
                  </div>

                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-6">
                    <h4 className="text-lg font-semibold text-blue-400 mb-2">Pro Tip</h4>
                    <p className="text-gray-300">
                      Use aggressive caching strategy for read-heavy workloads to achieve sub-5ms response times.
                      The system automatically handles cache invalidation and synchronization.
                    </p>
                  </div>
                </motion.div>
              )}

              {activeSection === 'installation' && (
                <motion.div
                  key="installation"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-4">Installation</h2>
                    <p className="text-gray-400 mb-8">
                      Multiple installation methods are available depending on your environment and requirements.
                    </p>
                  </div>

                  <div className="grid gap-6">
                    <div className="rounded-lg glass-effect p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Node.js / npm</h3>
                      <CodeBlock code="npm install @n3wth/recall" language="bash" id="npm" />
                    </div>

                    <div className="rounded-lg glass-effect p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Yarn</h3>
                      <CodeBlock code="yarn add @n3wth/recall" language="bash" id="yarn" />
                    </div>

                    <div className="rounded-lg glass-effect p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">pnpm</h3>
                      <CodeBlock code="pnpm add @n3wth/recall" language="bash" id="pnpm" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Claude Integration</h3>
                    <p className="text-gray-400 mb-4">
                      Add to your Claude Desktop configuration file:
                    </p>
                    <CodeBlock code={codeExamples.claudeIntegration} language="json" id="claude" />
                  </div>
                </motion.div>
              )}

              {activeSection === 'api-reference' && (
                <motion.div
                  key="api-reference"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-4">API Reference</h2>
                    <p className="text-gray-400 mb-8">
                      Complete reference for all available methods and configuration options.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Configuration</h3>
                    <CodeBlock code={codeExamples.advancedConfig} language="typescript" id="config" />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Available Methods</h3>
                    <CodeBlock code={codeExamples.apiMethods} language="typescript" id="methods" />
                  </div>

                  <div className="grid gap-4 mt-8">
                    {['add', 'search', 'get', 'update', 'delete'].map((method) => (
                      <div key={method} className="rounded-lg glass-effect p-4">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-blue-400 font-mono">memory.{method}()</code>
                          <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded">
                            Returns: Promise
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {method === 'add' && 'Add new memory to the system with automatic caching'}
                          {method === 'search' && 'Search memories using vector similarity and metadata filters'}
                          {method === 'get' && 'Retrieve a specific memory by ID'}
                          {method === 'update' && 'Update an existing memory and invalidate cache'}
                          {method === 'delete' && 'Delete a memory and clear from all cache layers'}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.main>
        </div>
      </div>

      <Footer />
    </div>
  )
}