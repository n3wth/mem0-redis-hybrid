import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-brand",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "r3 - Intelligent Memory API | Sub-5ms Response Times (by n3wth)",
  description:
    "Hybrid memory system combining Redis caching with cloud persistence. Sub-5ms response times with 99.9% uptime SLA. Build context-aware AI applications with intelligent memory.",
  keywords: [
    "memory API",
    "Redis cache",
    "AI memory",
    "context API",
    "hybrid storage",
    "low latency",
  ],
  authors: [{ name: "n3wth" }],
  creator: "n3wth",
  publisher: "n3wth",
  metadataBase: new URL("https://r3.newth.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "r3 - Intelligent Memory API (by n3wth)",
    description:
      "Hybrid memory system combining Redis caching with cloud persistence. Sub-5ms response times with 99.9% uptime SLA.",
    url: "https://r3.newth.ai",
    siteName: "r3",
    images: [
      {
        url: "https://r3.newth.ai/og-image.png",
        width: 1280,
        height: 720,
        alt: "r3 - Intelligent Memory API",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "r3 - Intelligent Memory API (by n3wth)",
    description:
      "Sub-5ms response times with 99.9% uptime SLA. Hybrid memory system for AI applications.",
    images: ["https://r3.newth.ai/og-image.png"],
    creator: "@n3wth",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#4F46E5" />
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
        className={`${geistSans.variable} ${geistMono.variable} ${jetBrainsMono.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
