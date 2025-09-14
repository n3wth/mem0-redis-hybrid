"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, RotateCcw } from "lucide-react";

const conversations = {
  without: [
    {
      day: "Monday",
      user: "I'm building a React app with TypeScript for my startup",
      ai: "I'll help you with your React TypeScript project",
    },
    {
      day: "Tuesday",
      user: "I need help with my React TypeScript app again",
      ai: "What kind of React TypeScript app are you building?",
    },
    {
      day: "Wednesday",
      user: "Remember that React app? I use TypeScript and Tailwind",
      ai: "Can you tell me more about your project?",
    },
  ],
  with: [
    {
      day: "Monday",
      user: "I'm building a React app with TypeScript for my startup",
      ai: "Got it! I'll remember your tech stack",
    },
    {
      day: "Tuesday",
      user: "Can you help debug that TypeScript error?",
      ai: "The type error in your auth component? Try this fix...",
    },
    {
      day: "Wednesday",
      user: "How's the startup app coming along?",
      ai: "Your React app is looking good! Ready to add the payment flow we discussed?",
    },
  ],
};

export function MemoryComparison() {
  const [isWithMemory, setIsWithMemory] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDay((prev) => {
        const nextDay = (prev + 1) % 3;
        // When we complete a cycle (go back to day 0)
        if (nextDay === 0) {
          setCycleCount((count) => count + 1);
        }
        return nextDay;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-switch between without and with memory after each full cycle
  useEffect(() => {
    if (cycleCount > 0 && currentDay === 0) {
      // Toggle memory mode after showing all 3 days
      setIsWithMemory((prev) => !prev);
    }
  }, [cycleCount, currentDay]);

  const currentConversations = isWithMemory
    ? conversations.with
    : conversations.without;

  return (
    <section className="py-32 border-t border-white/5 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-normal text-white mb-4">
            Same conversation, different experience
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Watch how the same project evolves over three days
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 bg-gray-900/50 rounded-lg border border-white/10">
            <button
              onClick={() => setIsWithMemory(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                !isWithMemory
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Without r3
            </button>
            <button
              onClick={() => setIsWithMemory(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isWithMemory
                  ? "bg-emerald-900/30 text-emerald-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              With r3
            </button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${isWithMemory ? "bg-emerald-400" : "bg-gray-400"}`}
                />
                <span className="text-sm font-medium text-white">
                  {currentConversations[currentDay].day}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isWithMemory ? (
                  <>
                    <Brain className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400">
                      Memory active
                    </span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-400">No memory</span>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="p-6 space-y-6 min-h-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${isWithMemory}-${currentDay}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%]">
                      <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl rounded-tr-sm px-4 py-3">
                        <p className="text-sm text-gray-200">
                          {currentConversations[currentDay].user}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        You
                      </p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <div className="bg-gray-800/50 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                        <p className="text-sm text-gray-200">
                          {currentConversations[currentDay].ai}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">AI Assistant</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress Indicator */}
            <div className="px-6 pb-4">
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === currentDay
                        ? `w-8 ${isWithMemory ? "bg-emerald-400" : "bg-gray-400"}`
                        : "w-1 bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Caption */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              {isWithMemory
                ? "Context builds naturally over time"
                : "Every conversation starts from scratch"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
