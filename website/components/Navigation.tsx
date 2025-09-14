'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { RecallLogo } from './RecallLogo'

export function Navigation() {
  return (
    <nav
      className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50"
    >
      <div className="mx-auto px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className="group flex items-center gap-2.5 text-2xl font-bold text-white hover:scale-105 transition-transform duration-200"
            >
              <div className="relative">
                <RecallLogo size={42} color="#ffffff" animated={false} />
                <div className="absolute inset-0 bg-white/20 blur-xl group-hover:bg-white/30 transition-all duration-300" />
              </div>
              <span className="tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Recall
              </span>
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
                href="https://github.com/n3wth/recall"
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