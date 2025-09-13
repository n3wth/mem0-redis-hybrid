"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface WarpBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  speed?: number;
  blur?: number;
}

export const WarpBackground = ({
  children,
  className,
  containerClassName,
  colors = ["#60a5fa", "#a78bfa", "#f472b6", "#fbbf24", "#34d399"],
  speed = 1,
  blur = 40,
}: WarpBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      for (let i = 0; i < 5; i++) {
        const angle = (time * speed * 0.001) + (i * Math.PI * 2) / 5;
        const radius = 200 + Math.sin(time * 0.001 + i) * 100;

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 300);
        gradient.addColorStop(0, colors[i % colors.length] + "40");
        gradient.addColorStop(1, colors[i % colors.length] + "00");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      time += 16;
      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colors, speed]);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", containerClassName)}>
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0",
          className
        )}
        style={{
          filter: `blur(${blur}px)`,
        }}
      />
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
};