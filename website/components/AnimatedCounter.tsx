"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";

interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  from = 0,
  to,
  duration = 2,
  suffix = "",
  prefix = "",
  decimals = 0,
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const motionValue = useMotionValue(from);
  const rounded = useTransform(motionValue, (latest) => {
    return decimals > 0
      ? latest.toFixed(decimals)
      : Math.round(latest).toLocaleString();
  });
  const [displayValue, setDisplayValue] = useState(
    decimals > 0 ? from.toFixed(decimals) : Math.round(from).toLocaleString(),
  );

  useEffect(() => {
    if (inView) {
      const controls = animate(motionValue, to, {
        duration,
        ease: [0.25, 0.46, 0.45, 0.94],
        onUpdate: (latest) => {
          const value =
            decimals > 0
              ? latest.toFixed(decimals)
              : Math.round(latest).toLocaleString();
          setDisplayValue(value);
        },
      });

      return controls.stop;
    }
  }, [inView, motionValue, to, duration, decimals]);

  return (
    <motion.span
      ref={ref}
      className={`tabular-nums ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      suppressHydrationWarning
    >
      {prefix}
      {displayValue}
      {suffix}
    </motion.span>
  );
}
