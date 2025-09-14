"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface MemoryNode {
  id: string;
  x: number;
  y: number;
  z: number;
  type: string;
  label: string;
  color: string;
  size: number;
  pulseDelay: number;
  floatOffset: number;
  floatDuration: number;
}

interface Connection {
  id: string;
  source: string;
  target: string;
  strength: number;
  particles?: boolean;
}

interface Particle {
  id: number;
  width: number;
  height: number;
  opacity: number;
  left: number;
  top: number;
  xMove: number;
  duration: number;
  delay: number;
}

const memoryTypes = {
  user: { color: "#8b5cf6", label: "User Context" },
  project: { color: "#3b82f6", label: "Project Memory" },
  code: { color: "#06b6d4", label: "Code Patterns" },
  api: { color: "#10b981", label: "API Keys" },
  knowledge: { color: "#f59e0b", label: "Knowledge Base" },
  workflow: { color: "#ec4899", label: "Workflows" },
};

export function MemoryVisualization() {
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Generate particles once on mount
  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      width: Math.random() * 2 + 1,
      height: Math.random() * 2 + 1,
      opacity: Math.random() * 0.3 + 0.1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      xMove: Math.random() * 100 - 50,
      duration: 15 + Math.random() * 15,
      delay: Math.random() * 10,
    }));
    setParticles(newParticles);
  }, []);

  // Generate nodes and connections
  useEffect(() => {
    const types = Object.keys(memoryTypes) as Array<keyof typeof memoryTypes>;
    const newNodes: MemoryNode[] = [];
    const newConnections: Connection[] = [];

    // Create a more spread out layout using full viewport
    const centerX = 50;
    const centerY = 50;

    // Generate main nodes
    types.forEach((type, index) => {
      const angle = (index / types.length) * Math.PI * 2;
      const radius = 30 + Math.random() * 10;
      const node: MemoryNode = {
        id: `main-${type}`,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        z: Math.random() * 0.5 + 0.5,
        type,
        label: memoryTypes[type].label,
        color: memoryTypes[type].color,
        size: 8 + Math.random() * 4,
        pulseDelay: Math.random() * 2,
        floatOffset: Math.random() * Math.PI * 2,
        floatDuration: 20 + Math.random() * 10,
      };
      newNodes.push(node);

      // Add satellite nodes
      const satelliteCount = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < satelliteCount; j++) {
        const satelliteAngle = (j / satelliteCount) * Math.PI * 2;
        const satelliteRadius = 8 + Math.random() * 4;
        const satellite: MemoryNode = {
          id: `${type}-satellite-${j}`,
          x: node.x + Math.cos(satelliteAngle) * satelliteRadius,
          y: node.y + Math.sin(satelliteAngle) * satelliteRadius,
          z: Math.random() * 0.3,
          type,
          label: "",
          color: memoryTypes[type].color,
          size: 3 + Math.random() * 2,
          pulseDelay: Math.random() * 2,
          floatOffset: Math.random() * Math.PI * 2,
          floatDuration: 15 + Math.random() * 10,
        };
        newNodes.push(satellite);

        // Connect satellite to main node
        newConnections.push({
          id: `${node.id}-${satellite.id}`,
          source: node.id,
          target: satellite.id,
          strength: 0.3 + Math.random() * 0.2,
        });
      }
    });

    // Create more cross-connections between main nodes
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        // Always create connections between adjacent nodes
        newConnections.push({
          id: `main-${types[i]}-main-${types[j]}`,
          source: `main-${types[i]}`,
          target: `main-${types[j]}`,
          strength: 0.1 + Math.random() * 0.2,
          particles: Math.random() > 0.3, // 70% chance of particles
        });
      }
    }

    // Add some satellite-to-satellite connections
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        const node1 = newNodes[i];
        const node2 = newNodes[j];
        if (node1.id.includes('satellite') && node2.id.includes('satellite')) {
          const distance = Math.sqrt(
            Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2)
          );
          if (distance < 15 && Math.random() > 0.6) {
            newConnections.push({
              id: `${node1.id}-${node2.id}`,
              source: node1.id,
              target: node2.id,
              strength: 0.05 + Math.random() * 0.1,
              particles: Math.random() > 0.5,
            });
          }
        }
      }
    }

    setNodes(newNodes);
    setConnections(newConnections);
  }, []);

  // Only activate connections on hover, no random activations

  // Clean up animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-blue-900/10" />
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-900/5 via-transparent to-pink-900/5" />
        {/* Outer edge brightness */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-white/[0.02]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(139,92,246,0.05)_90%,rgba(139,92,246,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,transparent_0%,transparent_40%,rgba(59,130,246,0.06)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,transparent_0%,transparent_40%,rgba(6,182,212,0.06)_100%)]" />
      </div>

      {/* Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0.4)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {connections.map((connection) => {
          const sourceNode = nodes.find((n) => n.id === connection.source);
          const targetNode = nodes.find((n) => n.id === connection.target);
          if (!sourceNode || !targetNode) return null;

          const isActive = activeConnections.has(connection.id);

          return (
            <g key={connection.id}>
              {/* Base connection line - always visible */}
              <line
                x1={`${sourceNode.x}%`}
                y1={`${sourceNode.y}%`}
                x2={`${targetNode.x}%`}
                y2={`${targetNode.y}%`}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="0.5"
              />
              {/* Active glow line */}
              {isActive && (
                <motion.line
                  x1={`${sourceNode.x}%`}
                  y1={`${sourceNode.y}%`}
                  x2={`${targetNode.x}%`}
                  y2={`${targetNode.y}%`}
                  stroke="url(#connectionGradient)"
                  strokeWidth="1.5"
                  filter="url(#glow)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              {/* Shooting star particles - always visible if connection has particles */}
              {connection.particles && (
                <>
                  <motion.circle
                    r={isActive ? "3" : "2"}
                    fill={isActive ? "rgba(139, 92, 246, 1)" : "rgba(139, 92, 246, 0.6)"}
                    filter={isActive ? "url(#glow)" : undefined}
                  >
                    <animateMotion
                      dur="3s"
                      repeatCount="indefinite"
                      path={`M ${sourceNode.x},${sourceNode.y} L ${targetNode.x},${targetNode.y}`}
                    />
                    <animate
                      attributeName="opacity"
                      values={isActive ? "0;1;1;0" : "0;0.4;0.4;0"}
                      dur="3s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="r"
                      values={isActive ? "2;3;3;1" : "1;2;2;0.5"}
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </motion.circle>
                  {/* Second particle with delay */}
                  <motion.circle
                    r={isActive ? "2" : "1.5"}
                    fill={isActive ? "rgba(59, 130, 246, 1)" : "rgba(59, 130, 246, 0.5)"}
                    filter={isActive ? "url(#glow)" : undefined}
                  >
                    <animateMotion
                      dur="3s"
                      begin="1s"
                      repeatCount="indefinite"
                      path={`M ${sourceNode.x},${sourceNode.y} L ${targetNode.x},${targetNode.y}`}
                    />
                    <animate
                      attributeName="opacity"
                      values={isActive ? "0;0.8;0.8;0" : "0;0.3;0.3;0"}
                      begin="1s"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </motion.circle>
                  {/* Third particle with more delay */}
                  <motion.circle
                    r={isActive ? "1.5" : "1"}
                    fill={isActive ? "rgba(6, 182, 212, 1)" : "rgba(6, 182, 212, 0.4)"}
                    filter={isActive ? "url(#glow)" : undefined}
                  >
                    <animateMotion
                      dur="3s"
                      begin="2s"
                      repeatCount="indefinite"
                      path={`M ${sourceNode.x},${sourceNode.y} L ${targetNode.x},${targetNode.y}`}
                    />
                    <animate
                      attributeName="opacity"
                      values={isActive ? "0;0.6;0.6;0" : "0;0.2;0.2;0"}
                      begin="2s"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </motion.circle>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => {
        const isHighlighted = highlightedNode === node.id;
        const isConnected = connections.some(
          (c) =>
            activeConnections.has(c.id) &&
            (c.source === node.id || c.target === node.id)
        );

        return (
          <motion.div
            key={node.id}
            className="absolute rounded-full"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: isHighlighted ? 20 : 10
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: isHighlighted ? 1.08 : (isConnected ? 1.02 : 1),
              opacity: 1,
              y: [0, -3, 0, 3, 0], // Gentler breathing motion
              x: [0, -1, 0, 1, 0], // Subtle sway
            }}
            transition={{
              scale: {
                type: "spring",
                stiffness: 300,
                damping: 20,
              },
              opacity: { duration: 0.5 },
              y: {
                duration: 4 + node.pulseDelay,
                repeat: Infinity,
                ease: [0.4, 0, 0.6, 1], // Apple-style ease
                repeatType: "loop"
              },
              x: {
                duration: 6 + node.pulseDelay * 1.5,
                repeat: Infinity,
                ease: [0.4, 0, 0.6, 1],
                repeatType: "loop"
              }
            }}
            onHoverStart={() => {
              if (node.id.startsWith("main-")) {
                setHighlightedNode(node.id);
                // Activate connections for this node
                const nodeConnections = connections.filter(
                  c => c.source === node.id || c.target === node.id
                );
                setActiveConnections(new Set(nodeConnections.map(c => c.id)));
              }
            }}
            onHoverEnd={() => {
              setHighlightedNode(null);
              setActiveConnections(new Set());
            }}
          >
              <div
                className="relative"
                style={{
                  width: node.size * (isHighlighted ? 1.5 : 1),
                  height: node.size * (isHighlighted ? 1.5 : 1),
                }}
              >
                {/* Core */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${node.color}ee, ${node.color}66)`,
                    boxShadow: `0 0 ${isHighlighted ? 30 : 10}px ${node.color}44`,
                  }}
                />

                {/* Pulse rings */}
                {(isHighlighted || isConnected) && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: `1px solid ${node.color}44`,
                      }}
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{
                        scale: 2,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: node.pulseDelay,
                      }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: `1px solid ${node.color}33`,
                      }}
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{
                        scale: 2.5,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: node.pulseDelay + 0.5,
                      }}
                    />
                  </>
                )}
              </div>
          </motion.div>
        );
      })}

      {/* Ambient particles */}
      {particles.map((particle) => (
        <motion.div
          key={`particle-${particle.id}`}
          className="absolute rounded-full"
          style={{
            width: particle.width,
            height: particle.height,
            backgroundColor: `rgba(255, 255, 255, ${particle.opacity})`,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            filter: 'blur(0.5px)'
          }}
          animate={{
            y: -200,
            opacity: [0, 0.1, 0.1, 0],
          }}
          transition={{
            duration: particle.duration * 3,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.1, 0.9, 1]
          }}
        />
      ))}

      {/* Central glow effect */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%)',
          filter: 'blur(40px)'
        }}
      />
    </div>
  );
}