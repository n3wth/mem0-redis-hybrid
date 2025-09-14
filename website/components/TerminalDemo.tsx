"use client";

import { useState, useEffect } from "react";
import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from "@/components/magicui/terminal";

const demos = [
  {
    title: "Claude Code + Coding Preferences",
    commands: [
      { type: "typing", text: "$ claude --project my-nextjs-app", delay: 0 },
      {
        type: "animated",
        text: "Claude Code v1.0.5 • Model: Claude 3.5 Sonnet",
        className: "text-gray-400",
        delay: 1500,
      },
      {
        type: "animated",
        text: "✓ MCP server 'r3call' connected (hybrid memory active)",
        className: "text-green-500",
        delay: 2000,
      },
      {
        type: "animated",
        text: "You: Remember I prefer React with TypeScript, Tailwind CSS, and Vitest for testing",
        className: "text-gray-400",
        delay: 3000,
        userText: true,
      },
      {
        type: "animated",
        text: "Claude: I'll remember your development stack preferences.",
        className: "text-gray-400",
        delay: 4500,
        assistantText: true,
      },
      {
        type: "animated",
        text: "[Memory stored: 3ms • Priority: high • TTL: persistent]",
        className: "text-gray-500 text-xs",
        delay: 5000,
      },
      {
        type: "animated",
        text: "You: Create a new component",
        className: "text-gray-400",
        delay: 6000,
        userText: true,
      },
      {
        type: "animated",
        text: "Claude: I'll create a TypeScript React component with Tailwind styling...",
        className: "text-gray-400",
        delay: 7000,
        assistantText: true,
      },
      {
        type: "animated",
        text: "[Memory retrieved: 2ms from L1 cache]",
        className: "text-gray-500 text-xs",
        delay: 7500,
      },
    ],
  },
  {
    title: "Gemini CLI + Personal Knowledge",
    commands: [
      {
        type: "typing",
        text: '$ gemini --save "Oliver uses r3call for knowledge management"',
        delay: 0,
      },
      {
        type: "animated",
        text: "Gemini CLI with r3call context • Model: Gemini 1.5 Pro",
        className: "text-gray-400",
        delay: 1500,
      },
      {
        type: "animated",
        text: "✓ Saved to r3call and GEMINI.md",
        className: "text-green-500",
        delay: 2500,
      },
      {
        type: "animated",
        text: "[Memory synced: L1 cache + L2 persistence]",
        className: "text-gray-500 text-xs",
        delay: 3000,
      },
      {
        type: "typing",
        text: '$ gemini -p "@./ explain my knowledge system"',
        delay: 4000,
      },
      {
        type: "animated",
        text: "📚 Retrieving context from r3call...",
        className: "text-blue-400",
        delay: 5500,
      },
      {
        type: "animated",
        text: "Based on your setup, you use r3call which combines:",
        className: "text-gray-400",
        delay: 6500,
      },
      {
        type: "animated",
        text: "• L1 Cache: Redis (sub-5ms responses)",
        className: "text-gray-300",
        delay: 7000,
      },
      {
        type: "animated",
        text: "• L2 Storage: Cloud persistence",
        className: "text-gray-300",
        delay: 7500,
      },
      {
        type: "animated",
        text: "• Smart routing with cache optimization",
        className: "text-gray-300",
        delay: 8000,
      },
      {
        type: "animated",
        text: "[Context enhanced with 3 relevant memories]",
        className: "text-gray-500 text-xs",
        delay: 8500,
      },
    ],
  },
  {
    title: "Claude Code + Project Context",
    commands: [
      {
        type: "typing",
        text: '$ claude mcp add r3call "npx r3call"',
        delay: 0,
      },
      {
        type: "animated",
        text: "◐ Installing MCP server...",
        className: "text-blue-500",
        delay: 1500,
      },
      {
        type: "animated",
        text: "✓ MCP server 'r3call' added to claude_config.json",
        className: "text-green-500",
        delay: 2500,
      },
      {
        type: "typing",
        text: "$ claude --project saas-dashboard",
        delay: 3500,
      },
      {
        type: "animated",
        text: "You: Remember our API uses GraphQL with Apollo Client",
        className: "text-gray-400",
        delay: 5000,
        userText: true,
      },
      {
        type: "animated",
        text: "Claude: Noted. I'll use GraphQL queries with Apollo Client for API calls.",
        className: "text-gray-400",
        delay: 6500,
        assistantText: true,
      },
      {
        type: "animated",
        text: "[Memory stored: Project-specific context saved]",
        className: "text-gray-500 text-xs",
        delay: 7000,
      },
      {
        type: "animated",
        text: "You: Add user authentication",
        className: "text-gray-400",
        delay: 8000,
        userText: true,
      },
      {
        type: "animated",
        text: "Claude: I'll implement auth using GraphQL mutations with Apollo Client...",
        className: "text-gray-400",
        delay: 9000,
        assistantText: true,
      },
      {
        type: "animated",
        text: "[Retrieved 5 related memories about your auth patterns]",
        className: "text-gray-500 text-xs",
        delay: 9500,
      },
    ],
  },
  {
    title: "Gemini CLI + Cross-Project Analysis",
    commands: [
      { type: "typing", text: "$ gemini check", delay: 0 },
      {
        type: "animated",
        text: "Running 4 parallel checks with r3call context...",
        className: "text-blue-400",
        delay: 1500,
      },
      {
        type: "animated",
        text: "✓ Authentication: JWT with refresh tokens",
        className: "text-green-400",
        delay: 2500,
      },
      {
        type: "animated",
        text: "✓ Database: PostgreSQL with Prisma ORM",
        className: "text-green-400",
        delay: 3000,
      },
      {
        type: "animated",
        text: "✓ Testing: 87% coverage with Vitest",
        className: "text-green-400",
        delay: 3500,
      },
      {
        type: "animated",
        text: "✓ Performance: Core Web Vitals passing",
        className: "text-green-400",
        delay: 4000,
      },
      {
        type: "typing",
        text: '$ gemini compare "auth implementation" project-a project-b',
        delay: 5000,
      },
      {
        type: "animated",
        text: "Analyzing with r3call-enhanced context...",
        className: "text-blue-400",
        delay: 6500,
      },
      {
        type: "animated",
        text: "Project A: OAuth 2.0 with social providers",
        className: "text-gray-300",
        delay: 7500,
      },
      {
        type: "animated",
        text: "Project B: Magic link authentication",
        className: "text-gray-300",
        delay: 8000,
      },
      {
        type: "animated",
        text: "[Analysis enhanced with your auth preference history]",
        className: "text-gray-500 text-xs",
        delay: 8500,
      },
    ],
  },
];

export function TerminalDemo() {
  const [currentDemo, setCurrentDemo] = useState(0);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDemo((prev) => (prev + 1) % demos.length);
      setKey((prev) => prev + 1); // Force re-render for animations
    }, 12000); // Switch every 12 seconds

    return () => clearInterval(interval);
  }, []);

  const demo = demos[currentDemo];

  return (
    <div className="w-full h-[600px] flex flex-col items-center justify-start p-2 sm:p-4">
      <div className="text-center mb-4 h-[60px] flex flex-col justify-center">
        <h3 className="text-lg font-semibold text-white mb-1">{demo.title}</h3>
        <div className="flex gap-2 justify-center">
          {demos.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentDemo(index);
                setKey((prev) => prev + 1);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentDemo
                  ? "bg-blue-500 w-8"
                  : "bg-gray-600 hover:bg-gray-500"
              }`}
              aria-label={`Switch to demo ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
        <Terminal key={key} className="h-[480px] w-full max-w-4xl">
          {demo.commands.map((cmd, index) => {
            if (cmd.type === "typing") {
              return (
                <TypingAnimation key={index} delay={cmd.delay}>
                  {cmd.text}
                </TypingAnimation>
              );
            } else {
              let displayText: React.ReactNode = cmd.text;
              if (cmd.userText) {
                const cleanText = cmd.text.replace("You: ", "");
                displayText = (
                  <>
                    <span className="text-blue-400">You:</span> {cleanText}
                  </>
                );
              } else if (cmd.assistantText) {
                const cleanText = cmd.text.replace("Claude: ", "");
                displayText = (
                  <>
                    <span className="text-purple-400">Claude:</span> {cleanText}
                  </>
                );
              }

              return (
                <AnimatedSpan
                  key={index}
                  className={cmd.className}
                  delay={cmd.delay}
                >
                  <span>{displayText}</span>
                </AnimatedSpan>
              );
            }
          })}
        </Terminal>
      </div>
    </div>
  );
}
