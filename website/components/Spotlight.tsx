"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface SpotlightProps {
  className?: string;
  size?: number;
}

export function Spotlight({ className = "", size = 400 }: SpotlightProps) {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;

      const rect = spotlightRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      spotlightRef.current.style.setProperty("--x", `${x}px`);
      spotlightRef.current.style.setProperty("--y", `${y}px`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={spotlightRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={
        {
          "--x": "50%",
          "--y": "50%",
          "--size": `${size}px`,
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(
              circle var(--size) at var(--x) var(--y),
              rgba(255, 255, 255, 0.03),
              transparent 40%
            )
          `,
        }}
      />
    </div>
  );
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(255, 255, 255, 0.1)",
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    };

    card.addEventListener("mousemove", handleMouseMove);
    return () => card.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl ${className}`}
      style={
        {
          "--mouse-x": "50%",
          "--mouse-y": "50%",
          "--spotlight-color": spotlightColor,
        } as React.CSSProperties
      }
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"
        style={{
          background: `
            radial-gradient(
              600px circle at var(--mouse-x) var(--mouse-y),
              var(--spotlight-color),
              transparent 40%
            )
          `,
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
