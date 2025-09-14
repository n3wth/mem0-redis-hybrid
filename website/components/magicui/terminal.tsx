"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TerminalProps {
  children: React.ReactNode;
  className?: string;
}

export const Terminal = ({ children, className }: TerminalProps) => {
  return (
    <div
      className={cn(
        "mx-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 sm:px-4 py-2 sm:py-3 rounded-t-lg">
        <div className="flex gap-1.5 sm:gap-2">
          <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-red-500" />
          <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-yellow-500" />
          <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
            terminal
          </span>
        </div>
      </div>
      <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto flex-1 min-h-[300px] sm:min-h-[400px]">
        <div className="space-y-1 sm:space-y-2" suppressHydrationWarning>
          {children}
        </div>
      </div>
    </div>
  );
};

interface AnimatedSpanProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedSpan = ({
  children,
  className,
  delay = 0,
}: AnimatedSpanProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 30,
        mass: 0.8,
      }}
      className={cn("", className)}
    >
      {React.Children.map(children, (child, index) => (
        <div key={index} className="leading-relaxed">
          {child}
        </div>
      ))}
    </motion.div>
  );
};

interface TypingAnimationProps {
  children: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export const TypingAnimation = ({
  children,
  className,
  delay = 0,
  duration = 60,
}: TypingAnimationProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!isTyping) return;

    let currentIndex = 0;
    const text = children;

    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, duration);

    return () => clearInterval(interval);
  }, [isTyping, children, duration]);

  return (
    <div className={cn("font-mono", className)}>
      {displayedText}
      {isTyping && displayedText.length < children.length && (
        <motion.span
          animate={{ opacity: [1, 0.2] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "reverse",
            ease: [0.25, 0.1, 0.25, 1], // Apple's standard ease
          }}
          className="inline-block w-2 h-4 bg-current ml-1 rounded-sm"
        />
      )}
    </div>
  );
};
