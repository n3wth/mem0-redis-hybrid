'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeTab {
  label: string
  language: string
  code: string
}

interface CodeTabsProps {
  tabs: CodeTab[]
}

export function CodeTabs({ tabs }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tabs[activeTab].code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-white/[0.01]">
      {/* Tab Headers */}
      <div className="flex items-center justify-between border-b border-white/10">
        <div className="flex">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === index
                  ? 'text-white bg-white/5 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-gray-300 font-mono">
          {tabs[activeTab].code}
        </code>
      </pre>
    </div>
  )
}