'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export function LogoEffectSlideshow() {
  const [currentEffect, setCurrentEffect] = useState(0);

  // Define just the overlay effects (logo text stays constant)
  const effects = [
    // No effect (clean)
    {
      name: 'clean',
      overlay: null
    },
    // Gradient Glow Pulse
    {
      name: 'gradient-glow',
      overlay: (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-xl opacity-30 animate-pulse pointer-events-none"></div>
      )
    },
    // Quantum Dots
    {
      name: 'quantum-dots',
      overlay: (
        <>
          <div className="absolute top-0 left-1/4 w-1 h-1 bg-blue-400/60 rounded-full animate-quantum-1 pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-1 h-1 bg-purple-400/60 rounded-full animate-quantum-2 pointer-events-none"></div>
          <div className="absolute top-1/2 left-0 w-1 h-1 bg-cyan-400/60 rounded-full animate-quantum-3 pointer-events-none"></div>
          <div className="absolute top-1/2 right-0 w-1 h-1 bg-pink-400/60 rounded-full animate-quantum-4 pointer-events-none"></div>
        </>
      )
    },
    // Orbiting Particles
    {
      name: 'orbiting',
      overlay: (
        <>
          <div className="absolute -top-1 left-1/4 w-1 h-1 bg-blue-400 rounded-full animate-orbit-1 pointer-events-none"></div>
          <div className="absolute top-1/2 -right-1 w-1 h-1 bg-purple-400 rounded-full animate-orbit-2 pointer-events-none"></div>
          <div className="absolute -bottom-1 left-1/3 w-1 h-1 bg-pink-400 rounded-full animate-orbit-3 pointer-events-none"></div>
        </>
      )
    },
    // Subtle Morphing Background
    {
      name: 'morphing',
      overlay: (
        <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg opacity-50 blur-md animate-subtle-morph pointer-events-none"></div>
      )
    },
    // Shimmer Effect
    {
      name: 'shimmer',
      overlay: (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 -skew-x-12 animate-shimmer pointer-events-none overflow-hidden"></div>
      )
    },
    // Breathing Glow
    {
      name: 'breathing',
      overlay: (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 blur-lg rounded-lg animate-breathe pointer-events-none"></div>
      )
    },
    // Data Stream
    {
      name: 'data-stream',
      overlay: (
        <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent animate-data-flow pointer-events-none"></div>
      )
    }
  ];

  // Cycle through effects every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEffect((prev) => (prev + 1) % effects.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [effects.length]);

  return (
    <Link
      href="/"
      className="relative inline-block text-3xl font-semibold text-white"
      style={{ fontFamily: "var(--font-brand)" }}
    >
      {/* The actual logo text (always visible) */}
      <span className="relative z-10">
        r<span className="relative top-[0.15em] text-2xl">3</span>
      </span>

      {/* Animated overlay effects with fade transitions */}
      <AnimatePresence mode="wait">
        {effects[currentEffect].overlay && (
          <motion.div
            key={effects[currentEffect].name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {effects[currentEffect].overlay}
          </motion.div>
        )}
      </AnimatePresence>
    </Link>
  );
}