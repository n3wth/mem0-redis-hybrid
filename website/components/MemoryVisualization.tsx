"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useMemo } from "react";

interface MemoryNode {
  id: string;
  x: number;
  y: number;
  type: "work" | "personal" | "knowledge" | "project" | "context";
  label: string;
  size: number;
  connections: string[];
  color: string;
  glow: string;
  pulseDelay: number;
  velocity: { x: number; y: number };
  importance: number;
}

interface Connection {
  from: string;
  to: string;
  strength: number;
  active: boolean;
}

const memoryTypes = {
  work: {
    color: "rgb(59, 130, 246)", // blue
    gradient: "from-blue-400 to-blue-600",
    glow: "rgba(59, 130, 246, 0.6)",
    shadowColor: "rgba(59, 130, 246, 0.3)",
    labels: ["Dashboard setup", "API endpoints", "TypeScript patterns", "Team context", "Sprint planning", "Code reviews"]
  },
  personal: {
    color: "rgb(168, 85, 247)", // purple
    gradient: "from-purple-400 to-purple-600",
    glow: "rgba(168, 85, 247, 0.6)",
    shadowColor: "rgba(168, 85, 247, 0.3)",
    labels: ["Family events", "Emma's robotics", "Josh's dinosaurs", "Weekend plans", "Health reminders", "Personal goals"]
  },
  knowledge: {
    color: "rgb(16, 185, 129)", // emerald
    gradient: "from-emerald-400 to-emerald-600",
    glow: "rgba(16, 185, 129, 0.6)",
    shadowColor: "rgba(16, 185, 129, 0.3)",
    labels: ["React hooks", "Best practices", "Documentation", "Library APIs", "Design patterns", "Performance tips"]
  },
  project: {
    color: "rgb(251, 146, 60)", // orange
    gradient: "from-orange-400 to-orange-600",
    glow: "rgba(251, 146, 60, 0.6)",
    shadowColor: "rgba(251, 146, 60, 0.3)",
    labels: ["Feature specs", "Deadlines", "Dependencies", "Architecture", "Requirements", "Milestones"]
  },
  context: {
    color: "rgb(236, 72, 153)", // pink
    gradient: "from-pink-400 to-pink-600",
    glow: "rgba(236, 72, 153, 0.6)",
    shadowColor: "rgba(236, 72, 153, 0.3)",
    labels: ["Session history", "Preferences", "Past decisions", "User patterns", "Conversations", "Learning progress"]
  }
};

function DataStream({ from, to, color }: { from: { x: number; y: number }, to: { x: number; y: number }, color: string }) {
  return (
    <motion.circle
      r="3"
      fill={color}
      filter="url(#glow)"
      initial={{
        cx: from.x,
        cy: from.y,
        opacity: 0
      }}
      animate={{
        cx: to.x,
        cy: to.y,
        opacity: [0, 1, 1, 0]
      }}
      transition={{
        duration: 1.5,
        ease: "linear",
        repeat: Infinity,
        repeatDelay: Math.random() * 2
      }}
    >
      <animate
        attributeName="r"
        values="2;4;2"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </motion.circle>
  );
}

export function MemoryVisualization() {
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());
  const [showcaseNode, setShowcaseNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // Generate nodes and connections
  useEffect(() => {
    const types = Object.keys(memoryTypes) as Array<keyof typeof memoryTypes>;
    const newNodes: MemoryNode[] = [];
    const newConnections: Connection[] = [];

    // Create a more spread out layout using full viewport
    const centerX = 50;
    const centerY = 50;

    // Create nodes for each type with better distribution
    types.forEach((type, typeIndex) => {
      // Create 5-7 nodes per type for richer visualization
      const nodeCount = Math.floor(Math.random() * 3) + 5;

      for (let i = 0; i < nodeCount; i++) {
        const importance = Math.random() * 0.5 + 0.5;

        // Mix of distribution strategies for better coverage
        let x, y;

        if (i === 0) {
          // Place first node of each type in corners for guaranteed corner coverage
          const corners = [
            { x: 15, y: 15 }, // top-left
            { x: 85, y: 15 }, // top-right
            { x: 15, y: 85 }, // bottom-left
            { x: 85, y: 85 }, // bottom-right
            { x: 50, y: 10 }, // top-center
          ];
          const corner = corners[typeIndex % corners.length];
          x = corner.x + (Math.random() - 0.5) * 10;
          y = corner.y + (Math.random() - 0.5) * 10;
        } else if (i === 1 || i === 2) {
          // Place some nodes along the edges
          const edge = Math.random();
          if (edge < 0.25) {
            // Top edge
            x = Math.random() * 70 + 15;
            y = Math.random() * 15 + 5;
          } else if (edge < 0.5) {
            // Bottom edge
            x = Math.random() * 70 + 15;
            y = Math.random() * 15 + 80;
          } else if (edge < 0.75) {
            // Left edge
            x = Math.random() * 15 + 5;
            y = Math.random() * 50 + 25;
          } else {
            // Right edge
            x = Math.random() * 15 + 80;
            y = Math.random() * 50 + 25;
          }
        } else {
          // Distribute remaining nodes in a ring pattern but wider
          const angle = (typeIndex * 2 * Math.PI) / types.length + (i * Math.PI / 4);
          const radius = 30 + Math.random() * 20; // Wider radius range
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;

          // Push nodes away from center text area
          if (Math.abs(x - 50) < 25 && Math.abs(y - 50) < 20) {
            // If too close to center, push outward
            x = x < 50 ? x - 15 : x + 15;
            y = y < 50 ? y - 10 : y + 10;
          }
        }

        // Ensure nodes stay within bounds
        x = Math.max(5, Math.min(95, x));
        y = Math.max(5, Math.min(95, y));

        const node: MemoryNode = {
          id: `${type}-${i}`,
          x,
          y,
          type,
          label: memoryTypes[type].labels[i % memoryTypes[type].labels.length],
          size: 3 + importance * 5,
          connections: [],
          color: memoryTypes[type].color,
          glow: memoryTypes[type].glow,
          pulseDelay: Math.random() * 3,
          velocity: {
            x: (Math.random() - 0.5) * 0.1,
            y: (Math.random() - 0.5) * 0.1
          },
          importance
        };
        newNodes.push(node);
      }
    });

    // Create intelligent connections based on node proximity and type relationships
    const typeRelationships = {
      work: ['project', 'knowledge', 'context'],
      personal: ['context', 'work'],
      knowledge: ['work', 'project', 'context'],
      project: ['work', 'knowledge', 'context'],
      context: ['work', 'personal', 'knowledge', 'project']
    };

    newNodes.forEach((node) => {
      const relatedTypes = typeRelationships[node.type];
      const potentialConnections = newNodes.filter(n =>
        n.id !== node.id &&
        (relatedTypes.includes(n.type) || n.type === node.type) &&
        !node.connections.includes(n.id)
      );

      // Create 2-4 connections per node
      const connectionCount = Math.min(
        Math.floor(Math.random() * 3) + 2,
        potentialConnections.length
      );

      // Sort by distance and prefer closer nodes
      potentialConnections.sort((a, b) => {
        const distA = Math.hypot(a.x - node.x, a.y - node.y);
        const distB = Math.hypot(b.x - node.x, b.y - node.y);
        return distA - distB;
      });

      for (let i = 0; i < connectionCount; i++) {
        const target = potentialConnections[i];
        if (target && !node.connections.includes(target.id)) {
          node.connections.push(target.id);

          // Check if connection already exists in reverse
          const existingConnection = newConnections.find(
            c => (c.from === target.id && c.to === node.id)
          );

          if (!existingConnection) {
            newConnections.push({
              from: node.id,
              to: target.id,
              strength: 0.3 + Math.random() * 0.5 + node.importance * 0.2,
              active: Math.random() > 0.7
            });
          }
        }
      }
    });

    setNodes(newNodes);
    setConnections(newConnections);

    // Animate active connections - much less frequent
    const connectionInterval = setInterval(() => {
      setActiveConnections(prev => {
        const next = new Set<string>();
        newConnections.forEach(conn => {
          if (Math.random() > 0.95) { // Much less frequent
            next.add(`${conn.from}-${conn.to}`);
          }
        });
        return next;
      });
    }, 3000); // Slower interval

    // Showcase nodes in safe areas only - continuous rotation
    let showcaseIndex = 0;
    const showcaseInterval = setInterval(() => {
      // Only showcase nodes in the corners/edges where there's no text
      const safeNodes = newNodes.filter(node => {
        // Top-left and top-right corners (above the hero text)
        const inTopCorners = node.y < 25 && (node.x < 20 || node.x > 80);

        // Bottom-left and bottom-right corners (below the stats)
        const inBottomCorners = node.y > 75 && (node.x < 20 || node.x > 80);

        // Far left and far right edges (beside the content)
        const onSideEdges = (node.x < 15 || node.x > 85) && node.y > 30 && node.y < 70;

        return inTopCorners || inBottomCorners || onSideEdges;
      });

      if (safeNodes.length > 0) {
        // Show next label (overlapping with fade)
        const nodeToShowcase = safeNodes[showcaseIndex % safeNodes.length];
        setShowcaseNode(nodeToShowcase.id);

        showcaseIndex = (showcaseIndex + 1) % safeNodes.length;
      }
    }, 2500); // Continuous rotation every 2.5 seconds

    return () => {
      clearInterval(connectionInterval);
      clearInterval(showcaseInterval);
    };
  }, []);

  // Calculate node positions for smooth floating animation
  const animatedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      animatedX: node.x + Math.sin(Date.now() / 3000 + node.pulseDelay) * 2,
      animatedY: node.y + Math.cos(Date.now() / 3000 + node.pulseDelay) * 2
    }));
  }, [nodes]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
    >
      {/* SVG for connections and effects */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Gradient definitions */}
          {Object.entries(memoryTypes).map(([type, config]) => (
            <linearGradient key={`gradient-${type}`} id={`gradient-${type}`}>
              <stop offset="0%" stopColor={config.color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={config.color} stopOpacity={0.2} />
            </linearGradient>
          ))}

          {/* Connection gradients */}
          {connections.map((conn) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            return (
              <linearGradient
                key={`conn-gradient-${conn.from}-${conn.to}`}
                id={`conn-gradient-${conn.from}-${conn.to}`}
                x1={`${fromNode.x}%`}
                y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`}
                y2={`${toNode.y}%`}
              >
                <stop offset="0%" stopColor={fromNode.color} stopOpacity={0.8} />
                <stop offset="50%" stopColor={fromNode.color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={toNode.color} stopOpacity={0.8} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Render connections */}
        {connections.map((conn) => {
          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          if (!fromNode || !toNode) return null;

          const isHighlighted = hoveredNode === conn.from || hoveredNode === conn.to;
          const isActive = activeConnections.has(`${conn.from}-${conn.to}`);

          return (
            <g key={`${conn.from}-${conn.to}`}>
              {/* Connection line */}
              <motion.line
                x1={`${fromNode.x}%`}
                y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`}
                y2={`${toNode.y}%`}
                stroke={`url(#conn-gradient-${conn.from}-${conn.to})`}
                strokeWidth={isHighlighted ? 2 : 1}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: isHighlighted ? 0.9 : (isActive ? 0.8 : conn.strength * 0.5),
                  strokeWidth: isActive ? 2.5 : 1.5
                }}
                transition={{
                  pathLength: { duration: 2, ease: "easeInOut" },
                  opacity: { duration: 0.5 },
                  strokeWidth: { duration: 0.3 }
                }}
              />

              {/* Data flow animation */}
              {isActive && (
                <DataStream
                  from={{ x: fromNode.x * containerRef.current?.clientWidth! / 100 || 0,
                         y: fromNode.y * containerRef.current?.clientHeight! / 100 || 0 }}
                  to={{ x: toNode.x * containerRef.current?.clientWidth! / 100 || 0,
                       y: toNode.y * containerRef.current?.clientHeight! / 100 || 0 }}
                  color={fromNode.color}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Memory nodes */}
      <AnimatePresence>
        {nodes.map((node) => {
          const isHighlighted = hoveredNode === node.id;
          const connectedNodes = new Set(node.connections);
          const isConnected = hoveredNode && connectedNodes.has(hoveredNode);

          return (
            <motion.div
              key={node.id}
              className="absolute cursor-pointer"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isHighlighted ? 20 : 10
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: isHighlighted ? 1.3 : (showcaseNode === node.id ? 1.15 : (isConnected ? 1.1 : 1)),
                opacity: 1,
                y: [0, -5, 0], // Gentle floating
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                scale: {
                  duration: 0.4,
                  ease: "easeOut"
                },
                opacity: {
                  duration: 0.8,
                  ease: "easeIn",
                  delay: node.pulseDelay * 0.1
                },
                y: {
                  duration: 4 + node.pulseDelay,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Pulse ring - subtle and smooth */}
              <motion.div
                className="absolute rounded-full border"
                style={{
                  borderColor: node.color + '20',
                  width: node.size * 3,
                  height: node.size * 3,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{
                  scale: [1, 1.5, 1.8],
                  opacity: [0.3, 0.1, 0],
                }}
                transition={{
                  duration: 4,
                  delay: node.pulseDelay,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 2
                }}
              />

              {/* Core node - simple clean circle */}
              <motion.div
                className="relative rounded-full"
                style={{
                  backgroundColor: node.color + '60',
                  width: node.size * 2,
                  height: node.size * 2,
                  boxShadow: `0 0 ${node.size * 3}px ${node.glow}`,
                }}
                whileHover={{
                  scale: 1.2,
                  backgroundColor: node.color + '80',
                  boxShadow: `0 0 ${node.size * 5}px ${node.glow}`,
                }}
              />

              {/* Label with enhanced styling - on hover or showcase */}
              <AnimatePresence>
                {(isHighlighted || showcaseNode === node.id) && (
                  <motion.div
                    className="absolute whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-md pointer-events-none z-50"
                    style={{
                      // Position based on node location to avoid overlaps
                      ...(node.y < 30 ? {
                        // Top nodes - label below
                        top: '120%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                      } : node.y > 70 ? {
                        // Bottom nodes - label above
                        bottom: '120%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                      } : node.x < 30 ? {
                        // Left nodes - label to the right
                        top: '50%',
                        left: '120%',
                        transform: 'translateY(-50%)',
                      } : node.x > 70 ? {
                        // Right nodes - label to the left
                        top: '50%',
                        right: '120%',
                        transform: 'translateY(-50%)',
                      } : {
                        // Center nodes - label above
                        bottom: '120%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }),
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      border: `1px solid ${node.color}40`,
                      color: node.color,
                      boxShadow: `0 2px 8px rgba(0, 0, 0, 0.5), 0 0 12px ${node.glow}40`
                    }}
                    initial={{ opacity: 0, y: -5, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                    transition={{
                      duration: 0.8,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: node.color,
                          opacity: isHighlighted ? 1 : 0.7
                        }}
                      />
                      <span className="text-[11px]">{node.label}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Ambient particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            backgroundColor: `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            filter: 'blur(0.5px)'
          }}
          animate={{
            y: [0, -200, 0],
            x: [0, Math.random() * 100 - 50, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 15 + Math.random() * 15,
            delay: Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
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