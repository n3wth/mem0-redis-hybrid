export interface DocSection {
  title: string;
  items: DocItem[];
}

export interface DocItem {
  title: string;
  slug: string;
  badge?: string;
}

export const docsConfig: DocSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", slug: "getting-started/introduction" },
      { title: "Quick Start", slug: "getting-started/quickstart" },
      { title: "Installation", slug: "getting-started/installation" },
    ]
  },
  {
    title: "Core Concepts",
    items: [
      { title: "Architecture", slug: "concepts/architecture" },
      { title: "Memory Model", slug: "concepts/memory-model" },
      { title: "Caching Strategy", slug: "concepts/caching" },
      { title: "Synchronization", slug: "concepts/sync" },
    ]
  },
  {
    title: "API Reference",
    items: [
      { title: "Client API", slug: "api/client" },
      { title: "REST API", slug: "api/rest", badge: "New" },
      { title: "WebSocket API", slug: "api/websocket" },
      { title: "Webhooks", slug: "api/webhooks" },
      { title: "Error Codes", slug: "api/errors" },
    ]
  },
  {
    title: "SDKs",
    items: [
      { title: "Python", slug: "sdks/python" },
      { title: "TypeScript/Node.js", slug: "sdks/typescript" },
      { title: "Go", slug: "sdks/go", badge: "Coming Soon" },
      { title: "Rust", slug: "sdks/rust", badge: "Coming Soon" },
      { title: "Ruby", slug: "sdks/ruby", badge: "Coming Soon" },
    ]
  },
  {
    title: "Examples",
    items: [
      { title: "Chatbot with Memory", slug: "examples/chatbot-memory" },
      { title: "RAG Application", slug: "examples/rag-application" },
      { title: "Customer Support Bot", slug: "examples/support-bot" },
      { title: "Personalization Engine", slug: "examples/personalization" },
      { title: "Multi-Agent System", slug: "examples/multi-agent" },
    ]
  },
  {
    title: "Integrations",
    items: [
      { title: "OpenAI", slug: "integrations/openai" },
      { title: "LangChain", slug: "integrations/langchain" },
      { title: "LlamaIndex", slug: "integrations/llamaindex" },
      { title: "Vercel AI SDK", slug: "integrations/vercel-ai" },
      { title: "React", slug: "integrations/react" },
      { title: "Next.js", slug: "integrations/nextjs" },
    ]
  },
  {
    title: "Features",
    items: [
      { title: "Priority Levels", slug: "features/priority" },
      { title: "Batch Operations", slug: "features/batch" },
      { title: "Search & Filtering", slug: "features/search" },
      { title: "Metadata", slug: "features/metadata" },
      { title: "Compression", slug: "features/compression" },
      { title: "Encryption", slug: "features/encryption", badge: "Pro" },
    ]
  },
  {
    title: "Operations",
    items: [
      { title: "Monitoring", slug: "operations/monitoring" },
      { title: "Logging", slug: "operations/logging" },
      { title: "Metrics", slug: "operations/metrics" },
      { title: "Health Checks", slug: "operations/health" },
      { title: "Backup & Recovery", slug: "operations/backup" },
      { title: "Migration", slug: "operations/migration" },
    ]
  },
  {
    title: "Deployment",
    items: [
      { title: "Docker", slug: "deployment/docker" },
      { title: "Kubernetes", slug: "deployment/kubernetes" },
      { title: "AWS", slug: "deployment/aws" },
      { title: "Google Cloud", slug: "deployment/gcp" },
      { title: "Azure", slug: "deployment/azure" },
      { title: "Vercel", slug: "deployment/vercel" },
    ]
  },
  {
    title: "Guides",
    items: [
      { title: "Best Practices", slug: "guides/best-practices" },
      { title: "Performance Tuning", slug: "guides/performance" },
      { title: "Security", slug: "guides/security" },
      { title: "Scaling", slug: "guides/scaling" },
      { title: "Troubleshooting", slug: "guides/troubleshooting" },
      { title: "Migration from Mem0", slug: "guides/migration-mem0" },
    ]
  },
  {
    title: "Reference",
    items: [
      { title: "Configuration", slug: "reference/configuration" },
      { title: "Environment Variables", slug: "reference/env-vars" },
      { title: "CLI Commands", slug: "reference/cli" },
      { title: "Changelog", slug: "reference/changelog" },
      { title: "Roadmap", slug: "reference/roadmap" },
    ]
  },
];

export const apiReferenceConfig = {
  baseUrl: "https://api.recall.ai",
  version: "v1",
  authentication: {
    type: "Bearer",
    header: "Authorization",
  },
  rateLimit: {
    requests: 1000,
    window: "1m",
  },
};

export const searchConfig = {
  algolia: {
    appId: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
    apiKey: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY,
    indexName: "recall-docs",
  },
};

export const versionConfig = {
  current: "1.0.0",
  versions: [
    { version: "1.0.0", label: "v1.0 (Current)", path: "/docs" },
    { version: "0.9.0", label: "v0.9", path: "/docs/v0.9" },
  ],
};