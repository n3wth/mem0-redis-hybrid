'use client'

import { motion } from 'framer-motion'
import { Database, Server, Cloud, Zap, Clock, HardDrive } from 'lucide-react'

export function ArchitectureDiagram() {
  return (
    <div className="relative py-12">
      <div className="flex flex-col items-center gap-8">
        {/* Application Layer */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="flex items-center gap-3 px-6 py-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10">
            <Server className="h-5 w-5 text-blue-400" />
            <span className="text-white font-medium">Your Application</span>
          </div>
        </motion.div>

        {/* Connection Arrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Zap className="h-3 w-3" />
            <span>&lt;5ms</span>
          </div>
        </motion.div>

        {/* Cache Layers */}
        <div className="flex gap-6 flex-wrap justify-center">
          {/* L1 Cache */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gradient-to-b from-orange-500/10 to-orange-500/5 border border-orange-500/20">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-orange-400" />
                <span className="text-white font-medium">L1 Cache</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                <span>24h TTL</span>
              </div>
              <div className="text-xs text-gray-500">Hot Data</div>
            </div>
          </motion.div>

          {/* L2 Cache */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gradient-to-b from-green-500/10 to-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-green-400" />
                <span className="text-white font-medium">L2 Cache</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                <span>7d TTL</span>
              </div>
              <div className="text-xs text-gray-500">Warm Data</div>
            </div>
          </motion.div>
        </div>

        {/* Connection to Cloud */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>&lt;200ms</span>
          </div>
        </motion.div>

        {/* Cloud Storage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative"
        >
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gradient-to-b from-blue-500/10 to-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Cloud Storage</span>
            </div>
            <div className="text-xs text-gray-400">Permanent Storage</div>
            <div className="text-xs text-gray-500">Vector Search</div>
          </div>
        </motion.div>
      </div>

      {/* Performance Indicators */}
      <div className="mt-12 grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <div className="text-2xl font-bold text-white">&lt;5ms</div>
          <div className="text-xs text-gray-400">Cache Latency</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <div className="text-2xl font-bold text-white">99.9%</div>
          <div className="text-xs text-gray-400">Uptime SLA</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center"
        >
          <div className="text-2xl font-bold text-white">1M+</div>
          <div className="text-xs text-gray-400">Req/s</div>
        </motion.div>
      </div>
    </div>
  )
}