import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Only preload if needed
});

export const metadata: Metadata = {
  title: "Recall - Intelligent Memory API | Sub-5ms Response Times",
  description: "Hybrid memory system combining Redis caching with cloud persistence. Sub-5ms response times with 99.9% uptime SLA. Build context-aware AI applications with intelligent memory.",
  keywords: ["memory API", "Redis cache", "AI memory", "context API", "hybrid storage", "low latency"],
  authors: [{ name: "Recall" }],
  creator: "Recall",
  publisher: "Recall",
  metadataBase: new URL("https://recall.newth.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Recall - Intelligent Memory API",
    description: "Hybrid memory system combining Redis caching with cloud persistence. Sub-5ms response times with 99.9% uptime SLA.",
    url: "https://recall.newth.ai",
    siteName: "Recall",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Recall - Intelligent Memory API",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recall - Intelligent Memory API",
    description: "Sub-5ms response times with 99.9% uptime SLA. Hybrid memory system for AI applications.",
    images: ["/og-image.jpg"],
    creator: "@recall_api",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Replace with actual code
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }

              // Preload critical resources
              const linkPrefetch = document.createElement('link');
              linkPrefetch.rel = 'prefetch';
              linkPrefetch.href = '/docs';
              document.head.appendChild(linkPrefetch);
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
