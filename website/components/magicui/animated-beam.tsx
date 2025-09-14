"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedBeamProps {
  containerRef: React.RefObject<HTMLElement>;
  fromRef: React.RefObject<HTMLElement>;
  toRef: React.RefObject<HTMLElement>;
  curvature?: number;
  endYOffset?: number;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  className?: string;
}

export const AnimatedBeam = ({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  endYOffset = 0,
  reverse = false,
  duration = 3,
  delay = 0,
  className,
}: AnimatedBeamProps) => {
  const [pathD, setPathD] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const updatePath = () => {
      if (!containerRef.current || !fromRef.current || !toRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const fromRect = fromRef.current.getBoundingClientRect();
      const toRect = toRef.current.getBoundingClientRect();

      const fromX = fromRect.left - containerRect.left + fromRect.width / 2;
      const fromY = fromRect.top - containerRect.top + fromRect.height / 2;
      const toX = toRect.left - containerRect.left + toRect.width / 2;
      const toY =
        toRect.top - containerRect.top + toRect.height / 2 + endYOffset;

      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2 + curvature;

      const path = `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`;
      setPathD(path);
    };

    updatePath();
    window.addEventListener("resize", updatePath);
    return () => window.removeEventListener("resize", updatePath);
  }, [containerRef, fromRef, toRef, curvature, endYOffset]);

  return (
    <svg
      ref={svgRef}
      className={cn("pointer-events-none absolute inset-0 z-10", className)}
      width="100%"
      height="100%"
      viewBox={`0 0 ${containerRef.current?.offsetWidth || 1} ${containerRef.current?.offsetHeight || 1}`}
    >
      <path
        d={pathD}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="stroke-zinc-400 dark:stroke-zinc-600"
      />
      <path
        d={pathD}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeDasharray="5 5"
        className="stroke-blue-500 dark:stroke-blue-400"
      >
        <animate
          attributeName="stroke-dashoffset"
          from={reverse ? "0" : "10"}
          to={reverse ? "10" : "0"}
          dur={`${duration}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
};
