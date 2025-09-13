'use client'

import { Check, Sparkles, Zap, Shield, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { Container } from '@/components/Grid'

export default function Home() {
  const [activeTab, setActiveTab] = useState('node')
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const codeExamples = {
    node: `import Mem0Hybrid from '@n3wth/mem0-redis-hybrid';

const client = new Mem0Hybrid({
  apiKey: process.env.MEM0_API_KEY,
  redis: process.env.REDIS_URL
});

const response = await client.memories.add({
  content: 'User prefers dark mode UI',
  metadata: { user_id: 'user_123' }
});

console.log(response.id);`,
    python: `from mem0_hybrid import Mem0Hybrid

client = Mem0Hybrid(
    api_key=os.environ["MEM0_API_KEY"],
    redis_url=os.environ["REDIS_URL"]
)

response = client.memories.add(
    content="User prefers dark mode UI",
    metadata={"user_id": "user_123"}
)

print(response.id)`,
    curl: `curl https://api.mem0hybrid.com/v1/memories \\
  -H "Authorization: Bearer $MEM0_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "User prefers dark mode UI",
    "metadata": {
      "user_id": "user_123"
    }
  }'`
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <Navigation />

      {/* Hero with Dynamic Movement */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Interactive gradient that follows mouse */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, #3b82f6 0%, transparent 50%)`
          }}
        />

        {/* Animated morphing blobs */}
        <div className="absolute inset-0">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"
            style={{ animation: 'morph 8s ease-in-out infinite, float 15s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"
            style={{ animation: 'morph 8s ease-in-out infinite reverse, float 20s ease-in-out infinite reverse' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"
            style={{ animation: 'pulse-glow 4s ease-in-out infinite' }}
          />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            animation: 'slide-up 20s linear infinite'
          }}
        />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto max-w-3xl">
            {/* Animated badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-4 py-2 backdrop-blur-sm border border-white/10">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-300">Powered by AI • Redis • Cloud</span>
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-8">
              <span className="gradient-text">Intelligent Memory</span>
              <br />
              <span className="text-white">for AI Applications</span>
            </h1>

            <p className="mx-auto max-w-2xl text-xl text-gray-400 mb-12">
              Combine cloud persistence with edge caching. Sub-5ms response times with 99.9% uptime SLA.
              Built for the future of AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/docs"
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl shadow-2xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-105"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <Link
                href="/docs"
                className="px-8 py-4 glass-effect text-white font-semibold rounded-xl transition-all hover:bg-white/10"
              >
                View Documentation
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                { label: 'Response Time', value: '<5ms', icon: Zap },
                { label: 'Uptime SLA', value: '99.9%', icon: Shield },
                { label: 'Requests/sec', value: '1M+', icon: Zap },
                { label: 'Data Centers', value: '12', icon: Shield },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="text-center"
                  style={{
                    animation: `slide-up 0.5s ease-out ${i * 0.1}s both`,
                    opacity: 0
                  }}
                >
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1">
            <div className="w-1 h-3 bg-white/50 rounded-full animate-bounce" />
          </div>
        </div>
      </div>

      {/* Code Example section */}
      <section className="bg-gray-950 relative py-24">
        <Container size="lg">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Start Building in Minutes
            </h2>
            <p className="text-xl text-gray-400">
              Install our SDK and make your first API call
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden glass-effect">
              <div className="border-b border-white/10">
                <nav className="flex" aria-label="Tabs">
                  {Object.keys(codeExamples).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveTab(lang)}
                      className={`
                        flex-1 px-6 py-4 text-sm font-medium capitalize transition-all
                        ${activeTab === lang
                          ? 'text-blue-400 bg-blue-500/10 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      {lang === 'node' ? 'Node.js' : lang}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="p-8 bg-black/50">
                <pre className="overflow-x-auto text-sm">
                  <code className="text-gray-300">
                    {codeExamples[activeTab as keyof typeof codeExamples]}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Grid */}
      <section className="bg-black relative py-24">
        <Container size="lg">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Enterprise-Ready Features
            </h2>
            <p className="text-xl text-gray-400">
              Built for production workloads at any scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'Two-tier Caching',
                description: 'L1 cache for hot data (24h TTL) and L2 cache for warm data (7d TTL) with automatic promotion.',
                gradient: 'from-blue-500 to-cyan-500',
              },
              {
                name: 'Automatic Failover',
                description: 'Seamless fallback to cloud storage when Redis is unavailable with circuit breaker pattern.',
                gradient: 'from-purple-500 to-pink-500',
              },
              {
                name: 'Real-time Sync',
                description: 'Pub/Sub based cache invalidation with background synchronization every 5 minutes.',
                gradient: 'from-cyan-500 to-teal-500',
              },
              {
                name: 'Edge Optimized',
                description: 'Deploy close to your users with support for 12 global data centers.',
                gradient: 'from-pink-500 to-orange-500',
              },
              {
                name: 'Type Safe',
                description: 'Full TypeScript support with comprehensive type definitions and IDE autocomplete.',
                gradient: 'from-orange-500 to-yellow-500',
              },
              {
                name: 'SOC 2 Compliant',
                description: 'Enterprise-grade security with end-to-end encryption and regular compliance audits.',
                gradient: 'from-green-500 to-blue-500',
              },
            ].map((feature, i) => (
              <div
                key={feature.name}
                className="group relative p-6 rounded-2xl glass-effect transition-all hover:scale-105 hover:bg-white/10"
                style={{
                  animation: `slide-up 0.5s ease-out ${i * 0.1}s both`,
                  opacity: 0
                }}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.name}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA section */}
      <section className="bg-gray-950 relative py-24">
        <Container size="sm">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of developers using Mem0 Hybrid to power their AI applications.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/docs"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl shadow-2xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-105"
              >
                Start Building →
              </Link>
              <a
                href="https://github.com/n3wth/mem0-redis-hybrid"
                className="px-8 py-4 glass-effect text-white font-semibold rounded-xl transition-all hover:bg-white/10"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}