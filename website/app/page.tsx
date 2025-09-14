'use client'

import { Check, Zap, Shield, ArrowRight, Code, Database, Lock, Globe, Sparkles, Cpu, Layers, Gauge, Copy, Sun, RefreshCw, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState, lazy, Suspense } from 'react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { Container } from '@/components/Grid'
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
const BorderBeam = lazy(() => import('@/components/magicui/border-beam').then(module => ({ default: module.BorderBeam })))
const ShineBorder = lazy(() => import('@/components/magicui/shine-border').then(module => ({ default: module.ShineBorder })))

export default function Home() {
  const [activeTab, setActiveTab] = useState('node')
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const codeExamples = {
    node: `import { Recall } from 'r3call';

// Zero configuration - works immediately
const recall = new Recall();

// Store memory locally
await recall.add({
  content: 'User prefers TypeScript and dark mode themes',
  userId: 'user_123'
});

// Retrieve memories instantly
const memories = await recall.search({
  query: 'What are the user preferences?',
  userId: 'user_123'
});`,
    python: `from r3call import Recall

# Zero configuration - works out of the box
client = Recall()

response = client.memories.add(
    content="User prefers dark mode UI",
    metadata={"user_id": "user_123"}
)

print(response.id)`,
    curl: `curl https://api.r3call.newth.ai/v1/memories \\
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
    <div className="flex flex-col min-h-screen bg-black">
      <Navigation />

      {/* Main content wrapper */}
      <main className="flex-1">
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
              Open Source • Built on Mem0 • MIT License
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal tracking-tight mb-6">
              <span className="text-white">Your AI assistant</span>
              <br />
              <GradientText gradient="from-gray-400 to-gray-600" className="inline-block">
                finally remembers you
              </GradientText>
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-gray-400 mb-10 font-light">
              Give Gemini and Claude persistent memory. No more explaining your tech stack every morning.
              No more repeating context after lunch. Just seamless conversations that build on yesterday's work.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => copyToClipboard('npx r3call')}
                className="group relative inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg bg-white text-black transition-all cursor-pointer overflow-hidden hover:scale-105"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                <code className="font-mono relative">npx r3call</code>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600 relative" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-600 group-hover:text-black transition-colors relative" />
                )}
              </button>
              <a
                href="https://github.com/n3wth/r3call"
                className="px-6 py-3 text-base font-medium rounded-lg border border-white/20 text-white hover:bg-white/5 transition-all"
              >
                View on GitHub
              </a>
            </div>

            {/* Animated metrics - contextualized */}
            <div className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-light text-white mb-1">
                  <AnimatedCounter to={30} suffix="s" duration={2} />
                </div>
                <div className="text-xs text-gray-500">To get started</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-light text-white mb-1">
                  <AnimatedCounter to={0} suffix="" duration={2.5} />
                </div>
                <div className="text-xs text-gray-500">Config files</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-light text-white mb-1">
                  <AnimatedCounter to={100} suffix="%" duration={3} />
                </div>
                <div className="text-xs text-gray-500">Local-first</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-light text-white mb-1">
                  <AnimatedCounter to={1} suffix="" duration={2} />
                </div>
                <div className="text-xs text-gray-500">Command</div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Interactive Terminal Demo */}
        <section className="py-32 border-t border-white/5 relative overflow-hidden">
          <Meteors number={20} />
          <Container size="lg">
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-normal text-white mb-3">
                See it in action
              </h2>
              <p className="text-gray-400">
                Real examples with Gemini CLI and Claude Code
              </p>
            </div>
            <Suspense fallback={<div className="bg-gray-900 rounded-lg p-6 animate-pulse h-64" />}>
              <TerminalDemo />
            </Suspense>
          </div>
          </Container>
        </section>

        {/* Code Example - Clean tabs */}
        <section className="py-32 border-t border-white/5">
          <Container size="lg">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl font-normal text-white mb-3">
                Works with your stack
              </h2>
              <p className="text-gray-400">
                Native SDKs with full TypeScript support
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
        <section className="py-32 border-t border-white/5 relative">
          <Container size="lg">
          <div className="mb-12">
            <h2 className="text-3xl font-normal text-white mb-3">
              Built for developers, by a developer
            </h2>
            <p className="text-gray-400">
              Every feature addresses a real pain point from daily AI coding
            </p>
          </div>

          <BentoGrid>
            <BentoCard
              title="Lightning Fast"
              description="Local Redis cache means instant responses, no network latency"
              icon={<Zap className="h-5 w-5 text-yellow-400" />}
              gradient="from-yellow-900/20 to-orange-900/20"
              span="col-span-2"
            />

            <BentoCard
              title="Always Available"
              description="Seamless failover between local and cloud storage"
              icon={<Shield className="h-5 w-5 text-blue-400" />}
              gradient="from-blue-900/20 to-cyan-900/20"
            />

            <BentoCard
              title="Smart Storage"
              description="Intelligent compression keeps memory usage minimal"
              icon={<Database className="h-5 w-5 text-purple-400" />}
              gradient="from-purple-900/20 to-pink-900/20"
            />

            <BentoCard
              title="Universal Compatibility"
              description="Works with Gemini, Claude, GPT-4, and any LLM you prefer"
              icon={<Globe className="h-5 w-5 text-green-400" />}
              gradient="from-green-900/20 to-teal-900/20"
              span="col-span-2"
            />

            <BentoCard
              title="TypeScript Native"
              description="Full type safety with autocomplete that just works"
              icon={<Code className="h-5 w-5 text-indigo-400" />}
              gradient="from-indigo-900/20 to-blue-900/20"
            />

            <BentoCard
              title="Works Offline"
              description="No internet? No problem. Everything runs locally"
              icon={<Lock className="h-5 w-5 text-red-400" />}
              gradient="from-red-900/20 to-orange-900/20"
            />

            <BentoCard
              title="One-Line Setup"
              description="MCP protocol means it just works with Claude Desktop"
              icon={<Sparkles className="h-5 w-5 text-pink-400" />}
              gradient="from-pink-900/20 to-purple-900/20"
            />
          </BentoGrid>
          </Container>
        </section>

        {/* Personal Story Section */}
        <section className="py-32 border-t border-white/5 relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 via-transparent to-blue-900/5" />
          </div>

          <Container size="md">
            <div className="relative">
              {/* Card with subtle glow */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-1000" />

                <div className="relative bg-black/40 backdrop-blur-sm rounded-2xl p-10 border border-white/10">
                  <h3 className="text-2xl font-medium text-white mb-10">
                    The problem was personal
                  </h3>

                  <div className="space-y-8">
                    {/* Pain points */}
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
                          <Sun className="h-5 w-5 text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-300">Every morning:</p>
                          <p className="text-gray-500 mt-1">
                            "Claude, I'm using Next.js 14 with TypeScript, Tailwind, and..."
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                          <RefreshCw className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-300">Every context switch:</p>
                          <p className="text-gray-500 mt-1">
                            "Let me explain my project structure again..."
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                          <Plus className="h-5 w-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-300">Every new session:</p>
                          <p className="text-gray-500 mt-1">
                            Starting from zero. Again.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Solution */}
                    <div className="pt-8 border-t border-white/10">
                      <p className="text-lg text-white leading-relaxed">
                        So I built r3call. Now my AI remembers everything - my stack, my patterns,
                        my preferences. One command, and you're done. Open source, because
                        we all deserve AI that actually helps.
                      </p>
                    </div>

                    {/* Author */}
                    <div className="pt-4">
                      <a
                        href="https://github.com/n3wth"
                        className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
                      >
                        <span>— Oliver</span>
                        <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                          (View my work on GitHub
                          <ArrowRight className="inline h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                          )
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* CTA - Minimal */}
        <section className="py-32 border-t border-white/5">
          <Container size="sm">
          <div className="text-center">
            <h2 className="text-3xl font-normal text-white mb-3">
              Ready to give your AI memory?
            </h2>
            <p className="text-gray-400 mb-8">
              Join hundreds of developers who never repeat themselves
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => copyToClipboard('npx r3call')}
                className="group relative inline-flex items-center gap-2 px-6 py-3 font-mono font-medium rounded-lg border border-white/20 bg-white text-black transition-all cursor-pointer hover:scale-105 overflow-hidden"
              >
                {/* Rainbow gradient border effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 blur-lg" />
                </div>
                <div className="absolute inset-[1px] bg-white rounded-lg" />

                <span className="relative flex items-center gap-2">
                  npx r3call
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600 group-hover:text-black transition-colors" />
                  )}
                </span>
              </button>
              <a
                href="https://github.com/n3wth/r3call"
                className="px-6 py-3 text-white font-medium rounded-lg border border-white/20 transition-all hover:bg-white/5 hover:border-white/30"
              >
                Star on GitHub
              </a>
            </div>
          </div>
        </Container>
        </section>
      </main>

      <Footer />
    </div>
  )
}