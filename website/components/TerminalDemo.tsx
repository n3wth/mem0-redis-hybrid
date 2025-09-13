import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from "@/components/magicui/terminal";

export function TerminalDemo() {
  return (
    <div className="w-full h-[400px] flex items-center justify-center p-4">
      <Terminal>
        <TypingAnimation delay={0}>$ claude mcp add recall</TypingAnimation>

        <AnimatedSpan className="text-blue-500" delay={1500}>
          <span>◐ Installing MCP server...</span>
        </AnimatedSpan>

        <AnimatedSpan className="text-green-500" delay={2500}>
          <span>✓ MCP server 'recall' added to claude_config.json</span>
        </AnimatedSpan>

        <TypingAnimation className="text-muted-foreground" delay={3500}>
          $ claude --project myapp
        </TypingAnimation>

        <AnimatedSpan className="text-gray-400" delay={5000}>
          <span>Claude Code v1.0.5 • Model: Claude 3.5 Sonnet</span>
        </AnimatedSpan>

        <AnimatedSpan className="text-green-500" delay={5500}>
          <span>✓ MCP server 'recall' connected (Redis + Mem0)</span>
        </AnimatedSpan>

        <AnimatedSpan className="text-gray-400" delay={6500}>
          <span>
            <span className="text-blue-400">You:</span> Remember I prefer TypeScript and Tailwind
          </span>
        </AnimatedSpan>

        <AnimatedSpan className="text-gray-400" delay={7500}>
          <span>
            <span className="text-purple-400">Claude:</span> I'll remember your preferences.
          </span>
        </AnimatedSpan>

        <AnimatedSpan className="text-gray-500 text-xs" delay={8000}>
          <span>[Memory stored: 3ms latency • TTL: persistent]</span>
        </AnimatedSpan>

        <AnimatedSpan className="text-gray-400" delay={9000}>
          <span>
            <span className="text-blue-400">You:</span> What are my preferences?
          </span>
        </AnimatedSpan>

        <AnimatedSpan className="text-gray-400" delay={10000}>
          <span>
            <span className="text-purple-400">Claude:</span> TypeScript and Tailwind CSS.
          </span>
        </AnimatedSpan>

        <AnimatedSpan className="text-gray-500 text-xs" delay={10500}>
          <span>[Memory retrieved: 2ms from L1 cache]</span>
        </AnimatedSpan>
      </Terminal>
    </div>
  );
}