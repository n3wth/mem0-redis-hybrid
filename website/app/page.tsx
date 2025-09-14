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
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
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
import { MemoryVisualization } from "@/components/MemoryVisualization";
import { MemoryComparison } from "@/components/MemoryComparison";
import { CodeBlock } from "@/components/CodeBlock";
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

// Remember work context
await recall.add({
  content: 'Dashboard uses Next.js 14, TypeScript, and Tailwind CSS',
  userId: 'work'
});

// Remember personal context
await recall.add({
  content: 'Kids: Emma (8, loves robotics), Josh (5, into dinosaurs)',
  userId: 'personal'
});

// AI remembers across sessions
const context = await recall.search({
  query: 'What framework am I using?',
  userId: 'work'
});`,
    python: `from r3 import Recall

# Works with any LLM via MCP protocol
client = Recall()

# Store project requirements
client.memories.add(
    content="API needs rate limiting and OAuth2",
    metadata={"project": "backend"}
)

# Store meeting notes
client.memories.add(
    content="Team standup is 9am PST on Tuesdays",
    metadata={"type": "schedule"}
)`,
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
        <div className="relative min-h-[60vh] sm:min-h-[75vh] flex items-center justify-center overflow-visible -mt-20 pt-32 sm:pt-36 md:pt-40">
          {/* Memory visualization - hidden on mobile for cleaner experience */}
          <div className="hidden sm:block absolute inset-0">
            <MemoryVisualization />
          </div>

          {/* Enhanced animated gradient background with depth */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-blue-900/10" />
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,100,255,0.08),transparent_50%)] animate-pulse"
              style={{ animationDuration: "8s" }}
            />
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(100,150,255,0.08),transparent_50%)] animate-pulse"
              style={{ animationDuration: "10s", animationDelay: "1s" }}
            />
            {/* New aurora-like gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-500/[0.03] to-transparent transform translate-y-full animate-aurora" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
            <div className="mx-auto max-w-4xl">
              {/* Professional value prop badge - simplified for mobile */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/[0.03] backdrop-blur-sm px-3 py-1.5 text-xs font-medium border border-white/[0.08]">
                <span className="text-white sm:hidden">
                  Persistent AI Memory
                </span>
                <span className="hidden sm:inline-flex sm:items-center sm:gap-3">
                  <span className="text-purple-300">Lightning-fast cache</span>
                  <span className="text-white/40">×</span>
                  <span className="text-blue-300">Persistent memory</span>
                  <span className="text-white/40">×</span>
                  <span className="text-cyan-300">Universal compatibility</span>
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight mb-8 leading-[1.15]">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="text-white block"
                >
                  Give your AI
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="text-white inline-block mt-1"
                >
                  permanent memory
                </motion.span>
              </h1>

              {/* Mobile-first subtitle */}
              <p className="mx-auto max-w-2xl text-base sm:text-base lg:text-lg text-white/90 mb-8 sm:mb-10 font-light leading-relaxed px-4 sm:px-0">
                <span className="sm:hidden">
                  Context that persists across every AI conversation. Works with
                  Claude, GPT, and Gemini.
                </span>
                <span className="hidden sm:inline">
                  r3 combines{" "}
                  <span className="text-white font-medium">
                    sub-millisecond caching
                  </span>{" "}
                  with{" "}
                  <span className="text-white font-medium">
                    semantic memory storage
                  </span>{" "}
                  to create continuity across every conversation. Compatible
                  with all major AI assistants. Deploy in seconds, configure
                  nothing.
                </span>
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => copyToClipboard("npx r3")}
                  className="group relative inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg bg-white text-black transition-all cursor-pointer overflow-hidden hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />

                  <code className="font-mono relative">npx r3</code>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600 relative" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600 group-hover:text-black transition-colors relative" />
                  )}
                </button>

                <Link
                  href="/docs/quickstart"
                  className="inline-flex items-center gap-1 px-6 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  View Documentation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Stats - Enhanced with animations */}
              <div className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="text-center"
                >
                  <div className="text-xl sm:text-2xl font-light text-white">
                    <AnimatedCounter to={5} suffix="ms" duration={1.5} />
                  </div>
                  <div className="text-xs sm:text-sm text-white/60">
                    Response time
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="text-center"
                >
                  <div className="text-xl sm:text-2xl font-light text-white">
                    ∞
                  </div>
                  <div className="text-xs sm:text-sm text-white/60">
                    Memory retention
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="text-center sm:block hidden"
                >
                  <div className="text-xl sm:text-2xl font-light text-white">
                    <AnimatedCounter to={100} suffix="%" duration={1.5} />
                  </div>
                  <div className="text-xs sm:text-sm text-white/60">
                    Privacy-first
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.7,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="text-center sm:block hidden"
                >
                  <div className="text-xl sm:text-2xl font-light text-white">
                    <AnimatedCounter to={0} duration={1.5} />
                  </div>
                  <div className="text-xs sm:text-sm text-white/60">
                    Configuration
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* The Context Problem Section - Interactive */}
        <MemoryComparison />

        {/* Interactive Terminal Demo */}
        <section className="py-32 border-t border-white/5 relative overflow-hidden">
          <Meteors number={20} />
          <Container size="lg">
            <div className="max-w-4xl mx-auto relative z-10">
              <div className="mb-12 text-center">
                <h2 className="text-3xl sm:text-4xl font-normal text-white mb-4">
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
              <div className="mb-12 text-center">
                <h2 className="text-3xl sm:text-4xl font-normal text-white mb-4">
                  Simple integration
                </h2>
                <p className="text-gray-400">
                  Native SDKs with full TypeScript support
                </p>
              </div>

              <div className="relative">
                <div className="border-b border-white/10 bg-black/40 rounded-t-xl">
                  <nav className="flex" aria-label="Tabs">
                    {Object.keys(codeExamples).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveTab(lang)}
                        className={`
                        flex-1 px-4 py-3 text-sm font-medium capitalize transition-all
                        ${
                          activeTab === lang
                            ? "text-white bg-white/5 border-b-2 border-white"
                            : "text-gray-400 hover:text-gray-300"
                        }
                      `}
                      >
                        {lang === "node" ? "Node.js" : lang}
                      </button>
                    ))}
                  </nav>
                </div>
                <CodeBlock
                  language={
                    activeTab === "node"
                      ? "javascript"
                      : activeTab === "curl"
                        ? "bash"
                        : activeTab
                  }
                >
                  {codeExamples[activeTab as keyof typeof codeExamples]}
                </CodeBlock>
              </div>
            </div>
          </Container>
        </section>

        {/* Features - Stunning Bento Grid */}
        <section className="py-32 border-t border-white/5 relative">
          <Container size="lg">
            <div className="mb-12 text-center">
              <h2 className="text-3xl sm:text-4xl font-normal text-white mb-4">
                Open source memory layer
              </h2>
              <p className="text-gray-400">
                Every feature addresses a real pain point from daily AI coding
              </p>
            </div>

            <BentoGrid>
              <BentoCard
                title="AI Intelligence Engine"
                description="Real vector embeddings, entity extraction, and knowledge graphs - all running locally"
                icon={
                  <Sparkles className="h-6 w-6 text-gray-400 transition-colors duration-500 group-hover:text-emerald-400" />
                }
                gradient="from-emerald-500/20 to-blue-500/20"
                span="lg:col-span-3"
              />

              <BentoCard
                title="Semantic Search"
                description="Find memories by meaning, not just keywords"
                icon={
                  <Cpu className="h-5 w-5 text-gray-400 transition-colors duration-500 group-hover:text-cyan-400" />
                }
                gradient="from-cyan-900/20 to-blue-900/20"
                span="lg:col-span-2"
              />

              <BentoCard
                title="Knowledge Graph"
                description="Build connections between people, projects, and technologies"
                icon={
                  <Layers className="h-5 w-5 text-gray-400 transition-colors duration-500 group-hover:text-purple-400" />
                }
                gradient="from-purple-900/20 to-indigo-900/20"
              />

              <BentoCard
                title="<10ms Latency"
                description="Lightning fast local processing with optimized embeddings"
                icon={
                  <Gauge className="h-5 w-5 text-gray-400 transition-colors duration-500 group-hover:text-orange-400" />
                }
                gradient="from-orange-900/20 to-red-900/20"
              />

              <BentoCard
                title="Redis-powered caching"
                description="In-memory data store for sub-millisecond response times"
                icon={
                  <Zap className="h-5 w-5 text-gray-400 transition-colors duration-500 group-hover:text-yellow-400" />
                }
                gradient="from-yellow-900/20 to-orange-900/20"
                span="lg:col-span-2"
              />

              <BentoCard
                title="Automatic failover"
                description="Works offline with local Redis, syncs when online"
                icon={
                  <Shield className="h-5 w-5 text-gray-400 transition-colors duration-500 group-hover:text-blue-400" />
                }
                gradient="from-blue-900/20 to-cyan-900/20"
              />

              <BentoCard
                title="Efficient storage"
                description="Compressed entries with automatic TTL management"
                icon={<Database className="h-5 w-5 text-purple-400" />}
                gradient="from-purple-900/20 to-pink-900/20"
                span="lg:col-span-2"
              />

              <BentoCard
                title="MCP protocol compatible"
                description="Works with Claude Desktop, Gemini CLI, and any MCP client"
                icon={<Globe className="h-5 w-5 text-green-400" />}
                gradient="from-green-900/20 to-teal-900/20"
                span="lg:col-span-2"
              />

              <BentoCard
                title="TypeScript SDK"
                description="Full type definitions with IntelliSense support"
                icon={<Code className="h-5 w-5 text-indigo-400" />}
                gradient="from-indigo-900/20 to-blue-900/20"
              />

              <BentoCard
                title="Local-first architecture"
                description="Embedded Redis server, no external dependencies"
                icon={<Lock className="h-5 w-5 text-red-400" />}
                gradient="from-red-900/20 to-orange-900/20"
                span="lg:col-span-3"
              />
            </BentoGrid>
          </Container>
        </section>

        {/* Bottom CTA section */}
        <section className="py-32 border-t border-white/5">
          <Container size="sm">
            <div className="flex justify-center">
              <div className="relative group max-w-2xl w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 rounded-2xl blur-xl" />
                <div className="relative bg-black/60 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                  <p className="text-center text-lg text-gray-300 mb-6">
                    Redis caching. Mem0 persistence. Zero configuration.
                    <br />
                    <span className="text-white font-medium">
                      Start building context-aware AI applications.
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
