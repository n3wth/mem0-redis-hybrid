"use client";

import { useEffect, useState } from "react";

export function AbstractShapes() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large gradient orb - top left */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(16,163,127,0.4) 0%, rgba(16,163,127,0.1) 40%, transparent 70%)",
          filter: "blur(40px)",
          animation: "float 20s ease-in-out infinite",
        }}
      />

      {/* Medium gradient orb - top right */}
      <div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(16,163,127,0.3) 0%, transparent 70%)",
          filter: "blur(30px)",
          animation: "float 15s ease-in-out infinite reverse",
        }}
      />

      {/* Animated geometric shapes */}
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="shape-gradient-1"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10a37f" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#10a37f" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient
            id="shape-gradient-2"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#10a37f" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#10a37f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Large rotating square */}
        <rect
          x="10%"
          y="20%"
          width="300"
          height="300"
          fill="url(#shape-gradient-1)"
          transform="rotate(12 200 200)"
          style={{
            animation: "rotate 60s linear infinite",
            transformOrigin: "200px 200px",
          }}
        />

        {/* Triangle shape */}
        <polygon
          points="80,10 20,90 140,90"
          fill="url(#shape-gradient-2)"
          transform="translate(600, 100)"
          style={{
            animation: "float 25s ease-in-out infinite",
          }}
        />

        {/* Circle with stroke */}
        <circle
          cx="85%"
          cy="70%"
          r="150"
          fill="none"
          stroke="#10a37f"
          strokeWidth="0.5"
          opacity="0.2"
          style={{
            animation: "pulse 4s ease-in-out infinite",
          }}
        />

        {/* Hexagon */}
        <polygon
          points="50,10 90,30 90,70 50,90 10,70 10,30"
          fill="none"
          stroke="#10a37f"
          strokeWidth="0.5"
          opacity="0.15"
          transform="translate(200, 400) scale(2)"
          style={{
            animation: "rotate 45s linear infinite reverse",
          }}
        />
      </svg>

      {/* Floating dots grid */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-gradient-to-br from-[#10a37f] to-transparent"
            style={{
              left: `${15 + (i % 4) * 25}%`,
              top: `${20 + Math.floor(i / 4) * 30}%`,
              opacity: 0.1 + (i % 3) * 0.05,
              animation: `float ${10 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Large background mesh */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #10a37f 1px, transparent 1px),
            linear-gradient(to bottom, #10a37f 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          transform: "rotate(-5deg) scale(1.5)",
          animation: "slide 30s linear infinite",
        }}
      />

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(10px) translateX(-10px);
          }
          75% {
            transform: translateY(-10px) translateX(20px);
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.05);
          }
        }

        @keyframes slide {
          from {
            transform: rotate(-5deg) scale(1.5) translateX(0);
          }
          to {
            transform: rotate(-5deg) scale(1.5) translateX(50px);
          }
        }
      `}</style>
    </div>
  );
}
