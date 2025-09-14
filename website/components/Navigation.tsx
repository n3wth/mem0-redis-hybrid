"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogoEffectSlideshow } from "./LogoEffectSlideshow";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navItems = [
    { href: "/docs/introduction", text: "Documentation" },
    { href: "/docs/api-reference", text: "API" },
    { href: "https://github.com/n3wth/r3call", text: "GitHub", external: true },
  ];

  return (
    <nav className="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50 will-change-transform">
      <div className="mx-auto px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center">
            <LogoEffectSlideshow />
            <div className="hidden md:ml-10 md:flex md:space-x-2">
              {navItems.map((item) =>
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    className="px-4 py-3 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all min-h-[44px] flex items-center"
                  >
                    {item.text}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-3 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all min-h-[44px] flex items-center"
                  >
                    {item.text}
                  </Link>
                ),
              )}
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/docs/quickstart"
              className="group inline-flex items-center gap-1 px-5 py-3 text-sm font-medium rounded-lg bg-white/[0.03] text-white border border-white/10 hover:bg-white/[0.05] hover:border-white/20 transition-all min-h-[44px]"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 text-white"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
          >
            <div className="px-6 pb-6 flex flex-col items-stretch space-y-2">
              {navItems.map((item) =>
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    className="px-4 py-3 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.text}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-3 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.text}
                  </Link>
                ),
              )}
              <Link
                href="/docs/quickstart"
                className="group mt-2 inline-flex items-center justify-center gap-1 px-5 py-3 text-sm font-medium rounded-lg bg-white text-black hover:bg-gray-100 transition-all"
                onClick={() => setIsMenuOpen(false)}
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}