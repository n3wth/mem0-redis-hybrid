import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp, Newline } from "ink";
import TextInput from "ink-text-input";
import { MemoryEngine } from "./core/memory-engine.js";

// Simple spinner component
const SimpleSpinner: React.FC = () => {
  const [frame, setFrame] = useState(0);
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return <Text color="cyan">{frames[frame]}</Text>;
};

interface Memory {
  id: string;
  content: string;
  metadata?: any;
  created_at?: string;
  similarity?: number;
  score?: number;
}

interface AppProps {
  memoryEngine?: MemoryEngine;
}

const MemoryManagerLocal: React.FC<AppProps> = ({ memoryEngine }) => {
  const [mode, setMode] = useState<
    "menu" | "search" | "add" | "view" | "delete"
  >("menu");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMemory, setNewMemory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { exit } = useApp();

  // Initialize memory engine if not provided
  const [engine] = useState(() => memoryEngine || new MemoryEngine());

  // Load all memories on start
  useEffect(() => {
    if (mode === "view" || mode === "delete") {
      loadMemories();
    }
  }, [mode]);

  const loadMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simply get all memories directly
      const allMemories = await (engine as any).getAllMemories(100);

      if (allMemories && Array.isArray(allMemories) && allMemories.length > 0) {
        setMemories(allMemories);
      } else {
        // Fallback to getRecentMemories if getAllMemories doesn't exist or returns empty
        const recent = await engine.getRecentMemories(100);
        setMemories(recent || []);
      }
    } catch (err: any) {
      setError(err.message);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  const searchMemories = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // Use the memory engine's search
      const results = await engine.searchMemories(searchQuery, {
        fuzzy: true,
        limit: 20,
      });

      // Transform results to match our interface
      const transformedResults = results.map((r: any) => ({
        id: r.id,
        content: r.content || r.memory,
        metadata: r.metadata,
        created_at: r.created_at,
        similarity: r.score || r.similarity,
      }));

      setMemories(transformedResults);
      setMessage(`Found ${transformedResults.length} memories`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addMemory = async () => {
    if (!newMemory.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // Add memory directly to the engine
      await engine.addMemory({
        content: newMemory,
        user_id: process.env["R3CALL_USER_ID"] || "default",
        tags: [],
        metadata: {
          source: "cli-ui",
          created_via: "interactive",
        },
      });

      setMessage("Memory added successfully!");
      setNewMemory("");
      setTimeout(() => setMode("menu"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Delete memory from the engine
      await engine.deleteMemory(memoryId);
      setMessage("Memory deleted successfully!");
      loadMemories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === "c")) {
      exit();
    }

    if (mode === "menu") {
      switch (input) {
        case "s":
          setMode("search");
          break;
        case "a":
          setMode("add");
          break;
        case "v":
          setMode("view");
          break;
        case "d":
          setMode("delete");
          setMode("view"); // Load view first, then allow deletion
          break;
        case "q":
          exit();
          break;
      }
    } else if (mode === "view" || mode === "delete") {
      if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        setSelectedIndex(Math.min(memories.length - 1, selectedIndex + 1));
      } else if (key.return && mode === "delete" && memories[selectedIndex]) {
        deleteMemory(memories[selectedIndex].id);
      } else if (input === "b") {
        setMode("menu");
        setSelectedIndex(0);
      } else if (input === "d" && mode === "view") {
        setMode("delete");
      }
    } else if ((mode === "search" || mode === "add") && input === "\x1B") {
      // ESC key
      setMode("menu");
      setSearchQuery("");
      setNewMemory("");
    }
  });

  const renderMenu = () => (
    <Box flexDirection="column">
      <Text bold color="cyan">
        R3CALL Memory Manager (Local)
      </Text>
      <Text color="gray">─────────────────────────────</Text>
      <Text>Choose an option:</Text>
      <Newline />
      <Text color="green">[s]</Text>
      <Text> Search memories</Text>
      <Newline />
      <Text color="green">[a]</Text>
      <Text> Add new memory</Text>
      <Newline />
      <Text color="green">[v]</Text>
      <Text> View all memories</Text>
      <Newline />
      <Text color="green">[d]</Text>
      <Text> Delete memory</Text>
      <Newline />
      <Text color="green">[q]</Text>
      <Text> Quit</Text>
      <Newline />
      <Text color="gray" dimColor>
        Connected to local memory engine
      </Text>
    </Box>
  );

  const renderSearch = () => (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Search Memories
      </Text>
      <Text color="gray">─────────────────────</Text>
      <Box>
        <Text>Query: </Text>
        <TextInput
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={searchMemories}
          placeholder="Enter search term..."
        />
      </Box>
      <Newline />
      {loading && (
        <Box>
          <SimpleSpinner />
          <Text> Searching...</Text>
        </Box>
      )}
      {memories.length > 0 && (
        <Box flexDirection="column">
          <Text bold>Results:</Text>
          {memories.map((memory, idx) => (
            <Box key={memory.id} marginY={1}>
              <Text color={idx === selectedIndex ? "cyan" : "white"}>
                {memory.similarity
                  ? `[${(memory.similarity * 100).toFixed(1)}%] `
                  : ""}
                {(memory.content || "").substring(0, 80)}...
              </Text>
            </Box>
          ))}
        </Box>
      )}
      <Newline />
      <Text color="gray">Press ESC to go back</Text>
    </Box>
  );

  const renderAdd = () => (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Add New Memory
      </Text>
      <Text color="gray">─────────────────────</Text>
      <Box>
        <Text>Content: </Text>
        <TextInput
          value={newMemory}
          onChange={setNewMemory}
          onSubmit={addMemory}
          placeholder="Enter memory content..."
        />
      </Box>
      {loading && (
        <Box>
          <SimpleSpinner />
          <Text> Adding memory...</Text>
        </Box>
      )}
      <Newline />
      <Text color="gray">Press Enter to save, ESC to cancel</Text>
    </Box>
  );

  const renderView = () => (
    <Box flexDirection="column">
      <Text bold color="cyan">
        All Memories
      </Text>
      <Text color="gray">─────────────────────</Text>
      {loading && (
        <Box>
          <SimpleSpinner />
          <Text> Loading memories...</Text>
        </Box>
      )}
      {memories.length === 0 && !loading && (
        <Text color="yellow">No memories found</Text>
      )}
      {memories.length > 0 && (
        <Box flexDirection="column">
          <Text color="gray">Use ↑/↓ to navigate, [d] to delete mode</Text>
          <Text color="gray">Total: {memories.length} memories</Text>
          <Newline />
          <Box flexDirection="column">
            {memories.map((memory, idx) => (
              <Text
                key={memory.id}
                color={idx === selectedIndex ? "cyan" : "white"}
              >
                {idx === selectedIndex ? "▶ " : "  "}
                {(memory.content || "").substring(0, 60)}...
              </Text>
            ))}
          </Box>
        </Box>
      )}
      <Newline />
      <Text color="gray">Press [b] to go back, [d] for delete mode</Text>
    </Box>
  );

  const renderDelete = () => (
    <Box flexDirection="column">
      <Text bold color="red">
        Delete Memory
      </Text>
      <Text color="gray">─────────────────────</Text>
      {loading && (
        <Box>
          <SimpleSpinner />
          <Text> Processing...</Text>
        </Box>
      )}
      {memories.length === 0 && !loading && (
        <Text color="yellow">No memories to delete</Text>
      )}
      {memories.length > 0 && (
        <Box flexDirection="column">
          <Text color="yellow">⚠️ Select a memory to delete:</Text>
          <Text color="gray">Use ↑/↓ to navigate, Enter to delete</Text>
          <Text color="gray">Total: {memories.length} memories</Text>
          <Newline />
          <Box flexDirection="column">
            {memories.map((memory, idx) => (
              <Text
                key={memory.id}
                color={idx === selectedIndex ? "red" : "white"}
              >
                {idx === selectedIndex ? "▶ " : "  "}
                {(memory.content || "").substring(0, 60)}...
              </Text>
            ))}
          </Box>
        </Box>
      )}
      <Newline />
      <Text color="gray">Press [b] to go back</Text>
    </Box>
  );

  return (
    <Box flexDirection="column" padding={1}>
      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}
      {message && (
        <Box marginBottom={1}>
          <Text color="green">✓ {message}</Text>
        </Box>
      )}
      {mode === "menu" && renderMenu()}
      {mode === "search" && renderSearch()}
      {mode === "add" && renderAdd()}
      {mode === "view" && renderView()}
      {mode === "delete" && renderDelete()}
    </Box>
  );
};

export default function LocalMemoryUI() {
  // Initialize with local memory engine
  // This will use the same Redis/Mem0 configuration as the MCP server
  return <MemoryManagerLocal />;
}
