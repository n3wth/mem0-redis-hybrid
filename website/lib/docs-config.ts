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
      { title: "Introduction", slug: "introduction" },
      { title: "Quick Start", slug: "quickstart" },
      { title: "Installation", slug: "installation" },
    ]
  },
  {
    title: "API Reference",
    items: [
      { title: "Overview", slug: "api-reference" },
      { title: "Client API", slug: "api/client" },
    ]
  },
  {
    title: "SDKs",
    items: [
      { title: "Python", slug: "sdks/python" },
      { title: "TypeScript/Node.js", slug: "sdks/typescript" },
    ]
  },
  {
    title: "Examples",
    items: [
      { title: "Overview", slug: "examples" },
      { title: "Chatbot with Memory", slug: "examples/chatbot-memory" },
    ]
  },
  {
    title: "Integrations",
    items: [
      { title: "Overview", slug: "integrations" },
    ]
  },
  {
    title: "Support",
    items: [
      { title: "Troubleshooting", slug: "troubleshooting" },
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

import { getPackageVersion } from './version';

const currentVersion = getPackageVersion();

export const versionConfig = {
  current: currentVersion,
  versions: [
    { version: currentVersion, label: `v${currentVersion} (Current)`, path: "/docs" },
  ],
};