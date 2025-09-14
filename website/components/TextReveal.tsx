'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface TextRevealProps {
  children: string
  className?: string
  delay?: number
  duration?: number
}

export function TextReveal({
  children,
  className = '',
  delay = 0,
  duration = 0.5
}: TextRevealProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const words = children.split(' ')

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: '100%' }}
            animate={isInView ? { y: 0 } : {}}
            transition={{
              duration,
              delay: delay + i * 0.05,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            {word}
            {i < words.length - 1 && '\u00A0'}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

export function GradientText({
  children,
  gradient = 'from-blue-400 to-purple-600',
  className = ''
}: {
  children: React.ReactNode
  gradient?: string
  className?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.span
      ref={ref}
      className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${className}`}
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={isInView ? { opacity: 1, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.8 }}
    >
      {children}
    </motion.span>
  )
}

export function TypewriterText({
  text,
  className = '',
  delay = 0,
  speed = 0.05
}: {
  text: string
  className?: string
  delay?: number
  speed?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <span ref={ref} className={className}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{
            duration: 0.1,
            delay: delay + i * speed,
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  )
}