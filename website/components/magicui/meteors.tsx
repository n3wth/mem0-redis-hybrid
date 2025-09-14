"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface MeteorsProps {
  number?: number;
  className?: string;
}

// Deterministic pseudo-random number generator
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const Meteors = ({ number = 20, className }: MeteorsProps) => {
  const meteors = useMemo(() => {
    return new Array(number).fill(true).map((_, idx) => {
      const seed = idx + 1;
      return {
        top: Math.floor(seededRandom(seed * 2) * 100),
        left: Math.floor(seededRandom(seed * 3) * 100),
        delay: seededRandom(seed * 5) * 3,
        duration: Math.floor(seededRandom(seed * 7) * 5) + 5,
      };
    });
  }, [number]);

  return (
    <>
      {meteors.map((meteor, idx) => (
        <span
          key={idx}
          className={cn(
            "absolute left-1/2 top-1/2 h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10]",
            "before:absolute before:top-1/2 before:h-[1px] before:w-[50px] before:-translate-y-[50%] before:transform before:bg-gradient-to-r before:from-[#64748b] before:to-transparent before:content-['']",
            className,
          )}
          style={{
            top: `${meteor.top}%`,
            left: `${meteor.left}%`,
            animationDelay: `${meteor.delay}s`,
            animationDuration: `${meteor.duration}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes meteor {
          0% {
            transform: rotate(215deg) translateX(0);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: rotate(215deg) translateX(-500px);
            opacity: 0;
          }
        }
        .animate-meteor {
          animation-name: meteor;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </>
  );
};
