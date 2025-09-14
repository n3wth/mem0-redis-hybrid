"use client";

import {
  ArrowDown,
  ArrowRight,
  Cloud,
  Database,
  Monitor,
  Server,
} from "lucide-react";

export function ArchitectureDiagram() {
  return (
    <div className="py-12">
      <div className="space-y-8">
        {/* Horizontal flow: Claude → MCP → r3 */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-gradient-to-r from-purple-900/20 to-purple-800/20 border border-purple-500/20">
            <Monitor className="h-5 w-5 text-purple-400" />
            <span className="text-white font-medium">Claude Desktop</span>
          </div>

          <ArrowRight className="h-5 w-5 text-gray-500 hidden md:block" />
          <ArrowDown className="h-5 w-5 text-gray-500 md:hidden" />

          <div className="text-sm text-gray-400 bg-gray-900/50 px-4 py-2 rounded border border-gray-800">
            MCP Protocol
          </div>

          <ArrowRight className="h-5 w-5 text-gray-500 hidden md:block" />
          <ArrowDown className="h-5 w-5 text-gray-500 md:hidden" />

          <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/20">
            <Server className="h-5 w-5 text-blue-400" />
            <span className="text-white font-medium">r3 Server</span>
          </div>
        </div>

        {/* Vertical flow: r3 → Redis → Mem0 */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-4">
            <ArrowDown className="h-5 w-5 text-gray-500" />

            <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/20">
              <Database className="h-5 w-5 text-red-400" />
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Redis</span>
                <span className="text-xs text-gray-400">(L1 Cache)</span>
              </div>
            </div>

            <ArrowDown className="h-5 w-5 text-gray-500" />

            <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-gradient-to-r from-cyan-900/20 to-teal-900/20 border border-cyan-500/20">
              <Cloud className="h-5 w-5 text-cyan-400" />
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Mem0 Cloud</span>
                <span className="text-xs text-gray-400">(L2 Storage)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance metrics */}
        <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="text-center p-3 rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="text-xl font-light text-green-400">&lt;5ms</div>
            <div className="text-xs text-gray-500 mt-1">Cache Hit</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="text-xl font-light text-yellow-400">~200ms</div>
            <div className="text-xs text-gray-500 mt-1">Cache Miss</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="text-xl font-light text-blue-400">~10ms</div>
            <div className="text-xs text-gray-500 mt-1">First Store</div>
          </div>
        </div>
      </div>
    </div>
  );
}
