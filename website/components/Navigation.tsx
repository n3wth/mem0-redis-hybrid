'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function Navigation() {
  return (
    <nav
      className="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50 will-change-transform"
    >
      <div className="mx-auto px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-2xl text-white transition-transform duration-200 hover:scale-105"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              r3call
            </Link>
            <div className="hidden md:ml-10 md:flex md:space-x-2">
              <Link
                href="/docs/introduction"
                className="px-4 py-2 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                Documentation
              </Link>
              <Link
                href="/docs/api-reference"
                className="px-4 py-2 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                API
              </Link>
              <a
                href="https://github.com/n3wth/r3call"
                className="px-4 py-2 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/docs/quickstart"
              className="group inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-white text-black hover:bg-gray-100 transition-all"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}