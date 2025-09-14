'use client'

import { useState } from 'react'
import { Search, Command, ChevronDown } from 'lucide-react'
import { versionConfig } from '@/lib/docs-config'

export function DocsHeader() {
  const [showSearch, setShowSearch] = useState(false)
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)

  return (
    <div className="sticky top-16 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Docs</span>
            <span className="text-gray-500">/</span>
            <span className="text-white font-medium">Getting Started</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Search</span>
              <div className="flex items-center gap-1 ml-8">
                <kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/20">K</kbd>
              </div>
            </button>

            {/* Version Selector */}
            <div className="relative">
              <button
                onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                <span className="text-sm text-white">{versionConfig.current}</span>
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </button>

              {showVersionDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden">
                  {versionConfig.versions.map((version) => (
                    <a
                      key={version.version}
                      href={version.path}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      {version.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* API Reference */}
            <a
              href="/docs/api-reference"
              className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-sm font-medium rounded-lg transition-colors"
            >
              API Reference
            </a>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowSearch(false)}>
          <div className="fixed inset-x-0 top-20 mx-auto max-w-2xl p-4">
            <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Search className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => setShowSearch(false)}
                  className="text-gray-500 hover:text-white"
                >
                  <kbd className="px-2 py-1 text-xs bg-white/10 rounded border border-white/20">ESC</kbd>
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-2">
                {/* Search Results */}
                <div className="space-y-1">
                  <a href="/docs/getting-started/quickstart" className="block px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="text-sm font-medium text-white">Quick Start</div>
                    <div className="text-xs text-gray-500">Get up and running in 5 minutes</div>
                  </a>
                  <a href="/docs/api/client" className="block px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="text-sm font-medium text-white">Client API</div>
                    <div className="text-xs text-gray-500">Complete API reference for the Recall client</div>
                  </a>
                  <a href="/docs/examples/chatbot-memory" className="block px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="text-sm font-medium text-white">Chatbot with Memory</div>
                    <div className="text-xs text-gray-500">Build an intelligent chatbot</div>
                  </a>
                </div>
              </div>

              <div className="px-4 py-2 border-t border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white/10 rounded border border-white/20">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white/10 rounded border border-white/20">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white/10 rounded border border-white/20">ESC</kbd>
                    Close
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}