"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ConfettiRef {
  fire: (options?: ConfettiOptions) => void;
}

interface ConfettiOptions {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  ticks?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  shapes?: string[];
}

interface ConfettiProps {
  className?: string;
  onMouseEnter?: () => void;
  options?: ConfettiOptions;
}

export const Confetti = forwardRef<ConfettiRef, ConfettiProps>(
  ({ className, onMouseEnter, options = {} }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const particlesRef = useRef<Particle[]>([]);

    const defaultOptions: ConfettiOptions = {
      particleCount: 100,
      angle: 90,
      spread: 45,
      startVelocity: 45,
      decay: 0.9,
      gravity: 1,
      drift: 0,
      ticks: 200,
      origin: { x: 0.5, y: 0.5 },
      colors: [
        "#26ccff",
        "#a25afd",
        "#ff5e7e",
        "#88ff5a",
        "#fcff42",
        "#ffa62d",
        "#ff36ff",
      ],
      shapes: ["square", "circle"],
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      shape: string;
      size: number;
      ticks: number;
      totalTicks: number;
      decay: number;
      gravity: number;
      drift: number;

      constructor(x: number, y: number, opts: ConfettiOptions) {
        const mergedOpts = { ...defaultOptions, ...opts };
        const angle = (mergedOpts.angle! * Math.PI) / 180;
        const spread = (mergedOpts.spread! * Math.PI) / 180;
        const velocity = mergedOpts.startVelocity!;

        this.x = x;
        this.y = y;

        const randomSpread = spread * (Math.random() - 0.5);
        this.vx = Math.cos(angle + randomSpread) * velocity;
        this.vy = Math.sin(angle + randomSpread) * velocity * -1;

        this.color =
          mergedOpts.colors![
            Math.floor(Math.random() * mergedOpts.colors!.length)
          ];
        this.shape =
          mergedOpts.shapes![
            Math.floor(Math.random() * mergedOpts.shapes!.length)
          ];
        this.size = Math.random() * 10 + 5;
        this.ticks = 0;
        this.totalTicks = mergedOpts.ticks!;
        this.decay = mergedOpts.decay!;
        this.gravity = mergedOpts.gravity!;
        this.drift = mergedOpts.drift!;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx += this.drift;
        this.vx *= this.decay;
        this.vy *= this.decay;
        this.ticks++;
        return this.ticks <= this.totalTicks;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;

        if (this.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 2, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }

        ctx.restore();
      }
    }

    const fire = (opts: ConfettiOptions = {}) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const mergedOpts = { ...defaultOptions, ...options, ...opts };
      const originX = canvas.width * mergedOpts.origin!.x!;
      const originY = canvas.height * mergedOpts.origin!.y!;

      for (let i = 0; i < mergedOpts.particleCount!; i++) {
        particlesRef.current.push(new Particle(originX, originY, mergedOpts));
      }

      if (!animationRef.current) {
        animate();
      }
    };

    const animate = () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.draw(ctx);
        return particle.update();
      });

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = undefined;
      }
    };

    useImperativeHandle(ref, () => ({ fire }));

    React.useEffect(() => {
      const handleResize = () => {
        if (!canvasRef.current) return;
        canvasRef.current.width = canvasRef.current.offsetWidth;
        canvasRef.current.height = canvasRef.current.offsetHeight;
      };

      handleResize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={cn("pointer-events-none", className)}
        onMouseEnter={onMouseEnter}
        style={{ width: "100%", height: "100%" }}
      />
    );
  },
);

Confetti.displayName = "Confetti";
