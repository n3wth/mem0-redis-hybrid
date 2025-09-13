"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface OrbitingCirclesProps {
  className?: string;
  children?: React.ReactNode;
  iconSize?: number;
  radius?: number;
  reverse?: boolean;
  speed?: number;
  delay?: number;
}

export const OrbitingCircles = ({
  className,
  children,
  iconSize = 30,
  radius = 80,
  reverse = false,
  speed = 1,
  delay = 0,
}: OrbitingCirclesProps) => {
  const childrenArray = React.Children.toArray(children);
  const angleStep = 360 / childrenArray.length;

  return (
    <div className={cn("absolute inset-0", className)}>
      {childrenArray.map((child, index) => {
        const angle = angleStep * index;
        const animationDuration = 20 / speed;
        const animationDelay = delay + (index * 0.2);

        return (
          <div
            key={index}
            className="absolute"
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              animation: `${reverse ? 'orbit-reverse' : 'orbit'} ${animationDuration}s linear infinite`,
              animationDelay: `${animationDelay}s`,
              transformOrigin: `${radius}px center`,
              left: '50%',
              top: '50%',
              marginLeft: `-${iconSize / 2}px`,
              marginTop: `-${iconSize / 2}px`,
            }}
          >
            <div
              className="flex items-center justify-center w-full h-full rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg"
              style={{
                animation: `${reverse ? 'orbit-reverse' : 'orbit'} ${animationDuration}s linear infinite reverse`,
                animationDelay: `${animationDelay}s`,
              }}
            >
              <div className="w-[60%] h-[60%] flex items-center justify-center">
                {child}
              </div>
            </div>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes orbit {
          from {
            transform: rotate(0deg) translateX(${radius}px) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(${radius}px) rotate(-360deg);
          }
        }
        @keyframes orbit-reverse {
          from {
            transform: rotate(360deg) translateX(${radius}px) rotate(-360deg);
          }
          to {
            transform: rotate(0deg) translateX(${radius}px) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
};