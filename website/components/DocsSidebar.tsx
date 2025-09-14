"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsConfig } from "@/lib/docs-config";
import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";

export function DocsSidebar() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const filteredSections = docsConfig
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <nav className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search docs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
        />
      </div>

      {/* Navigation Sections */}
      <div className="space-y-3">
        {filteredSections.map((section) => {
          const isExpanded =
            expandedSections.includes(section.title) ||
            searchQuery ||
            section.items.some((item) => pathname === `/docs/${item.slug}`);

          return (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                <span>{section.title}</span>
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="mt-1 space-y-0.5 ml-2">
                  {section.items.map((item) => {
                    const isActive = pathname === `/docs/${item.slug}`;

                    return (
                      <Link
                        key={item.slug}
                        href={`/docs/${item.slug}`}
                        className={`
                          group flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-all
                          ${
                            isActive
                              ? "bg-white/10 text-white font-medium"
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          }
                        `}
                      >
                        <span>{item.title}</span>
                        {item.badge && (
                          <span
                            className={`
                            px-1.5 py-0.5 text-xs rounded-full font-medium
                            ${
                              item.badge === "New"
                                ? "bg-green-500/20 text-green-400"
                                : item.badge === "Pro"
                                  ? "bg-purple-500/20 text-purple-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                            }
                          `}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="pt-6 border-t border-white/10">
        <div className="space-y-2">
          <Link
            href="https://github.com/n3wth/r3call"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </Link>
        </div>
      </div>
    </nav>
  );
}
