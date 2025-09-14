"use client";

import { motion } from "framer-motion";

interface RecallLogoProps {
  size?: number;
  color?: string;
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

export function RecallLogo({
  size = 40,
  color = "#4F46E5",
  animated = false,
  showText = false,
  className = "",
}: RecallLogoProps) {
  const viewBox = showText ? "0 0 200 60" : "0 0 120 120";
  const width = showText ? (size * 200) / 60 : size;
  const height = size;

  if (showText) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <g transform="translate(20, 30)">
          <circle cx="0" cy="0" r="6" fill={color} />
          <circle
            cx="0"
            cy="0"
            r="12"
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
          <circle
            cx="0"
            cy="0"
            r="18"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
          <circle
            cx="0"
            cy="0"
            r="24"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        </g>
        <text
          x="50"
          y="37"
          fontFamily="-apple-system, system-ui, sans-serif"
          fontSize="32"
          fontWeight="600"
          fill="currentColor"
        >
          r3
        </text>
      </svg>
    );
  }

  const scale = size / 120;
  const centerRadius = 12 * scale;
  const ring1Radius = 24 * scale;
  const ring2Radius = 36 * scale;
  const ring3Radius = 48 * scale;
  const strokeWidth1 = 2 * scale;
  const strokeWidth2 = 1.5 * scale;

  if (animated) {
    return (
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <motion.circle
          cx="60"
          cy="60"
          r="12"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.circle
          cx="60"
          cy="60"
          r="24"
          fill="none"
          stroke={color}
          strokeWidth="3"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        />
        <motion.circle
          cx="60"
          cy="60"
          r="36"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
        <motion.circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke={color}
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        />
      </motion.svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} drop-shadow-lg`}
    >
      <defs>
        <radialGradient id="logoGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.8" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="14" fill="url(#logoGradient)" />
      <circle
        cx="60"
        cy="60"
        r="24"
        fill="none"
        stroke={color}
        strokeWidth="4"
        opacity="0.9"
      />
      <circle
        cx="60"
        cy="60"
        r="36"
        fill="none"
        stroke={color}
        strokeWidth="3"
        opacity="0.7"
      />
      <circle
        cx="60"
        cy="60"
        r="48"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.5"
      />
    </svg>
  );
}

export function RecallFavicon({ size = 32 }: { size?: number }) {
  const color = "#4F46E5";

  if (size <= 16) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="8" cy="8" r="2" fill={color} />
        <circle
          cx="8"
          cy="8"
          r="4"
          fill="none"
          stroke={color}
          strokeWidth="1"
        />
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke={color}
          strokeWidth="0.8"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="3" fill={color} />
      <circle
        cx="16"
        cy="16"
        r="7"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
      <circle
        cx="16"
        cy="16"
        r="11"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
      />
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="none"
        stroke={color}
        strokeWidth="1"
      />
    </svg>
  );
}
