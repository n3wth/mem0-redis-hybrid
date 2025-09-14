"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Dot {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export function FloatingDots({ count = 50 }: { count?: number }) {
  const [dots, setDots] = useState<Dot[]>([]);

  useEffect(() => {
    const newDots = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * 5,
    }));
    setDots(newDots);
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {dots.map((dot) => (
        <motion.div
          key={dot.id}
          className="absolute rounded-full bg-white/10"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: dot.duration,
            delay: dot.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function GridPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        className="absolute h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-white/5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Animated grid lines */}
      <motion.div
        className="absolute h-px w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
        animate={{
          y: [-100, 1000],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute h-full w-px bg-gradient-to-b from-transparent via-purple-500/50 to-transparent"
        animate={{
          x: [-100, 2000],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
