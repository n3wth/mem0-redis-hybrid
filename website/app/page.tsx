'use client'

import { Check, Zap, Shield, ArrowRight, Code, Database, Lock, Globe } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { Container } from '@/components/Grid'
import { TerminalDemo } from '@/components/TerminalDemo'
import { RainbowButton } from '@/components/magicui/rainbow-button'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Meteors } from '@/components/magicui/meteors'

export default function Home() {
  const [activeTab, setActiveTab] = useState('node')

  const codeExamples = {
    node: `import Recall from '@n3wth/recall';

const client = new Recall({
  apiKey: process.env.MEM0_API_KEY,
  redis: process.env.REDIS_URL
});

const response = await client.memories.add({
  content: 'User prefers dark mode UI',
  metadata: { user_id: 'user_123' }
});

console.log(response.id);`,
    python: `from recall import Recall

client = Recall(
    api_key=os.environ["MEM0_API_KEY"],
    redis_url=os.environ["REDIS_URL"]
)

response = client.memories.add(
    content="User prefers dark mode UI",
    metadata={"user_id": "user_123"}
)

print(response.id)`,
    curl: `curl https://api.recall.newth.ai/v1/memories \\
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
    <div className="min-h-screen bg-black">
      <Navigation />

      {/* Hero - Clean and minimal */}
      <div className="relative min-h-[85vh] flex items-center justify-center">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] opacity-5" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <div className="mx-auto max-w-4xl">
            {/* Simple badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              API Available
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal tracking-tight mb-6">
              <span className="text-white">Intelligent memory</span>
              <br />
              <span className="text-gray-500">for AI systems</span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-gray-400 mb-10 font-light">
              Hybrid caching with Redis and cloud persistence. Sub-5ms latency.
              Built for production AI applications.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/docs">
                <RainbowButton>
                  Get started
                  <ArrowRight className="inline-block ml-2 h-4 w-4" />
                </RainbowButton>
              </Link>
              <Link href="/docs">
                <ShimmerButton className="shadow-2xl">
                  <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-base">
                    Documentation
                  </span>
                </ShimmerButton>
              </Link>
            </div>

            {/* Clean metrics */}
            <div className="mt-20 grid grid-cols-4 gap-8 max-w-2xl mx-auto">
              {[
                { label: 'Latency', value: '<5ms' },
                { label: 'Uptime', value: '99.9%' },
                { label: 'Throughput', value: '1M/s' },
                { label: 'Regions', value: '12' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-light text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Terminal Demo */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden">
        <Meteors number={20} />
        <Container size="lg">
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-normal text-white mb-3">
                Simple integration
              </h2>
              <p className="text-gray-400">
                Watch how easy it is to get started
              </p>
            </div>
            <TerminalDemo />
          </div>
        </Container>
      </section>

      {/* Code Example - Clean tabs */}
      <section className="py-24 border-t border-white/5">
        <Container size="lg">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl font-normal text-white mb-3">
                Use any language
              </h2>
              <p className="text-gray-400">
                SDKs available for all major platforms
              </p>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.01]">
              <div className="border-b border-white/10">
                <nav className="flex" aria-label="Tabs">
                  {Object.keys(codeExamples).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveTab(lang)}
                      className={`
                        flex-1 px-4 py-3 text-sm font-medium capitalize transition-all
                        ${activeTab === lang
                          ? 'text-white bg-white/5 border-b border-white'
                          : 'text-gray-500 hover:text-gray-300'
                        }
                      `}
                    >
                      {lang === 'node' ? 'Node.js' : lang}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="p-6">
                <pre className="overflow-x-auto text-sm">
                  <code className="text-gray-300 font-mono">
                    {codeExamples[activeTab as keyof typeof codeExamples]}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Features - Card grid */}
      <section className="py-24 border-t border-white/5">
        <Container size="lg">
          <div className="mb-12">
            <h2 className="text-3xl font-normal text-white mb-3">
              Enterprise features
            </h2>
            <p className="text-gray-400">
              Everything you need for production workloads
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Zap,
                name: 'Two-tier caching',
                description: 'L1 hot cache (24h) and L2 warm cache (7d) with automatic promotion',
              },
              {
                icon: Shield,
                name: 'Automatic failover',
                description: 'Seamless fallback with circuit breaker pattern for high availability',
              },
              {
                icon: Database,
                name: 'Real-time sync',
                description: 'Pub/Sub invalidation with 5-minute background synchronization',
              },
              {
                icon: Globe,
                name: 'Edge optimized',
                description: '12 global regions for low-latency access worldwide',
              },
              {
                icon: Code,
                name: 'Type safe',
                description: 'Full TypeScript support with comprehensive type definitions',
              },
              {
                icon: Lock,
                name: 'SOC 2 compliant',
                description: 'Enterprise security with end-to-end encryption',
              },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.name}
                  className="group p-6 rounded-xl border border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all"
                >
                  <Icon className="h-5 w-5 text-white mb-4" />
                  <h3 className="text-base font-medium text-white mb-2">{feature.name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </Container>
      </section>

      {/* CTA - Minimal */}
      <section className="py-24 border-t border-white/5">
        <Container size="sm">
          <div className="text-center">
            <h2 className="text-3xl font-normal text-white mb-3">
              Ready to build?
            </h2>
            <p className="text-gray-400 mb-8">
              Start using Recall in your AI applications today
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/docs"
                className="px-6 py-3 bg-white text-black font-medium rounded-lg transition-all hover:bg-gray-100"
              >
                Get started →
              </Link>
              <a
                href="https://github.com/n3wth/recall"
                className="px-6 py-3 text-white font-medium rounded-lg border border-white/20 transition-all hover:bg-white/5"
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