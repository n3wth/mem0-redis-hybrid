"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface BentoCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
  gradient?: string;
  span?: string;
}

export function BentoCard({
  title,
  description,
  icon,
  className,
  children,
  gradient = "from-gray-900 to-gray-800",
  span = "col-span-1",
}: BentoCardProps) {
  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/5 p-6 md:p-8",
        "bg-gray-900/50 backdrop-blur-xl transition-all duration-500",
        "hover:border-white/10",
        span,
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3 }}
    >
      {/* Color gradient that appears on hover */}
      <div
        className={cn(
          "absolute inset-0 rounded-3xl bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          gradient,
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        {icon && (
          <div className="mb-4 inline-flex rounded-xl bg-white/5 p-3 transition-all duration-500 group-hover:bg-white/10">
            {icon}
          </div>
        )}

        <h3 className="mb-2 text-lg font-semibold text-white break-words md:text-xl">
          {title}
        </h3>

        {description && (
          <p className="mb-4 text-sm text-gray-400 break-words md:text-base">
            {description}
          </p>
        )}

        {children}
      </div>

      {/* Hover effect corner glow - only appears on hover */}
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-3xl opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:right-0 group-hover:top-0" />
      <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-r from-pink-500/30 to-orange-500/30 blur-3xl opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:bottom-0 group-hover:left-0" />
    </motion.div>
  );
}
