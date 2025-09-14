'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface BentoGridProps {
  children: ReactNode
  className?: string
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',
        className
      )}
    >
      {children}
    </div>
  )
}

interface BentoCardProps {
  title: string
  description?: string
  icon?: ReactNode
  className?: string
  children?: ReactNode
  gradient?: string
  span?: string
}

export function BentoCard({
  title,
  description,
  icon,
  className,
  children,
  gradient = 'from-gray-900 to-gray-800',
  span = 'col-span-1',
}: BentoCardProps) {
  return (
    <motion.div
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-white/10 p-6 md:p-8',
        'bg-gradient-to-br backdrop-blur-xl',
        gradient,
        span,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated border gradient */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

      {/* Content */}
      <div className="relative z-10">
        {icon && (
          <div className="mb-4 inline-flex rounded-xl bg-white/5 p-3">
            {icon}
          </div>
        )}

        <motion.h3
          className="mb-2 text-xl font-semibold text-white"
          initial={{ x: -20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h3>

        {description && (
          <motion.p
            className="mb-4 text-gray-400"
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {description}
          </motion.p>
        )}

        {children}
      </div>

      {/* Hover effect corner glow */}
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-3xl transition-all duration-500 group-hover:right-0 group-hover:top-0" />
      <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-r from-pink-500/30 to-orange-500/30 blur-3xl transition-all duration-500 group-hover:bottom-0 group-hover:left-0" />
    </motion.div>
  )
}