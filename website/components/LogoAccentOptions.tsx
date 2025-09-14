'use client';

import React from 'react';
import R3callLogo from './R3callLogo';

export default function LogoAccentOptions() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-8 text-gray-300">r3 Logo Accent Options</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Option 1: Gradient Glow Pulse */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Gradient Glow Pulse</h2>
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-xl opacity-50 animate-pulse"></div>
              <div className="relative"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 2: Orbiting Particles */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Orbiting Particles</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <div className="absolute -top-2 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-orbit-1"></div>
              <div className="absolute top-1/2 -right-2 w-2.5 h-2.5 bg-purple-400 rounded-full animate-orbit-2"></div>
              <div className="absolute -bottom-1 left-1/3 w-2 h-2 bg-pink-400 rounded-full animate-orbit-3"></div>
            </div>
          </div>

          {/* Option 3: Shimmer Effect */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Shimmer Effect</h2>
            <div className="relative inline-block overflow-hidden">
              <div className="text-6xl font-bold tracking-tight">
                <R3callLogo size="xl" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 -skew-x-12 animate-shimmer"></div>
            </div>
          </div>

          {/* Option 4: Electric Arc */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Electric Arc</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ filter: 'blur(1px)' }}>
                <path
                  d="M 20 30 Q 50 10, 80 30 T 140 30"
                  stroke="url(#electric-gradient)"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.8"
                  className="animate-electric"
                />
                <defs>
                  <linearGradient id="electric-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="50%" stopColor="#A78BFA" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Option 5: Morphing Background */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Morphing Background</h2>
            <div className="relative inline-block">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg opacity-20 blur-lg animate-morph"></div>
              <div className="relative"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 6: Glitch Effect */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Glitch Effect</h2>
            <div className="relative inline-block">
              <div className="animate-glitch"><R3callLogo size="xl" /></div>
              <div className="absolute top-0 left-0 text-blue-400 animate-glitch-1" aria-hidden="true"><R3callLogo size="xl" /></div>
              <div className="absolute top-0 left-0 text-red-400 animate-glitch-2" aria-hidden="true"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 7: Floating Accent */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Floating Accent</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <div className="absolute -top-1 left-[40px] w-8 h-[3px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-float"></div>
            </div>
          </div>

          {/* Option 8: Scan Line */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Scan Line</h2>
            <div className="relative inline-block overflow-hidden">
              <R3callLogo size="xl" />
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan"></div>
            </div>
          </div>

          {/* Option 9: Subtle Border Glow */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Subtle Border Glow</h2>
            <div className="relative inline-block">
              <div className="relative">
                <div className="relative z-10"><R3callLogo size="xl" /></div>
                <div className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 blur-sm" aria-hidden="true"><R3callLogo size="xl" /></div>
              </div>
            </div>
          </div>

          {/* Option 10: Typewriter Cursor */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Typewriter Cursor</h2>
            <div className="relative inline-block">
              <div className="text-6xl font-bold tracking-tight">
                <R3callLogo size="xl" /><span className="animate-blink text-blue-400">|</span>
              </div>
            </div>
          </div>

          {/* Option 11: Neural Network */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Neural Network</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <div className="absolute -top-3 left-0 w-3 h-3 bg-blue-400/40 rounded-full"></div>
              <div className="absolute -top-3 right-0 w-3 h-3 bg-purple-400/40 rounded-full"></div>
              <div className="absolute -bottom-3 left-1/3 w-3 h-3 bg-pink-400/40 rounded-full"></div>
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                <line x1="10" y1="15" x2="40" y2="35" stroke="#60A5FA" strokeWidth="1" />
                <line x1="150" y1="15" x2="120" y2="35" stroke="#A78BFA" strokeWidth="1" />
                <line x1="10" y1="15" x2="150" y2="15" stroke="#F472B6" strokeWidth="1" />
              </svg>
            </div>
          </div>

          {/* Option 12: Gradient Text */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Gradient Text</h2>
            <div className="relative inline-block">
              <div className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 13: Memory Pulse (Subtle) */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Memory Pulse</h2>
            <div className="relative inline-block">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-lg blur-md animate-memory-pulse"></div>
              <div className="relative"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 14: Quantum Dots */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Quantum Dots</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <div className="absolute top-0 left-1/4 w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-quantum-1"></div>
              <div className="absolute bottom-0 right-1/4 w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-quantum-2"></div>
              <div className="absolute top-1/2 left-0 w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-quantum-3"></div>
              <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-pink-400/60 rounded-full animate-quantum-4"></div>
            </div>
          </div>

          {/* Option 15: Soft Aurora */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Soft Aurora</h2>
            <div className="relative inline-block">
              <div className="absolute -inset-3 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-xl blur-xl animate-aurora"></div>
              <div className="relative"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 16: Data Stream */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Data Stream</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent animate-data-flow"></div>
              <div className="absolute -bottom-3 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400/50 to-transparent animate-data-flow-delayed"></div>
            </div>
          </div>

          {/* Option 17: Thought Bubble */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Thought Bubble</h2>
            <div className="relative inline-block">
              <div className="absolute -inset-2 bg-gradient-to-t from-transparent via-blue-500/8 to-transparent rounded-full blur-lg animate-thought"></div>
              <div className="relative"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 18: Echo Effect */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Echo Effect</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <div className="absolute top-0 left-0 text-blue-400/20 animate-echo-1" aria-hidden="true"><R3callLogo size="xl" /></div>
              <div className="absolute top-0 left-0 text-purple-400/10 animate-echo-2" aria-hidden="true"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 19: Micro Particles */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Micro Particles</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-blue-300/60 rounded-full animate-micro-float-1"></div>
              <div className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-purple-300/60 rounded-full animate-micro-float-2"></div>
              <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-cyan-300/60 rounded-full animate-micro-float-3"></div>
            </div>
          </div>

          {/* Option 20: Breathing Glow */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Breathing Glow</h2>
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 blur-lg rounded-lg animate-breathe"></div>
              <div className="relative"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 21: Synaptic Flash */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Synaptic Flash</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <div className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-synapse"></div>
              <div className="absolute bottom-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-400/30 to-transparent animate-synapse-delayed"></div>
            </div>
          </div>

          {/* Option 22: Subtle Morphing */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Subtle Morphing</h2>
            <div className="relative inline-block">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/15 to-purple-500/15 rounded-lg opacity-50 blur-md animate-subtle-morph"></div>
              <div className="relative"><R3callLogo size="xl" /></div>
            </div>
          </div>

          {/* Option 23: Memory Ring */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Memory Ring</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <div className="absolute -inset-3 border border-blue-400/20 rounded-full animate-ring-pulse"></div>
              <div className="absolute -inset-4 border border-purple-400/10 rounded-full animate-ring-pulse-delayed"></div>
            </div>
          </div>

          {/* Option 24: Cognitive Wave */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col items-center justify-center h-64">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Cognitive Wave</h2>
            <div className="relative inline-block">
              <R3callLogo size="xl" />
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                <path
                  d="M 0 40 Q 40 25, 80 40 T 160 40"
                  stroke="url(#wave-gradient)"
                  strokeWidth="1"
                  fill="none"
                  className="animate-wave"
                />
                <defs>
                  <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
                    <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        @keyframes orbit-1 {
          from { transform: rotate(0deg) translateX(30px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
        }
        @keyframes orbit-2 {
          from { transform: rotate(0deg) translateX(40px) rotate(0deg); }
          to { transform: rotate(-360deg) translateX(40px) rotate(360deg); }
        }
        @keyframes orbit-3 {
          from { transform: rotate(0deg) translateX(25px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(25px) rotate(-360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        @keyframes electric {
          0%, 100% { stroke-dasharray: 0 150; }
          50% { stroke-dasharray: 150 0; }
        }
        @keyframes morph {
          0%, 100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
          50% { border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%; }
        }
        @keyframes glitch {
          0%, 100% { text-shadow: none; }
          5% { text-shadow: -2px 0 #ff00ff; }
          10% { text-shadow: 2px 0 #00ffff; }
          15% { text-shadow: none; }
        }
        @keyframes glitch-1 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
          5% { clip-path: inset(0 0 60% 0); transform: translate(-2px); }
          10% { clip-path: inset(0 0 0 0); transform: translate(0); }
        }
        @keyframes glitch-2 {
          0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
          7% { clip-path: inset(60% 0 0 0); transform: translate(2px); }
          13% { clip-path: inset(0 0 0 0); transform: translate(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(80px); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes memory-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes quantum-1 {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          25% { opacity: 0.8; transform: scale(1.5); }
        }
        @keyframes quantum-2 {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
        @keyframes quantum-3 {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          75% { opacity: 0.8; transform: scale(1.5); }
        }
        @keyframes quantum-4 {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          37% { opacity: 0.8; transform: scale(1.5); }
        }
        @keyframes aurora {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.3; }
          33% { transform: rotate(60deg) scale(1.1); opacity: 0.5; }
          66% { transform: rotate(-60deg) scale(0.95); opacity: 0.4; }
        }
        @keyframes data-flow {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes data-flow-delayed {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes thought {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.5; }
          50% { transform: scale(1.2) translateY(-2px); opacity: 0.8; }
        }
        @keyframes echo-1 {
          0%, 100% { transform: scale(1) translateX(0); opacity: 0; }
          50% { transform: scale(1.02) translateX(1px); opacity: 0.2; }
        }
        @keyframes echo-2 {
          0%, 100% { transform: scale(1) translateX(0); opacity: 0; }
          60% { transform: scale(1.04) translateX(2px); opacity: 0.1; }
        }
        @keyframes micro-float-1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-2px) translateX(1px); }
          66% { transform: translateY(1px) translateX(-1px); }
        }
        @keyframes micro-float-2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          40% { transform: translateY(2px) translateX(-1px); }
          80% { transform: translateY(-1px) translateX(1px); }
        }
        @keyframes micro-float-3 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-1px) translateX(-1px); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes synapse {
          0%, 100% { opacity: 0; transform: scaleX(0); }
          50% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes synapse-delayed {
          0%, 100% { opacity: 0; transform: scaleX(0); }
          60% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes subtle-morph {
          0%, 100% { border-radius: 20% 80% 80% 20% / 20% 20% 80% 80%; transform: scale(1); }
          50% { border-radius: 80% 20% 20% 80% / 80% 80% 20% 20%; transform: scale(1.05); }
        }
        @keyframes ring-pulse {
          0%, 100% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 0.3; transform: scale(1); }
        }
        @keyframes ring-pulse-delayed {
          0%, 100% { opacity: 0; transform: scale(0.8); }
          60% { opacity: 0.2; transform: scale(1); }
        }
        @keyframes wave {
          0% { stroke-dasharray: 0 120; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 60 60; stroke-dashoffset: -30; }
          100% { stroke-dasharray: 0 120; stroke-dashoffset: -120; }
        }
      `}</style>

      <style jsx global>{`
        .animate-orbit-1 {
          animation: orbit-1 4s linear infinite;
        }
        .animate-orbit-2 {
          animation: orbit-2 6s linear infinite;
        }
        .animate-orbit-3 {
          animation: orbit-3 5s linear infinite;
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
        .animate-electric {
          animation: electric 2s ease-in-out infinite;
        }
        .animate-morph {
          animation: morph 8s ease-in-out infinite;
        }
        .animate-glitch {
          animation: glitch 4s ease-in-out infinite;
        }
        .animate-glitch-1 {
          animation: glitch-1 4s ease-in-out infinite;
        }
        .animate-glitch-2 {
          animation: glitch-2 4s ease-in-out infinite;
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
        .animate-blink {
          animation: blink 1s linear infinite;
        }
        .animate-memory-pulse {
          animation: memory-pulse 3s ease-in-out infinite;
        }
        .animate-quantum-1 {
          animation: quantum-1 3s ease-in-out infinite;
        }
        .animate-quantum-2 {
          animation: quantum-2 3s ease-in-out infinite;
        }
        .animate-quantum-3 {
          animation: quantum-3 3s ease-in-out infinite;
        }
        .animate-quantum-4 {
          animation: quantum-4 3s ease-in-out infinite;
        }
        .animate-aurora {
          animation: aurora 10s ease-in-out infinite;
        }
        .animate-data-flow {
          animation: data-flow 3s linear infinite;
        }
        .animate-data-flow-delayed {
          animation: data-flow-delayed 3s linear infinite;
          animation-delay: 0.5s;
        }
        .animate-thought {
          animation: thought 4s ease-in-out infinite;
        }
        .animate-echo-1 {
          animation: echo-1 2s ease-out infinite;
        }
        .animate-echo-2 {
          animation: echo-2 2s ease-out infinite;
          animation-delay: 0.3s;
        }
        .animate-micro-float-1 {
          animation: micro-float-1 6s ease-in-out infinite;
        }
        .animate-micro-float-2 {
          animation: micro-float-2 7s ease-in-out infinite;
        }
        .animate-micro-float-3 {
          animation: micro-float-3 5s ease-in-out infinite;
        }
        .animate-breathe {
          animation: breathe 4s ease-in-out infinite;
        }
        .animate-synapse {
          animation: synapse 2s ease-in-out infinite;
        }
        .animate-synapse-delayed {
          animation: synapse-delayed 2s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        .animate-subtle-morph {
          animation: subtle-morph 8s ease-in-out infinite;
        }
        .animate-ring-pulse {
          animation: ring-pulse 3s ease-out infinite;
        }
        .animate-ring-pulse-delayed {
          animation: ring-pulse-delayed 3s ease-out infinite;
          animation-delay: 0.5s;
        }
        .animate-wave {
          animation: wave 3s linear infinite;
        }
      `}</style>
    </div>
  );
}