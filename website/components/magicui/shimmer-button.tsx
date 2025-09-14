"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
}

export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(
  (
    {
      className,
      children,
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      borderRadius = "100px",
      shimmerDuration = "3s",
      background = "rgba(0, 0, 0, 1)",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as React.CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          "animate-shimmer-button",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "absolute inset-0 overflow-visible [container-type:size]",
            "before:absolute before:inset-0 before:h-[calc(100%+var(--cut)*1)] before:w-[calc(100%+var(--cut)*1)] before:animate-shimmer-button-spin before:content-['']",
            "before:[aspect-ratio:1] before:[border-radius:0] before:[mask:none]",
            "after:absolute after:inset-[var(--cut)] after:rounded-[var(--radius)] after:content-['']",
            "after:[background:var(--bg)]",
            "before:[background:conic-gradient(from_0deg,transparent_0_340deg,var(--shimmer-color)_360deg)]",
            "before:[translate:-50%_-15%]",
          )}
        />
        <span className="relative z-10 flex items-center justify-center">
          {children}
        </span>
        <style jsx>{`
          @keyframes shimmer-button-spin {
            0% {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            100% {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }
          .animate-shimmer-button-spin {
            animation: shimmer-button-spin var(--speed) infinite linear;
          }
          .animate-shimmer-button {
            border-radius: var(--radius);
          }
        `}</style>
      </button>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";
