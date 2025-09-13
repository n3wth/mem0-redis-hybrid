"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ShineBorderProps {
  className?: string;
  shineColor?: string | string[];
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  delay?: number;
  children?: React.ReactNode;
}

export const ShineBorder = ({
  className,
  shineColor = ["#8b5cf6", "#06b6d4", "#10b981"],
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  delay = 0,
  children,
}: ShineBorderProps) => {
  const colorString = Array.isArray(shineColor)
    ? shineColor.join(", ")
    : shineColor;

  return (
    <div
      className={cn(
        "absolute -inset-[1px] rounded-[inherit] opacity-75",
        className
      )}
      style={{
        borderRadius: `${borderRadius}px`,
        background: `linear-gradient(105deg, ${colorString})`,
        padding: `${borderWidth}px`,
        animation: `shine ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        backgroundSize: "200% 200%",
      }}
    >
      <div
        className="h-full w-full rounded-[inherit] bg-white dark:bg-zinc-950"
        style={{
          borderRadius: `${borderRadius - borderWidth}px`,
        }}
      >
        {children}
      </div>
      <style jsx>{`
        @keyframes shine {
          0% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
          100% {
            background-position: 0% 0%;
          }
        }
      `}</style>
    </div>
  );
};