'use client'

import { ArrowRight, Zap, Shield, Database, Github, Code2, Cpu, Cloud, Lock } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />
      </div>

      {/* Animated grid */}
      <div className="fixed inset-0 opacity-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`
      }} />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/10 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                mem0/hybrid
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/n3wth/mem0-redis-hybrid"
                className="text-gray-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            {mounted && (
              <>
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-full mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-sm text-gray-300">v1.0.0 - Production Ready</span>
                </div>

                <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight">
                  <span className="block bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent animate-gradient">
                    Intelligent memory
                  </span>
                  <span className="block text-4xl sm:text-5xl md:text-6xl mt-2 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                    for AI applications
                  </span>
                </h1>

                <p className="mt-8 text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                  Combine the reliability of cloud storage with the performance of local caching.
                  Built for production AI systems at scale.
                </p>

                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="https://github.com/n3wth/mem0-redis-hybrid"
                    className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-blue-500 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
                  >
                    <span>Start Building</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                  <a
                    href="https://github.com/n3wth/mem0-redis-hybrid#readme"
                    className="inline-flex items-center px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all"
                  >
                    View Documentation
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Animated Stats */}
          <div className="mt-32 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { value: '<5ms', label: 'Response Time', icon: Zap },
              { value: '99.9%', label: 'Uptime SLA', icon: Shield },
              { value: '∞', label: 'Scale', icon: Database }
            ].map((stat, i) => (
              <div
                key={i}
                className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <stat.icon className="h-8 w-8 text-purple-400 mb-4" />
                <div className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Why hybrid memory?
            </h2>
            <p className="mt-4 text-xl text-gray-400">
              Enterprise-grade features for modern AI applications
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'Sub-5ms cache hits with intelligent prefetching and two-tier caching strategy.',
                gradient: 'from-yellow-500/20 to-orange-500/20'
              },
              {
                icon: Shield,
                title: 'Resilient',
                description: 'Automatic failover with graceful degradation when services are unavailable.',
                gradient: 'from-green-500/20 to-emerald-500/20'
              },
              {
                icon: Database,
                title: 'Scalable',
                description: 'Distributed architecture with pub/sub invalidation and background sync.',
                gradient: 'from-blue-500/20 to-cyan-500/20'
              },
              {
                icon: Cloud,
                title: 'Hybrid Storage',
                description: 'Seamlessly combine Redis caching with Mem0 cloud persistence.',
                gradient: 'from-purple-500/20 to-pink-500/20'
              },
              {
                icon: Lock,
                title: 'Secure',
                description: 'Enterprise-grade security with encrypted storage and secure APIs.',
                gradient: 'from-red-500/20 to-rose-500/20'
              },
              {
                icon: Cpu,
                title: 'Intelligent',
                description: 'Smart routing and caching strategies for optimal performance.',
                gradient: 'from-indigo-500/20 to-purple-500/20'
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                <feature.icon className="relative h-10 w-10 text-purple-400 mb-4" />
                <h3 className="relative text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="relative text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Get started in seconds
            </h2>
            <p className="mt-4 text-xl text-gray-400">
              Simple API, powerful features
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-3xl" />
            <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 overflow-hidden">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <pre className="text-sm sm:text-base overflow-x-auto">
                <code className="text-gray-300">{`import { Mem0Hybrid } from '@n3wth/mem0-redis-hybrid';

const memory = new Mem0Hybrid({
  redis: 'redis://localhost:6379',
  apiKey: process.env.MEM0_KEY
});

// Add memory with high priority caching
await memory.add({
  content: 'User preferences and context',
  priority: 'high',
  async: true
});

// Search with cache-first strategy
const results = await memory.search({
  query: 'user preferences',
  prefer_cache: true
});`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 blur-3xl" />
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16">
              <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                Ready to scale your AI?
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Join thousands of developers building the next generation of AI applications with intelligent memory management.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://www.npmjs.com/package/@n3wth/mem0-redis-hybrid"
                  className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-blue-500 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
                >
                  <Code2 className="mr-2 h-5 w-5" />
                  <span>npm install</span>
                </a>
                <a
                  href="https://github.com/n3wth/mem0-redis-hybrid"
                  className="inline-flex items-center px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all"
                >
                  <Github className="mr-2 h-5 w-5" />
                  <span>Star on GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 mb-4 md:mb-0">
              © 2025 Mem0-Redis Hybrid. MIT License.
            </div>
            <div className="flex space-x-6">
              <a href="https://github.com/n3wth/mem0-redis-hybrid" className="text-sm text-gray-500 hover:text-white transition-colors">
                GitHub
              </a>
              <a href="https://www.npmjs.com/package/@n3wth/mem0-redis-hybrid" className="text-sm text-gray-500 hover:text-white transition-colors">
                npm
              </a>
              <a href="https://mem0.ai" className="text-sm text-gray-500 hover:text-white transition-colors">
                Mem0
              </a>
              <a href="https://redis.io" className="text-sm text-gray-500 hover:text-white transition-colors">
                Redis
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        .animate-gradient {
          animation: gradient 6s ease infinite;
        }
      `}</style>
    </div>
  )
}