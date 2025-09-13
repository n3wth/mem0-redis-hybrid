'use client'

import { ArrowRight, Zap, Shield, Database, Github, Sparkles, ChevronRight, Check, ArrowUpRight, Play, Cpu, Cloud, Lock } from 'lucide-react'
import { useState } from 'react'

export default function Home() {
  const [activeTab, setActiveTab] = useState('javascript')

  const codeExamples = {
    javascript: `import { Mem0Hybrid } from '@n3wth/mem0-redis-hybrid';

const memory = new Mem0Hybrid({
  redis: 'redis://localhost:6379',
  apiKey: process.env.MEM0_KEY,
  cacheStrategy: 'aggressive'
});

// Store with priority
await memory.add({
  content: 'User preferences and context',
  priority: 'high',
  ttl: 3600
});`,
    python: `from mem0_hybrid import Mem0Hybrid

memory = Mem0Hybrid(
    redis_url='redis://localhost:6379',
    api_key=os.environ['MEM0_KEY'],
    cache_strategy='aggressive'
)

# Store with priority
await memory.add({
    'content': 'User preferences and context',
    'priority': 'high',
    'ttl': 3600
})`,
    curl: `curl -X POST https://api.mem0hybrid.com/v1/memory \\
  -H "Authorization: Bearer $MEM0_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "User preferences and context",
    "priority": "high",
    "ttl": 3600
  }'`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="font-semibold text-gray-900">Mem0 Hybrid</span>
              </a>
              <div className="hidden md:flex items-center gap-6">
                <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Features
                </a>
                <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Pricing
                </a>
                <a href="#docs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Documentation
                </a>
                <a href="#company" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  Company
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/n3wth/mem0-redis-hybrid"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>
              <button className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                Sign in
              </button>
              <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                Get started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50 opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 border border-violet-200 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">Now with 99.9% uptime SLA</span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight">
              Intelligent memory layer
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                for modern AI systems
              </span>
            </h1>

            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              Combine the speed of local caching with the reliability of cloud storage.
              Built for AI applications that need instant access to contextual memory.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
                Start building
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Play className="h-4 w-4" />
                Watch demo
              </button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>GDPR Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>99.9% Uptime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Response Time', value: '<5ms', subtext: 'p99 latency' },
              { label: 'Uptime SLA', value: '99.9%', subtext: 'guaranteed' },
              { label: 'Data Centers', value: '12', subtext: 'worldwide' },
              { label: 'Requests/sec', value: '1M+', subtext: 'at scale' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">{stat.label}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.subtext}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything you need for production
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Enterprise-grade features with developer-friendly APIs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Lightning fast',
                description: 'Sub-5ms cache hits with intelligent prefetching and two-tier caching.',
                features: ['Redis L1 cache', 'Smart prefetching', 'Edge locations']
              },
              {
                icon: Shield,
                title: 'Enterprise security',
                description: 'Bank-level encryption with SOC 2 compliance and regular audits.',
                features: ['End-to-end encryption', 'Role-based access', 'Audit logs']
              },
              {
                icon: Database,
                title: 'Infinite scale',
                description: 'Automatically scales with your application from prototype to production.',
                features: ['Auto-scaling', 'Multi-region', 'No rate limits']
              },
              {
                icon: Cloud,
                title: 'Hybrid storage',
                description: 'Best of both worlds with local Redis and cloud Mem0 persistence.',
                features: ['Dual-layer cache', 'Automatic sync', 'Conflict resolution']
              },
              {
                icon: Lock,
                title: 'Privacy first',
                description: 'Your data stays yours with zero-knowledge architecture.',
                features: ['Data isolation', 'GDPR compliant', 'Right to deletion']
              },
              {
                icon: Cpu,
                title: 'AI optimized',
                description: 'Purpose-built for LLMs with semantic search and vector support.',
                features: ['Vector search', 'Semantic matching', 'Context windows']
              }
            ].map((feature, i) => (
              <div key={i} className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-lg flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-violet-600" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-gray-500">
                      <Check className="h-3 w-3 text-green-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Simple, intuitive API
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Get started in minutes with our comprehensive SDKs and documentation.
                Works with your existing infrastructure.
              </p>
              <ul className="space-y-3">
                {[
                  'Drop-in replacement for existing cache layers',
                  'Automatic failover and retry logic',
                  'Real-time synchronization across regions',
                  'Compatible with Redis protocol'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <a href="#" className="inline-flex items-center gap-2 text-violet-600 font-medium hover:text-violet-700 transition-colors">
                  View documentation
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                  {['javascript', 'python', 'curl'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveTab(lang)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        activeTab === lang
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <div className="p-6">
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    <code>{codeExamples[activeTab as keyof typeof codeExamples]}</code>
                  </pre>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-full h-full bg-gradient-to-br from-violet-200 to-indigo-200 rounded-xl -z-10 opacity-50" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to build something amazing?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of developers using Mem0 Hybrid to power their AI applications.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </button>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Talk to sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="font-semibold text-gray-900">Mem0 Hybrid</span>
              </div>
              <p className="text-sm text-gray-600 max-w-xs">
                The intelligent memory layer for modern AI applications.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">API Reference</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              © 2025 Mem0 Hybrid. All rights reserved.
            </p>
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
              <a href="https://github.com/n3wth/mem0-redis-hybrid" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}