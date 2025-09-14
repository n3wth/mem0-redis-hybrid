"use client";

import {
  Check,
  Zap,
  Shield,
  ArrowRight,
  Code,
  Database,
  Lock,
  Globe,
  Sparkles,
  Cpu,
  Layers,
  Gauge,
  Copy,
  Sun,
  RefreshCw,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useState, lazy, Suspense } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Container } from "@/components/Grid";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { SpotlightCard } from "@/components/Spotlight";
import { BentoGrid, BentoCard } from "@/components/BentoGrid";
import {
  TextReveal,
  GradientText,
  TypewriterText,
} from "@/components/TextReveal";
import { FloatingDots } from "@/components/FloatingDots";
// Lazy load heavy components
const TerminalDemo = lazy(() =>
  import("@/components/TerminalDemo").then((module) => ({
    default: module.TerminalDemo,
  })),
);
const RainbowButton = lazy(() =>
  import("@/components/magicui/rainbow-button").then((module) => ({
    default: module.RainbowButton,
  })),
);
const ShimmerButton = lazy(() =>
  import("@/components/magicui/shimmer-button").then((module) => ({
    default: module.ShimmerButton,
  })),
);
const Meteors = lazy(() =>
  import("@/components/magicui/meteors").then((module) => ({
    default: module.Meteors,
  })),
);
const Particles = lazy(() =>
  import("@/components/magicui/particles").then((module) => ({
    default: module.Particles,
  })),
);
const Background3D = lazy(() =>
  import("@/components/Background3D").then((module) => ({
    default: module.Background3D,
  })),
);
const BorderBeam = lazy(() =>
  import("@/components/magicui/border-beam").then((module) => ({
    default: module.BorderBeam,
  })),
);
const ShineBorder = lazy(() =>
  import("@/components/magicui/shine-border").then((module) => ({
    default: module.ShineBorder,
  })),
);

export default function Home() {
  const [activeTab, setActiveTab] = useState("node");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeExamples = {
    node: `import { Recall } from 'r3';

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
    python: `from r3 import Recall

# Zero configuration - works out of the box
client = Recall()

response = client.memories.add(
    content="User prefers dark mode UI",
    metadata={"user_id": "user_123"}
)

print(response.id)`,
    curl: `curl https://api.r3.newth.ai/v1/memories \\
  -H "Authorization: Bearer $MEM0_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "User prefers dark mode UI",
    "metadata": {
      "user_id": "user_123"
    }
  }'`,
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <Navigation />

      {/* Main content wrapper */}
      <main className="flex-1">
        {/* Hero - Clean and minimal with enhanced effects */}
        <div className="relative min-h-[75vh] flex items-center justify-center overflow-visible py-16">
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

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal tracking-tight mb-8 leading-[1.15]">
                <span className="text-white block">Your AI assistant</span>
                <GradientText
                  gradient="from-gray-400 to-gray-600"
                  className="inline-block mt-1"
                >
                  finally remembers you
                </GradientText>
              </h1>

              <p className="mx-auto max-w-2xl text-lg text-gray-400 mb-10 font-light">
                Give Gemini and Claude persistent memory. No more explaining
                your tech stack every morning. No more repeating context after
                lunch. Just seamless conversations that build on yesterday's
                work.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => copyToClipboard("npx r3")}
                  className="group relative inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg bg-white text-black transition-all cursor-pointer overflow-hidden hover:scale-105"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  <code className="font-mono relative">npx r3</code>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600 relative" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600 group-hover:text-black transition-colors relative" />
                  )}
                </button>
                <a
                  href="https://github.com/n3wth/r3"
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
              <Suspense
                fallback={
                  <div className="bg-gray-900 rounded-lg p-6 animate-pulse h-64" />
                }
              >
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
                        ${
                          activeTab === lang
                            ? "text-white bg-white/5 border-b border-white"
                            : "text-gray-500 hover:text-gray-300"
                        }
                      `}
                      >
                        {lang === "node" ? "Node.js" : lang}
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

          {/* Modern split layout inspired by Every.to and OpenAI */}
          <Container size="lg">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-normal text-white mb-6">
                The context problem
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Every conversation starts from zero. Your carefully built
                context vanishes the moment you close the window.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Before - Without r3 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-500/[0.02] to-gray-600/[0.02] rounded-2xl" />
                <div className="relative bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-full hover:border-white/20 transition-colors">
                  <div className="mb-8">
                    <h3 className="text-xl font-medium text-white">
                      Without memory
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Constant repetition
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-gray-500/30 via-gray-500/20 to-transparent" />
                      <div className="pl-6 space-y-3">
                        <div className="bg-gradient-to-r from-gray-500/[0.05] to-transparent rounded-xl p-4 border border-gray-500/10">
                          <p className="text-xs font-mono text-gray-400 mb-2">
                            Morning session
                          </p>
                          <p className="text-sm text-gray-300">
                            "I'm using Next.js 14 with TypeScript..."
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-gray-500/[0.05] to-transparent rounded-xl p-4 border border-gray-500/10">
                          <p className="text-xs font-mono text-gray-400 mb-2">
                            Afternoon context switch
                          </p>
                          <p className="text-sm text-gray-300">
                            "Let me explain my architecture again..."
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-gray-500/[0.05] to-transparent rounded-xl p-4 border border-gray-500/10">
                          <p className="text-xs font-mono text-gray-400 mb-2">
                            Next day
                          </p>
                          <p className="text-sm text-gray-300">
                            "Starting from scratch. Again."
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <RefreshCw className="h-4 w-4 animate-spin-slow" />
                          <span>Endless loop</span>
                        </div>
                        <span className="text-xs text-gray-400/60 font-mono">
                          Time lost daily
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* After - With r3 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-blue-600/[0.03] rounded-2xl" />
                <div className="relative bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/10 h-full hover:border-white/20 transition-colors">
                  <div className="mb-8">
                    <h3 className="text-xl font-medium text-white">
                      With r3
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Continuous context
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-blue-500/20 to-transparent" />
                      <div className="pl-6 space-y-3">
                        <div className="bg-gradient-to-r from-blue-500/[0.05] to-transparent rounded-xl p-4 border border-blue-500/10">
                          <p className="text-xs font-mono text-blue-400 mb-2">
                            Initial setup
                          </p>
                          <p className="text-sm text-gray-300">
                            AI learns your context once
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-blue-500/[0.05] to-transparent rounded-xl p-4 border border-blue-500/10">
                          <p className="text-xs font-mono text-blue-400 mb-2">
                            Every session
                          </p>
                          <p className="text-sm text-gray-300">
                            Picks up exactly where you left off
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-blue-500/[0.05] to-transparent rounded-xl p-4 border border-blue-500/10">
                          <p className="text-xs font-mono text-blue-400 mb-2">
                            Over time
                          </p>
                          <p className="text-sm text-gray-300">
                            Learns patterns, grows with your project
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Check className="h-4 w-4 text-blue-400" />
                          <span>Always ready</span>
                        </div>
                        <span className="text-xs text-blue-400/60 font-mono">
                          Full context retention
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTA section */}
            <div className="mt-16 flex justify-center">
              <div className="relative group max-w-2xl w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 rounded-2xl blur-xl" />
                <div className="relative bg-black/60 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                  <p className="text-center text-lg text-gray-300 mb-6">
                    Built on Redis for speed. Powered by Mem0 for intelligence.
                    <br />
                    <span className="text-white font-medium">
                      One command to transform your AI workflow.
                    </span>
                  </p>
                  <div className="flex justify-center">
                    <button
                      onClick={() => copyToClipboard("npx r3")}
                      className="group inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg bg-white text-black transition-all hover:scale-105"
                    >
                      <code className="font-mono">npx r3</code>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}
