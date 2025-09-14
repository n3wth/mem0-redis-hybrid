"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
}

export const BorderBeam = ({
  className,
  size = 200,
  duration = 15,
  delay = 0,
  colorFrom = "#6366f1",
  colorTo = "#8b5cf6",
}: BorderBeamProps) => {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
          className,
        )}
        style={{
          mask: `linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0) border-box`,
          maskComposite: "exclude",
        }}
      >
        <div
          className="absolute aspect-square w-full animate-border-beam"
          style={{
            width: `${size}px`,
            offsetPath: `rect(0 auto auto 0 round calc(var(--radius) * 1px))`,
            background: `conic-gradient(from 180deg, transparent, ${colorFrom}, ${colorTo}, transparent)`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      </div>
      <style jsx>{`
        @keyframes border-beam {
          0%,
          to {
            offset-distance: 0%;
          }
          to {
            offset-distance: 100%;
          }
        }
        .animate-border-beam {
          animation-name: border-beam;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </>
  );
};
