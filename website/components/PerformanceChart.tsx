'use client'

import { motion } from 'framer-motion'
import { Zap, TrendingUp, Shield, Globe } from 'lucide-react'
import React from 'react'

interface MetricData {
  label: string
  value: string
  description: string
  icon: React.ElementType
  color: string
  percentage?: number
}

const metrics: MetricData[] = [
  {
    label: 'Response Time',
    value: '<5ms',
    description: 'p99 latency from cache',
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
    percentage: 95
  },
  {
    label: 'Throughput',
    value: '1M+',
    description: 'requests per second',
    icon: TrendingUp,
    color: 'from-blue-500 to-cyan-500',
    percentage: 100
  },
  {
    label: 'Uptime SLA',
    value: '99.9%',
    description: 'guaranteed availability',
    icon: Shield,
    color: 'from-green-500 to-emerald-500',
    percentage: 99.9
  },
  {
    label: 'Global Coverage',
    value: '12',
    description: 'data centers worldwide',
    icon: Globe,
    color: 'from-purple-500 to-pink-500',
    percentage: 80
  }
]

export function PerformanceChart() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity rounded-lg ${metric.color}" />
            <div className="relative p-6 rounded-lg border border-white/10 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${metric.color} bg-opacity-10`}>
                  {React.createElement(Icon, { className: "h-5 w-5 text-white" })}
                </div>
                <span className="text-xs text-gray-500">{metric.label}</span>
              </div>

              <div className="mb-3">
                <div className="text-2xl font-bold text-white">{metric.value}</div>
                <div className="text-xs text-gray-400 mt-1">{metric.description}</div>
              </div>

              {metric.percentage && (
                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.percentage}%` }}
                    transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${metric.color} rounded-full`}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}