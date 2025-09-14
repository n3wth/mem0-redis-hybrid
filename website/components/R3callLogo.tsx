import React from "react";

interface R3callLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function R3callLogo({
  className = "",
  size = "xl",
}: R3callLogoProps) {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
    xl: "text-6xl",
  };

  return (
    <span
      className={`font-semibold tracking-tight ${sizeClasses[size]} ${className}`}
      style={{ fontFamily: "var(--font-brand)" }}
    >
      r<span className="relative top-[0.15em]">3</span>call
    </span>
  );
}
