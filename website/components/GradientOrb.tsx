"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function GradientOrb() {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!orbRef.current) return;

      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;

      orbRef.current.style.setProperty("--mouse-x", `${x}%`);
      orbRef.current.style.setProperty("--mouse-y", `${y}%`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={orbRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={
        {
          "--mouse-x": "50%",
          "--mouse-y": "50%",
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute h-[600px] w-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(124, 58, 237, 0.5) 0%, rgba(56, 189, 248, 0.3) 50%, transparent 70%)",
            filter: "blur(60px)",
            left: "var(--mouse-x)",
            top: "var(--mouse-y)",
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute h-[800px] w-[800px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(67, 56, 202, 0.2) 50%, transparent 70%)",
            filter: "blur(80px)",
            right: "-10%",
            bottom: "-10%",
          }}
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <motion.div
          className="absolute h-[500px] w-[500px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 70%)",
            filter: "blur(70px)",
            left: "-5%",
            top: "20%",
          }}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );
}
