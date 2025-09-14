'use client'

import { Check, Zap, Shield, ArrowRight, Code, Database, Lock, Globe, Sparkles, Cpu, Layers, Gauge } from 'lucide-react'
import Link from 'next/link'
import { useState, lazy, Suspense } from 'react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { Container } from '@/components/Grid'
import { GradientOrb } from '@/components/GradientOrb'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { SpotlightCard } from '@/components/Spotlight'
import { BentoGrid, BentoCard } from '@/components/BentoGrid'
import { TextReveal, GradientText, TypewriterText } from '@/components/TextReveal'
import { FloatingDots } from '@/components/FloatingDots'
// Lazy load heavy components
const TerminalDemo = lazy(() => import('@/components/TerminalDemo').then(module => ({ default: module.TerminalDemo })))
const RainbowButton = lazy(() => import('@/components/magicui/rainbow-button').then(module => ({ default: module.RainbowButton })))
const ShimmerButton = lazy(() => import('@/components/magicui/shimmer-button').then(module => ({ default: module.ShimmerButton })))
const Meteors = lazy(() => import('@/components/magicui/meteors').then(module => ({ default: module.Meteors })))
const Particles = lazy(() => import('@/components/magicui/particles').then(module => ({ default: module.Particles })))
const Background3D = lazy(() => import('@/components/Background3D').then(module => ({ default: module.Background3D })))

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

      {/* Add gradient orb background */}
      <GradientOrb />

      {/* Hero - Clean and minimal with enhanced effects */}
      <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Floating dots */}
        <FloatingDots count={30} />

        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,100,255,0.13),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(100,150,255,0.13),transparent_50%)]" />
        </div>

        {/* Floating particles */}
        <Suspense fallback={<div className="absolute inset-0" />}>
          <Particles
            className="absolute inset-0"
            quantity={40}
            color="#8b5cf6"
            size={0.6}
          />
        </Suspense>

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <div className="mx-auto max-w-4xl">
            {/* Simple badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Claude Code + Gemini CLI Ready
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal tracking-tight mb-6">
              <span className="text-white">Your AI never forgets</span>
              <br />
              <GradientText gradient="from-gray-400 to-gray-600" className="inline-block">
                what matters most
              </GradientText>
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-gray-400 mb-10 font-light">
              Stop repeating yourself. Recall remembers your coding style, project
              architecture, and personal preferences—turning Claude and Gemini into
              AI assistants that truly know you. Sub-5ms retrieval. Zero context loss.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/docs/quickstart"
                className="group inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg bg-white text-black hover:bg-gray-100 transition-all"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/docs/introduction"
                className="px-6 py-3 text-base font-medium rounded-lg border border-white/20 text-white hover:bg-white/5 transition-all"
              >
                Documentation
              </Link>
            </div>

            {/* Animated metrics */}
            <div className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-light text-white mb-1">
                  <AnimatedCounter to={5} suffix="ms" prefix="<" duration={2} />
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Latency</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-light text-white mb-1">
                  <AnimatedCounter to={99.9} decimals={1} suffix="%" duration={2.5} />
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-light text-white mb-1">
                  <AnimatedCounter to={1000000} suffix="/s" duration={3} />
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Throughput</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-light text-white mb-1">
                  <AnimatedCounter to={12} duration={2} />
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Regions</div>
              </div>
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
                Works with Claude Code & Gemini CLI
              </h2>
              <p className="text-gray-400">
                See real-world examples from your daily workflow
              </p>
            </div>
            <Suspense fallback={<div className="bg-gray-900 rounded-lg p-6 animate-pulse h-64" />}>
              <TerminalDemo />
            </Suspense>
          </div>
        </Container>
      </section>

      {/* Code Example - Clean tabs */}
      <section className="py-24 border-t border-white/5">
        <Container size="lg">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl font-normal text-white mb-3">
                Start building in seconds
              </h2>
              <p className="text-gray-400">
                Drop-in SDKs for your stack. Type-safe. Battle-tested. Production-ready.
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

      {/* Features - Stunning Bento Grid */}
      <section className="py-24 border-t border-white/5 relative">
        <Container size="lg">
          <div className="mb-12">
            <h2 className="text-3xl font-normal text-white mb-3">
              Built for scale, designed for speed
            </h2>
            <p className="text-gray-400">
              Production infrastructure that just works. No compromises. No surprises.
            </p>
          </div>

          <BentoGrid>
            <BentoCard
              title="Lightning-fast recall"
              description="Two-tier intelligent caching. Hot memories in 2ms. Everything else under 5ms."
              icon={<Zap className="h-5 w-5 text-yellow-400" />}
              gradient="from-yellow-900/20 to-orange-900/20"
              span="col-span-1 lg:col-span-2"
            >
              <div className="mt-4 flex items-center gap-4">
                <div className="text-2xl font-light text-white">
                  <AnimatedCounter to={2} suffix="ms" duration={1.5} />
                </div>
                <div className="text-xs text-gray-500">Hot cache response</div>
              </div>
            </BentoCard>

            <BentoCard
              title="Never lose context"
              description="Automatic failover and circuit breakers. Your memories persist."
              icon={<Shield className="h-5 w-5 text-blue-400" />}
              gradient="from-blue-900/20 to-cyan-900/20"
            />

            <BentoCard
              title="Always in sync"
              description="Real-time Pub/Sub updates. Background sync every 5 minutes."
              icon={<Database className="h-5 w-5 text-purple-400" />}
              gradient="from-purple-900/20 to-pink-900/20"
            />

            <BentoCard
              title="Global by default"
              description="12 edge locations worldwide. Your AI remembers everything, everywhere."
              icon={<Globe className="h-5 w-5 text-green-400" />}
              gradient="from-green-900/20 to-teal-900/20"
              span="col-span-1 lg:col-span-2"
            >
              <div className="mt-4 grid grid-cols-3 gap-2">
                {['US-East', 'EU-West', 'AP-South'].map((region) => (
                  <div key={region} className="text-xs text-gray-400 bg-white/5 rounded px-2 py-1">
                    {region}
                  </div>
                ))}
              </div>
            </BentoCard>

            <BentoCard
              title="Developer-first"
              description="Full TypeScript support. Autocomplete everything."
              icon={<Code className="h-5 w-5 text-indigo-400" />}
              gradient="from-indigo-900/20 to-blue-900/20"
            />

            <BentoCard
              title="Enterprise-grade security"
              description="SOC 2 Type II certified. End-to-end encryption."
              icon={<Lock className="h-5 w-5 text-red-400" />}
              gradient="from-red-900/20 to-orange-900/20"
            />

            <BentoCard
              title="AI-Native Architecture"
              description="Purpose-built for LLMs with semantic search and vector indexing."
              icon={<Sparkles className="h-5 w-5 text-pink-400" />}
              gradient="from-pink-900/20 to-purple-900/20"
            />
          </BentoGrid>
        </Container>
      </section>

      {/* CTA - Minimal */}
      <section className="py-24 border-t border-white/5">
        <Container size="sm">
          <div className="text-center">
            <h2 className="text-3xl font-normal text-white mb-3">
              Give your AI perfect memory
            </h2>
            <p className="text-gray-400 mb-8">
              Join developers who've eliminated context switching forever. One command to start.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/docs/quickstart"
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