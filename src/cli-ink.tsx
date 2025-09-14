#!/usr/bin/env node

import React, { useState, useEffect } from "react";
import { render, Text, Box, useInput, useApp, useStdin } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import { createClient } from "redis";
import chalk from "chalk";

// Types
interface Memory {
  id: string;
  memory: string;
  metadata?: Record<string, any>;
  created_at: string;
  user_id: string;
  augmented?: boolean;
  tags?: string[];
}

interface ExaResult {
  title: string;
  url: string;
  snippet: string;
}

// Main App Component
const App = () => {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"list" | "detail" | "search">("list");
  const [exaResults, setExaResults] = useState<ExaResult[]>([]);

  // Load memories on startup
  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const client = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
      });

      await client.connect();
      const keys = await client.keys("memory:*");
      const loadedMemories: Memory[] = [];

      for (const key of keys) {
        if (key.includes(":keywords:") || key.includes(":access:")) continue;

        try {
          const data = await client.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            loadedMemories.push({
              id: key.replace("memory:", ""),
              memory: parsed.content || parsed.memory || "",
              metadata: parsed.metadata || {},
              created_at: parsed.created_at || new Date().toISOString(),
              user_id: parsed.user_id || "default",
              augmented: parsed.metadata?.augmented || false,
              tags: parsed.metadata?.tags || [],
            });
          }
        } catch (err) {
          // Skip invalid entries
        }
      }

      await client.disconnect();
      setMemories(loadedMemories);
      setLoading(false);
    } catch (err) {
      setError(`Failed to load: ${err}`);
      setLoading(false);
    }
  };

  const searchExa = async () => {
    if (!memories[selectedIndex]) return;

    const query = memories[selectedIndex].memory.substring(0, 100);

    try {
      const response = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.EXA_API_KEY || "",
        },
        body: JSON.stringify({
          query,
          numResults: 3,
          useAutoprompt: true,
        }),
      });

      const data = (await response.json()) as any;
      const results =
        data.results?.map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.text?.substring(0, 150) || "",
        })) || [];

      setExaResults(results);
      setView("search");
    } catch (err) {
      setError(`Exa search failed: ${err}`);
    }
  };

  // Handle keyboard input (only if raw mode is supported)
  useInput(
    (input, key) => {
      if (input === "q") {
        exit();
      }

      if (view === "list") {
        if (key.downArrow || input === "j") {
          setSelectedIndex(Math.min(selectedIndex + 1, memories.length - 1));
        }
        if (key.upArrow || input === "k") {
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
        }
        if (key.return) {
          setView("detail");
        }
        if (input === "/") {
          setSearchMode(true);
        }
        if (input === "e") {
          searchExa();
        }
      }

      if (view === "detail" || view === "search") {
        if (key.escape || input === "b") {
          setView("list");
        }
      }

      if (input === "r") {
        setLoading(true);
        loadMemories();
      }
    },
    { isActive: isRawModeSupported },
  );

  // Loading screen
  if (loading) {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={2}>
        <Gradient name="rainbow">
          <BigText text="r3call" font="chrome" />
        </Gradient>
        <Box marginTop={1}>
          <Text color="cyan">
            <Spinner type="dots" /> Loading memories...
          </Text>
        </Box>
      </Box>
    );
  }

  // Error screen
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>
          ✗ Error: {error}
        </Text>
        <Text dimColor>Press 'q' to quit, 'r' to retry</Text>
      </Box>
    );
  }

  // Search mode input
  if (searchMode) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Search Memories:
        </Text>
        <Box marginTop={1}>
          <Text color="yellow">{"> "}</Text>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={(value) => {
              // Filter memories
              const filtered = memories.filter((m) =>
                m.memory.toLowerCase().includes(value.toLowerCase()),
              );
              setMemories(filtered);
              setSearchMode(false);
              setSearchQuery("");
            }}
          />
        </Box>
      </Box>
    );
  }

  // Detail view
  if (view === "detail" && memories[selectedIndex]) {
    const memory = memories[selectedIndex];
    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text bold color="cyan">
            Memory Details
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text wrap="wrap">{memory.memory}</Text>

          <Box marginTop={2} flexDirection="column">
            <Text dimColor>ID: {memory.id}</Text>
            <Text dimColor>
              Created: {new Date(memory.created_at).toLocaleString()}
            </Text>
            {memory.augmented && <Text color="green">✓ Augmented</Text>}
            {memory.tags && memory.tags.length > 0 && (
              <Text>
                Tags: {memory.tags.map((t) => chalk.yellow(`#${t}`)).join(" ")}
              </Text>
            )}
          </Box>
        </Box>

        <Box marginTop={2}>
          <Text dimColor>[ESC] Back [E] Enrich with Exa</Text>
        </Box>
      </Box>
    );
  }

  // Search results view
  if (view === "search") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="round" borderColor="magenta" paddingX={1}>
          <Text bold color="magenta">
            Exa Search Results
          </Text>
        </Box>

        {exaResults.map((result, i) => (
          <Box key={i} marginTop={1} flexDirection="column">
            <Text color="cyan" bold>
              [{i + 1}] {result.title}
            </Text>
            <Text dimColor wrap="wrap">
              {result.snippet}
            </Text>
            <Text color="blue" underline>
              {result.url}
            </Text>
          </Box>
        ))}

        <Box marginTop={2}>
          <Text dimColor>[ESC] Back [1-3] Select to augment</Text>
        </Box>
      </Box>
    );
  }

  // Main list view
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
        <Gradient name="rainbow">
          <Text bold>r3call Memory Manager</Text>
        </Gradient>
        <Text> | </Text>
        <Text color="green">{memories.length} memories</Text>
        <Text> | </Text>
        <Text color="blue">
          {memories.filter((m) => m.augmented).length} augmented
        </Text>
      </Box>

      {/* Memory List */}
      <Box flexDirection="column" height={15}>
        {memories
          .slice(
            Math.max(0, selectedIndex - 7),
            Math.min(memories.length, selectedIndex + 8),
          )
          .map((memory, i) => {
            const actualIndex = i + Math.max(0, selectedIndex - 7);
            const isSelected = actualIndex === selectedIndex;

            return (
              <Box key={memory.id}>
                <Text color={isSelected ? "greenBright" : "white"}>
                  {isSelected ? "▶ " : "  "}
                  {memory.memory.substring(0, 60)}...
                  {memory.augmented && chalk.blue(" ⚡")}
                </Text>
              </Box>
            );
          })}
      </Box>

      {/* Status bar */}
      <Box marginTop={1} borderStyle="single" borderColor="dim" paddingX={1}>
        <Text dimColor>
          [↑↓/jk] Navigate [Enter] View [/] Search [e] Exa [r] Refresh [q] Quit
        </Text>
      </Box>
    </Box>
  );
};

// Run the app
render(<App />);
