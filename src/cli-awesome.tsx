#!/usr/bin/env node

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { render, Text, Box, useInput, useApp, useStdin } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { MemoryEngine } from './core/memory-engine.js';
import chalk from 'chalk';
import figures from 'figures';

// Types
interface Memory {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  project?: string;
  directory?: string;
  tags: string[];
  metadata: {
    executable?: boolean;
    dangerous?: boolean;
    requires_sudo?: boolean;
    category?: string;
    last_used?: string;
    use_count?: number;
    [key: string]: any;
  };
}

interface AppState {
  memories: Memory[];
  selectedIndex: number;
  selectedMemory: Memory | null;
  searchQuery: string;
  searchResults: Memory[];
  loading: boolean;
  error: string | null;
  view: 'list' | 'search' | 'detail' | 'stats' | 'help';
  showCommandPalette: boolean;
  recentMemories: Memory[];
  popularMemories: Memory[];
  stats: {
    performance: any;
    cache: any;
    total: number;
  };
}

// Main App Component
const AwesomeMemoryManager: React.FC = () => {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();

  const [state, setState] = useState<AppState>({
    memories: [],
    selectedIndex: 0,
    selectedMemory: null,
    searchQuery: '',
    searchResults: [],
    loading: true,
    error: null,
    view: 'list',
    showCommandPalette: false,
    recentMemories: [],
    popularMemories: [],
    stats: {
      performance: {},
      cache: { hits: 0, misses: 0, hitRate: 0 },
      total: 0
    }
  });

  const [memoryEngine] = useState(() => new MemoryEngine());
  const [searchInput, setSearchInput] = useState('');
  const [commandInput, setCommandInput] = useState('');

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load initial data in parallel
        const [recent, popular] = await Promise.all([
          memoryEngine.getRecentMemories(20),
          memoryEngine.getPopularMemories(20)
        ]);

        setState(prev => ({
          ...prev,
          memories: recent.slice(0, 10), // Show most recent first
          recentMemories: recent,
          popularMemories: popular,
          selectedMemory: recent[0] || null,
          loading: false,
          stats: {
            ...prev.stats,
            total: recent.length + popular.length
          }
        }));

        // Update stats periodically
        setInterval(() => updateStats(), 5000);
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: `Failed to initialize: ${error}`
        }));
      }
    };

    loadData();
  }, [memoryEngine]);

  const updateStats = useCallback(async () => {
    const performance = memoryEngine.getPerformanceStats();
    const cache = memoryEngine.getCacheStats();

    setState(prev => ({
      ...prev,
      stats: {
        performance,
        cache,
        total: prev.memories.length
      }
    }));
  }, [memoryEngine]);

  // Search with instant results
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState(prev => ({
        ...prev,
        searchResults: [],
        view: 'list'
      }));
      return;
    }

    try {
      const results = await memoryEngine.searchMemories(query, {
        fuzzy: true,
        limit: 20
      });

      setState(prev => ({
        ...prev,
        searchResults: results,
        selectedIndex: 0,
        selectedMemory: results[0] || null,
        view: 'search'
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Search failed: ${error}`
      }));
    }
  }, [memoryEngine]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput) {
        performSearch(searchInput);
      }
    }, 100); // Super fast search

    return () => clearTimeout(timeoutId);
  }, [searchInput, performSearch]);

  const executeMemory = useCallback(async (memory: Memory) => {
    // Increment usage and track
    await memoryEngine.incrementUseCount(memory.id);

    // Copy to clipboard (simulate)
    setState(prev => ({
      ...prev,
      error: null
    }));

    // Show brief success message
    console.log(`✓ Copied: ${memory.content.substring(0, 50)}...`);
  }, [memoryEngine]);

  const navigateMemories = useCallback((direction: 'up' | 'down' | 'first' | 'last') => {
    setState(prev => {
      const currentList = prev.view === 'search' ? prev.searchResults : prev.memories;
      if (currentList.length === 0) return prev;

      let newIndex = prev.selectedIndex;

      switch (direction) {
        case 'up':
          newIndex = Math.max(0, prev.selectedIndex - 1);
          break;
        case 'down':
          newIndex = Math.min(currentList.length - 1, prev.selectedIndex + 1);
          break;
        case 'first':
          newIndex = 0;
          break;
        case 'last':
          newIndex = currentList.length - 1;
          break;
      }

      return {
        ...prev,
        selectedIndex: newIndex,
        selectedMemory: currentList[newIndex] || null
      };
    });
  }, []);

  // Keyboard shortcuts - only if raw mode is supported
  useInput((input, key) => {
    // Global shortcuts
    if (input === 'q' && !state.showCommandPalette) {
      exit();
    }

    if (key.ctrl && input === 'k') {
      setState(prev => ({
        ...prev,
        showCommandPalette: !prev.showCommandPalette
      }));
      return;
    }

    if (key.escape) {
      setState(prev => ({
        ...prev,
        showCommandPalette: false,
        view: 'list',
        searchQuery: '',
        error: null
      }));
      setSearchInput('');
      setCommandInput('');
      return;
    }

    // Don't handle other shortcuts when command palette is open
    if (state.showCommandPalette) return;

    // Navigation
    if (input === 'j' || key.downArrow) {
      navigateMemories('down');
    } else if (input === 'k' || key.upArrow) {
      navigateMemories('up');
    } else if (input === 'g' && !key.ctrl) {
      navigateMemories('first');
    } else if (input === 'G') {
      navigateMemories('last');
    }

    // Actions
    if (key.return && state.selectedMemory) {
      if (state.view === 'detail') {
        executeMemory(state.selectedMemory);
      } else {
        setState(prev => ({ ...prev, view: 'detail' }));
      }
    }

    if (input === '/') {
      setState(prev => ({ ...prev, view: 'search' }));
    }

    if (input === 'r') {
      // Refresh
      setState(prev => ({ ...prev, loading: true }));
      setTimeout(async () => {
        const recent = await memoryEngine.getRecentMemories(20);
        setState(prev => ({
          ...prev,
          memories: recent.slice(0, 10),
          loading: false
        }));
      }, 100);
    }

    // View switching
    if (input === '1') setState(prev => ({ ...prev, view: 'list' }));
    if (input === '2') setState(prev => ({ ...prev, view: 'search' }));
    if (input === '3') setState(prev => ({ ...prev, view: 'detail' }));
    if (input === '4') setState(prev => ({ ...prev, view: 'stats' }));
    if (input === '?') setState(prev => ({ ...prev, view: 'help' }));

    // Copy shortcut
    if (key.ctrl && input === 'c' && !key.meta && state.selectedMemory) {
      executeMemory(state.selectedMemory);
    }
  }, { isActive: isRawModeSupported });

  // Command palette commands
  const commandPaletteItems = useMemo(() => [
    { label: '🔍 Search memories', value: 'search' },
    { label: '📊 Show statistics', value: 'stats' },
    { label: '🔄 Refresh data', value: 'refresh' },
    { label: '❓ Show help', value: 'help' },
    { label: '⚡ Popular memories', value: 'popular' },
    { label: '🕐 Recent memories', value: 'recent' },
    { label: '🚪 Quit', value: 'quit' }
  ], []);

  const executeCommand = useCallback((command: string) => {
    setState(prev => ({ ...prev, showCommandPalette: false }));

    switch (command) {
      case 'search':
        setState(prev => ({ ...prev, view: 'search' }));
        break;
      case 'stats':
        setState(prev => ({ ...prev, view: 'stats' }));
        break;
      case 'help':
        setState(prev => ({ ...prev, view: 'help' }));
        break;
      case 'popular':
        setState(prev => ({
          ...prev,
          memories: prev.popularMemories,
          view: 'list',
          selectedIndex: 0,
          selectedMemory: prev.popularMemories[0] || null
        }));
        break;
      case 'recent':
        setState(prev => ({
          ...prev,
          memories: prev.recentMemories,
          view: 'list',
          selectedIndex: 0,
          selectedMemory: prev.recentMemories[0] || null
        }));
        break;
      case 'refresh':
        setState(prev => ({ ...prev, loading: true }));
        setTimeout(async () => {
          const [recent, popular] = await Promise.all([
            memoryEngine.getRecentMemories(20),
            memoryEngine.getPopularMemories(20)
          ]);
          setState(prev => ({
            ...prev,
            memories: recent.slice(0, 10),
            recentMemories: recent,
            popularMemories: popular,
            loading: false
          }));
        }, 500);
        break;
      case 'quit':
        exit();
        break;
    }
  }, [memoryEngine, exit]);

  // Raw mode not supported - show simple interface
  if (!isRawModeSupported) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>⚠ Interactive mode not supported in this environment</Text>
        <Text>Total memories loaded: {state.stats.total}</Text>
        <Text dimColor>Use this tool in a proper terminal for the full interactive experience</Text>
        <Text dimColor>Try: Terminal.app, iTerm2, or any standard terminal</Text>
      </Box>
    );
  }

  // Loading screen
  if (state.loading) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" minHeight={10}>
        <Box marginBottom={1}>
          <Text color="cyan" bold>r3call AWESOME Memory Manager</Text>
        </Box>
        <Box>
          <Text color="yellow">
            <Spinner type="dots" /> Loading memories...
          </Text>
        </Box>
      </Box>
    );
  }

  // Error screen
  if (state.error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>{figures.cross} {state.error}</Text>
        <Text dimColor>Press [ESC] to continue, [Q] to quit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" minHeight={20}>
      {/* Header */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1} marginBottom={1}>
        <Text bold color="cyan">r3call AWESOME</Text>
        <Text dimColor> | </Text>
        <Text color="green">{state.stats.total} memories</Text>
        <Text dimColor> | </Text>
        <Text color="blue">{Math.round(state.stats.cache.hitRate)}% cache hit</Text>
        <Text dimColor> | </Text>
        <Text color="yellow">⚡ instant search</Text>
      </Box>

      {/* Main Content */}
      <Box flexGrow={1} flexDirection="row">
        {/* Left Panel - Memory List */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="single"
          borderColor={state.view === 'list' || state.view === 'search' ? 'cyan' : 'gray'}
          marginRight={1}
          paddingX={1}
        >
          <Text bold color="cyan">
            {state.view === 'search' ? `🔍 Search Results (${state.searchResults.length})` : `📚 Memories (${state.memories.length})`}
          </Text>

          {/* Search Input */}
          {state.view === 'search' && (
            <Box marginY={1}>
              <Text color="yellow">{'> '}</Text>
              <TextInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Type to search..."
              />
            </Box>
          )}

          {/* Memory List */}
          <Box flexDirection="column" marginTop={1}>
            {(state.view === 'search' ? state.searchResults : state.memories)
              .slice(0, 12)
              .map((memory, index) => {
                const isSelected = index === state.selectedIndex;
                const useCount = memory.metadata.use_count || 0;
                const isDangerous = memory.metadata.dangerous;
                const requiresSudo = memory.metadata.requires_sudo;

                return (
                  <Text key={memory.id} color={isSelected ? 'green' : isDangerous ? 'red' : 'white'}>
                    {isSelected ? '>' : ' '} {memory.content.substring(0, 40)}...
                    {requiresSudo ? ' ⚠' : ''}
                    {useCount > 5 ? ' ★' : ''}
                  </Text>
                );
              })}
          </Box>
        </Box>

        {/* Right Panel - Detail View */}
        <Box
          flexDirection="column"
          flexGrow={1}
          borderStyle="single"
          borderColor={state.view === 'detail' ? 'green' : 'gray'}
          paddingX={1}
        >
          {state.view === 'detail' && state.selectedMemory && (
            <>
              <Text bold color="green">💾 Memory Details</Text>

              <Box marginTop={1} flexDirection="column">
                <Text wrap="wrap" color="white">
                  {state.selectedMemory.content}
                </Text>

                <Box marginTop={1}>
                  <Text dimColor>ID: {state.selectedMemory.id}</Text>
                </Box>

                <Box>
                  <Text dimColor>
                    Created: {new Date(state.selectedMemory.created_at).toLocaleDateString()}
                  </Text>
                </Box>

                {state.selectedMemory.metadata.use_count && (
                  <Box>
                    <Text color="blue">
                      Used {state.selectedMemory.metadata.use_count} times
                    </Text>
                  </Box>
                )}

                {state.selectedMemory.tags.length > 0 && (
                  <Box marginTop={1}>
                    <Text>Tags: </Text>
                    {state.selectedMemory.tags.map(tag => (
                      <Text key={tag} color="yellow">#{tag} </Text>
                    ))}
                  </Box>
                )}

                {state.selectedMemory.metadata.dangerous && (
                  <Box marginTop={1}>
                    <Text color="red" bold>
                      {figures.warning} DANGEROUS COMMAND
                    </Text>
                  </Box>
                )}

                {state.selectedMemory.metadata.requires_sudo && (
                  <Box>
                    <Text color="yellow">
                      {figures.warning} Requires sudo
                    </Text>
                  </Box>
                )}
              </Box>

              <Box marginTop={2}>
                <Text dimColor>
                  [Enter] Execute • [Ctrl+C] Copy • [ESC] Back
                </Text>
              </Box>
            </>
          )}

          {state.view === 'stats' && (
            <>
              <Text bold color="green">📊 Performance Statistics</Text>

              <Box marginTop={1} flexDirection="column">
                <Text color="cyan">Cache Performance:</Text>
                <Text>  Hit Rate: {Math.round(state.stats.cache.hitRate)}%</Text>
                <Text>  Hits: {state.stats.cache.hits}</Text>
                <Text>  Misses: {state.stats.cache.misses}</Text>

                <Box marginTop={1}><Text color="cyan">Operation Times (ms):</Text></Box>
                {Object.entries(state.stats.performance).map(([op, stats]: [string, any]) => (
                  <Text key={op}>
                    {op}: {stats.avg}ms avg ({stats.count} ops)
                  </Text>
                ))}

                <Box marginTop={1}><Text color="cyan">Memory Usage:</Text></Box>
                <Text>
                  Heap: {Math.round(state.stats.cache.memory / 1024 / 1024)}MB
                </Text>
              </Box>
            </>
          )}

          {state.view === 'help' && <HelpView />}

          {state.view === 'list' && (
            <>
              <Text bold color="green">🚀 Quick Actions</Text>
              <Box marginTop={1} flexDirection="column">
                <Text>[1] Recent Memories</Text>
                <Text>[2] Search Mode</Text>
                <Text>[3] Detail View</Text>
                <Text>[4] Statistics</Text>
                <Text>[/] Search</Text>
                <Text>[Ctrl+K] Command Palette</Text>
                <Text>[R] Refresh</Text>
                <Text>[Q] Quit</Text>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Command Palette Overlay */}
      {state.showCommandPalette && (
        <Box
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
        >
          <Box flexDirection="column">
            <Text bold color="yellow">⚡ Command Palette</Text>
            <SelectInput
              items={commandPaletteItems}
              onSelect={(item) => executeCommand(item.value)}
            />
          </Box>
        </Box>
      )}

      {/* Status Bar */}
      <Box borderStyle="single" borderColor="dim" paddingX={1}>
        <Text dimColor>
          {state.view === 'search' ? '[ESC] Exit Search' : '[/] Search'} •
          [Ctrl+K] Palette • [?] Help • [Q] Quit •
          {state.selectedMemory ? ` Selected: ${state.selectedMemory.content.substring(0, 20)}...` : ''}
        </Text>
      </Box>
    </Box>
  );
};

// Help Component
const HelpView: React.FC = () => (
  <Box flexDirection="column">
    <Text bold color="green">❓ Help</Text>

    <Box marginTop={1} flexDirection="column">
      <Text bold color="cyan">Navigation:</Text>
      <Text>j/k or ↓/↑    Navigate memories</Text>
      <Text>g/G           Go to first/last</Text>
      <Text>Enter         View details / Execute</Text>
      <Text>ESC           Back to list</Text>

      <Box marginTop={1}><Text bold color="cyan">Search:</Text></Box>
      <Text>/             Start searching</Text>
      <Text>Ctrl+K        Command palette</Text>

      <Box marginTop={1}><Text bold color="cyan">Actions:</Text></Box>
      <Text>Ctrl+C        Copy memory</Text>
      <Text>R             Refresh</Text>
      <Text>1-4           Switch views</Text>

      <Box marginTop={1}><Text bold color="cyan">Views:</Text></Box>
      <Text>1 - Recent memories</Text>
      <Text>2 - Search mode</Text>
      <Text>3 - Detail view</Text>
      <Text>4 - Performance stats</Text>
    </Box>
  </Box>
);

// Run the app
render(<AwesomeMemoryManager />);