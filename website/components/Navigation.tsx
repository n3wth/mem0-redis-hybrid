'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export function Navigation() {
  return (
    <nav
      className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-semibold text-white">
              Recall
            </Link>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <Link href="/docs" className="text-gray-300 hover:text-white px-3 py-2 text-sm transition-colors">
                Documentation
              </Link>
              <Link href="/docs#api-reference" className="text-gray-300 hover:text-white px-3 py-2 text-sm transition-colors">
                API reference
              </Link>
              <a href="https://github.com/n3wth/recall" className="text-gray-300 hover:text-white px-3 py-2 text-sm transition-colors">
                GitHub
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/docs"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-black bg-white hover:bg-gray-100 transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}