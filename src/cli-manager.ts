#!/usr/bin/env node

// Suppress transformers.js dtype warnings before imports
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (...args: any[]) => {
  const msg = args.join(" ");
  if (msg.includes("dtype") || msg.includes("fp32") || msg.includes("device")) {
    return;
  }
  originalWarn.apply(console, args);
};
console.error = (...args: any[]) => {
  const msg = args.join(" ");
  if (msg.includes("dtype") || msg.includes("fp32") || msg.includes("device")) {
    return;
  }
  originalError.apply(console, args);
};

import blessed from "blessed";
import contrib from "blessed-contrib";
import { createClient, RedisClientType } from "redis";
import { LocalMemory } from "./lib/local-memory.js";
import { EnhancedVectraMemory } from "./lib/enhanced-vectra-memory.js";
import { EntityExtractor } from "./lib/entity-extractor.js";
import type { Memory as VectraMemory } from "./types/index.js";
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

// Types - extend the Vectra Memory type
interface Memory extends Partial<VectraMemory> {
  id: string;
  memory: string; // content field
  metadata?: Record<string, any>;
  created_at: string;
  user_id: string;
  source?: string;
  relevance_score?: number;
  matched_entities?: string[];
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  count: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
  weight?: number;
}

interface ExaSearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
}

// Configuration
const MEM0_API_KEY = process.env.MEM0_API_KEY;
const MEM0_USER_ID = process.env.MEM0_USER_ID || "oliver";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const EXA_API_KEY = process.env.EXA_API_KEY;

class MemoryGraphManager {
  private screen: any;
  private grid: any;
  private graphPanel: any;
  private detailsPanel: any;
  private statsPanel: any;
  private searchPanel: any;
  private logPanel: any;
  private commandLine: any;

  private redisClient: RedisClientType | null = null;
  private localMemory: LocalMemory | null = null;
  private vectraMemory: EnhancedVectraMemory | null = null;
  private entityExtractor: EntityExtractor | null = null;

  private memories: Memory[] = [];
  private graphNodes: GraphNode[] = [];
  private graphEdges: GraphEdge[] = [];
  private selectedNode: string | null = null;
  private searchResults: Memory[] = [];
  private exaResults: ExaSearchResult[] = [];

  private currentPanel: "graph" | "details" | "stats" | "search" = "graph";
  private isSearchMode: boolean = false;
  private isExaMode: boolean = false;
  private memoryBeingAugmented: Memory | null = null;

  constructor() {
    // Set terminal to basic mode to avoid compatibility issues
    process.env.TERM = "xterm";

    // Initialize blessed screen with compatibility settings
    this.screen = blessed.screen({
      smartCSR: true,
      title: "r3 Memory Graph Manager",
      fullUnicode: true,
      dockBorders: true,
      ignoreDockContrast: true,
      terminal: "xterm",
      forceUnicode: true,
    });

    // Create grid layout
    this.grid = new (contrib as any).grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
    });

    this.setupUI();
    this.setupKeyBindings();
  }

  private setupUI() {
    // Title bar
    const titleBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: "100%",
      height: 3,
      content: `{center}${chalk.cyan.bold("r3 Memory Graph Manager v1.3.0")}{/center}\n{center}[↑↓] Navigate  [Enter] View Details  [Tab] Switch Panel  [/] Search  [E] Exa  [Q] Quit{/center}`,
      tags: true,
      border: {
        type: "line",
        fg: "cyan",
      },
    });

    // Graph visualization panel (left side)
    this.graphPanel = this.grid.set(1, 0, 5, 7, blessed.box, {
      label: " Memory Graph ",
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      border: {
        type: "line",
        fg: "cyan",
      },
      style: {
        fg: "white",
        border: {
          fg: "cyan",
        },
      },
    });

    // Stats panel (right top)
    this.statsPanel = this.grid.set(1, 7, 2, 5, contrib.lcd, {
      label: " Statistics ",
      segmentWidth: 0.06,
      segmentInterval: 0.11,
      strokeWidth: 0.1,
      elements: 4,
      display: 0,
      elementSpacing: 4,
      elementPadding: 2,
    });

    // Search results panel (right middle) - using box instead of table for compatibility
    this.searchPanel = this.grid.set(3, 7, 3, 5, blessed.box, {
      label: " Search Results ",
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      border: {
        type: "line",
        fg: "magenta",
      },
      style: {
        fg: "white",
        border: {
          fg: "magenta",
        },
      },
    });

    // Memory details panel (bottom)
    this.detailsPanel = this.grid.set(6, 0, 4, 12, blessed.box, {
      label: " Memory Details ",
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      border: {
        type: "line",
        fg: "green",
      },
      style: {
        fg: "white",
        border: {
          fg: "green",
        },
      },
    });

    // Log panel (very bottom)
    this.logPanel = this.grid.set(10, 0, 2, 12, blessed.log, {
      label: " Activity Log ",
      tags: true,
      border: {
        type: "line",
        fg: "yellow",
      },
    });

    // Command line (hidden by default)
    this.commandLine = blessed.textbox({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: "100%",
      height: 3,
      border: {
        type: "line",
        fg: "yellow",
      },
      style: {
        fg: "white",
        bg: "black",
        border: {
          fg: "yellow",
        },
      },
      inputOnFocus: true,
      hidden: true,
    });
  }

  private setupKeyBindings() {
    // Global keys
    this.screen.key(["q", "C-c"], () => {
      this.cleanup();
      process.exit(0);
    });

    this.screen.key(["tab"], () => {
      this.switchPanel();
    });

    this.screen.key(["/"], () => {
      this.enterSearchMode();
    });

    this.screen.key(["e"], () => {
      if (this.selectedNode) {
        // If a memory is selected, augment it with Exa search
        this.augmentMemoryWithExa();
      } else {
        // Otherwise, do a general Exa search
        this.enterExaSearchMode();
      }
    });

    this.screen.key(["s"], () => {
      // Save augmented memory
      if (this.memoryBeingAugmented && this.exaResults.length > 0) {
        this.saveAugmentedMemory();
      }
    });

    this.screen.key(["c"], () => {
      // Combine all results into augmented memory
      if (this.memoryBeingAugmented && this.exaResults.length > 0) {
        this.combineAllResultsIntoMemory();
      }
    });

    // Number keys to select specific results
    for (let i = 1; i <= 9; i++) {
      this.screen.key([String(i)], () => {
        if (this.exaResults.length >= i) {
          this.includeSpecificResult(i - 1);
        }
      });
    }

    this.screen.key(["g"], () => {
      this.currentPanel = "graph";
      this.refreshDisplay();
    });

    this.screen.key(["s"], () => {
      this.currentPanel = "stats";
      this.updateStats();
    });

    this.screen.key(["r"], () => {
      this.log("Refreshing data...");
      this.loadMemories();
    });

    this.screen.key(["x"], () => {
      this.exportData();
    });

    this.screen.key(["d"], () => {
      if (this.selectedNode) {
        this.deleteMemory(this.selectedNode);
      }
    });

    this.screen.key(["enter"], () => {
      if (this.selectedNode) {
        this.log(chalk.green(`Showing details for: ${this.selectedNode}`));
        this.showMemoryDetails(this.selectedNode);
      } else {
        this.log(
          chalk.yellow("No memory selected. Use arrow keys to navigate."),
        );
      }
    });

    // Arrow keys for navigation
    this.screen.key(["up", "k"], () => {
      this.navigateGraph("up");
    });

    this.screen.key(["down", "j"], () => {
      this.navigateGraph("down");
    });

    this.screen.key(["left", "h"], () => {
      this.navigateGraph("left");
    });

    this.screen.key(["right", "l"], () => {
      this.navigateGraph("right");
    });
  }

  private switchPanel() {
    const panels: Array<"graph" | "details" | "stats" | "search"> = [
      "graph",
      "details",
      "stats",
      "search",
    ];
    const currentIndex = panels.indexOf(this.currentPanel);
    this.currentPanel = panels[(currentIndex + 1) % panels.length];

    this.log(`Switched to ${this.currentPanel} panel`);
    this.refreshDisplay();
  }

  private async enterSearchMode() {
    this.isSearchMode = true;
    this.isExaMode = false;

    // Clear and show the command line
    this.commandLine.clearValue();
    this.commandLine.hidden = false;
    this.commandLine.setLabel(" Memory Search (Type query and press Enter) ");

    // Important: bring to front and focus
    this.commandLine.setFront();
    this.commandLine.focus();

    // Show cursor
    this.screen.program.showCursor();
    this.screen.render();

    this.commandLine.once("submit", async (value: string) => {
      const query = value.trim();

      this.log(chalk.cyan(`Searching memories for: "${query}"`));

      if (query) {
        await this.searchMemories(query);
      }

      this.commandLine.hidden = true;
      this.isSearchMode = false;
      this.screen.program.hideCursor();
      this.screen.render();
    });

    this.commandLine.once("cancel", () => {
      this.commandLine.hidden = true;
      this.isSearchMode = false;
      this.screen.program.hideCursor();
      this.screen.render();
    });
  }

  private async enterExaSearchMode() {
    if (!EXA_API_KEY) {
      this.log(chalk.red("Exa API key not configured"));
      this.log(
        chalk.yellow("Set EXA_API_KEY environment variable to use Exa search"),
      );
      this.log(chalk.gray('Example: export EXA_API_KEY="your-key-here"'));
      return;
    }

    this.isExaMode = true;
    this.isSearchMode = false;

    // Clear and show the command line
    this.commandLine.clearValue();
    this.commandLine.hidden = false;
    this.commandLine.setLabel(" Exa Search (Type query and press Enter) ");

    // Important: bring to front and focus
    this.commandLine.setFront();
    this.commandLine.focus();

    // Show cursor
    this.screen.program.showCursor();
    this.screen.render();

    this.commandLine.once("submit", async (value: string) => {
      const query = value.trim();

      this.log(chalk.cyan(`Exa searching for: "${query}"`));

      if (query) {
        await this.searchWithExa(query);
      }

      this.commandLine.hidden = true;
      this.isExaMode = false;
      this.screen.program.hideCursor();
      this.screen.render();
    });

    this.commandLine.once("cancel", () => {
      this.commandLine.hidden = true;
      this.isExaMode = false;
      this.screen.program.hideCursor();
      this.screen.render();
    });
  }

  private async searchWithExa(query: string) {
    this.log(`Searching Exa for: ${chalk.yellow(query)}`);
    this.log(chalk.gray(`Using API key: ${EXA_API_KEY?.substring(0, 10)}...`));

    try {
      const requestBody = {
        query,
        numResults: 10,
        useAutoprompt: true,
        type: "neural",
        contents: {
          text: true,
        },
      };

      this.log(chalk.gray(`Request: ${JSON.stringify(requestBody)}`));

      const response = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": EXA_API_KEY!,
        },
        body: JSON.stringify(requestBody),
      });

      this.log(chalk.gray(`Response status: ${response.status}`));

      if (!response.ok) {
        const errorText = await response.text();
        this.log(chalk.red(`Exa API error (${response.status}): ${errorText}`));
        return;
      }

      const data = (await response.json()) as any;

      if (data.results && data.results.length > 0) {
        this.exaResults = data.results.map((r: any) => ({
          title: r.title || "Untitled",
          url: r.url || "",
          snippet: r.text?.substring(0, 200) || r.snippet || "",
          relevance: r.score || 0,
        }));

        // Display Exa results in search panel
        this.displayExaResults();

        this.log(
          chalk.green(`Found ${this.exaResults.length} results from Exa`),
        );
      } else {
        this.log(chalk.yellow("No results found from Exa"));
        this.exaResults = [];
      }
    } catch (error: any) {
      this.log(chalk.red(`Exa search failed: ${error.message}`));
      this.log(chalk.red(`Stack: ${error.stack}`));
    }
  }

  private async augmentMemoryWithExa() {
    if (!this.selectedNode) {
      this.log(chalk.yellow("No memory selected to augment"));
      return;
    }

    const memory = this.memories.find((m) => m.id === this.selectedNode);
    if (!memory) {
      this.log(chalk.yellow("Memory not found"));
      return;
    }

    this.log(chalk.cyan(`Augmenting memory: ${memory.id.substring(0, 8)}`));
    this.log(
      chalk.gray(`Current content: ${memory.memory.substring(0, 50)}...`),
    );

    // Store the memory being augmented
    this.memoryBeingAugmented = memory;

    // Show search prompt with memory context as default
    this.isExaMode = true;
    this.isSearchMode = false;

    // Clear and show the command line with memory preview
    this.commandLine.clearValue();
    this.commandLine.hidden = false;
    this.commandLine.setLabel(
      " Augment with Exa (edit query or press Enter for default) ",
    );

    // Pre-fill with smart query from memory
    const defaultQuery = this.extractSmartQuery(memory.memory);
    this.commandLine.setValue(defaultQuery);

    // Important: bring to front and focus
    this.commandLine.setFront();
    this.commandLine.focus();

    // Show cursor
    this.screen.program.showCursor();
    this.screen.render();

    this.commandLine.once("submit", async (value: string) => {
      const query = value.trim() || defaultQuery;

      this.log(chalk.cyan(`Searching for augmentation: "${query}"`));

      if (query) {
        await this.searchWithExa(query);

        // After search, show save options
        this.log(chalk.green("=== Augmentation Results ==="));
        this.log(chalk.yellow("Press [S] to save augmented memory"));
        this.log(chalk.yellow("Press [1-9] to include specific result"));
        this.log(chalk.yellow("Press [C] to combine all results"));
      }

      this.commandLine.hidden = true;
      this.isExaMode = false;
      this.screen.program.hideCursor();
      this.screen.render();
    });

    this.commandLine.once("cancel", () => {
      this.commandLine.hidden = true;
      this.isExaMode = false;
      this.memoryBeingAugmented = null;
      this.screen.program.hideCursor();
      this.screen.render();
    });
  }

  private extractSmartQuery(memoryContent: string): string {
    // Extract key terms from memory for better search
    const words = memoryContent.split(/\s+/);

    // Find capitalized words (likely important terms)
    const importantWords = words
      .filter((w) => w.length > 3 && /^[A-Z]/.test(w))
      .slice(0, 3);

    // If we have important words, use them
    if (importantWords.length > 0) {
      return importantWords.join(" ") + " latest updates";
    }

    // Otherwise use first 50 chars
    return memoryContent.substring(0, 50);
  }

  private async saveAugmentedMemory() {
    if (
      !this.memoryBeingAugmented ||
      !this.exaResults ||
      this.exaResults.length === 0
    ) {
      this.log(chalk.yellow("No augmentation data to save"));
      return;
    }

    // Take the first result and augment the memory
    const topResult = this.exaResults[0];

    // Create augmented content
    const augmentedContent = `${this.memoryBeingAugmented.memory}

=== Augmented Information ===
${topResult.title}
${topResult.snippet}

Source: ${topResult.url}
Updated: ${new Date().toISOString()}`;

    // Update the memory
    this.memoryBeingAugmented.memory = augmentedContent;
    this.memoryBeingAugmented.metadata = {
      ...this.memoryBeingAugmented.metadata,
      augmented: true,
      augmentation_source: "exa",
      augmentation_date: new Date().toISOString(),
      exa_url: topResult.url,
    };

    // Save to Redis
    await this.persistMemory(this.memoryBeingAugmented);

    this.log(chalk.green(`✓ Memory augmented with Exa data`));
    this.memoryBeingAugmented = null;
    this.refreshDisplay();
  }

  private async combineAllResultsIntoMemory() {
    if (
      !this.memoryBeingAugmented ||
      !this.exaResults ||
      this.exaResults.length === 0
    ) {
      this.log(chalk.yellow("No augmentation data to combine"));
      return;
    }

    // Combine all results
    let augmentedContent = `${this.memoryBeingAugmented.memory}

=== Augmented Information ===`;

    this.exaResults.forEach((result, index) => {
      augmentedContent += `

[${index + 1}] ${result.title}
${result.snippet}
Source: ${result.url}`;
    });

    augmentedContent += `

Updated: ${new Date().toISOString()}`;

    // Update the memory
    this.memoryBeingAugmented.memory = augmentedContent;
    this.memoryBeingAugmented.metadata = {
      ...this.memoryBeingAugmented.metadata,
      augmented: true,
      augmentation_source: "exa_combined",
      augmentation_date: new Date().toISOString(),
      exa_results_count: this.exaResults.length,
    };

    // Save to Redis
    await this.persistMemory(this.memoryBeingAugmented);

    this.log(
      chalk.green(
        `✓ Memory augmented with ${this.exaResults.length} Exa results`,
      ),
    );
    this.memoryBeingAugmented = null;
    this.refreshDisplay();
  }

  private async includeSpecificResult(index: number) {
    if (
      !this.memoryBeingAugmented ||
      !this.exaResults ||
      index >= this.exaResults.length
    ) {
      this.log(chalk.yellow("Invalid result selection"));
      return;
    }

    const result = this.exaResults[index];

    // Create augmented content with specific result
    const augmentedContent = `${this.memoryBeingAugmented.memory}

=== Augmented Information ===
${result.title}
${result.snippet}

Source: ${result.url}
Updated: ${new Date().toISOString()}`;

    // Update the memory
    this.memoryBeingAugmented.memory = augmentedContent;
    this.memoryBeingAugmented.metadata = {
      ...this.memoryBeingAugmented.metadata,
      augmented: true,
      augmentation_source: "exa_selected",
      augmentation_date: new Date().toISOString(),
      exa_url: result.url,
    };

    // Save to Redis
    await this.persistMemory(this.memoryBeingAugmented);

    this.log(chalk.green(`✓ Memory augmented with result #${index + 1}`));
    this.memoryBeingAugmented = null;
    this.refreshDisplay();
  }

  private async persistMemory(memory: Memory) {
    if (this.redisClient) {
      try {
        await this.redisClient.set(
          `memory:${memory.id}`,
          JSON.stringify(memory),
        );
        this.log(chalk.gray(`Persisted to Redis: ${memory.id}`));
      } catch (error: any) {
        this.log(chalk.red(`Failed to persist: ${error.message}`));
      }
    }

    // Update local array
    const index = this.memories.findIndex((m) => m.id === memory.id);
    if (index >= 0) {
      this.memories[index] = memory;
    }
  }

  private async saveExaResultAsMemory(index: number = 0) {
    if (!this.exaResults || this.exaResults.length === 0) {
      this.log(chalk.yellow("No Exa results to save"));
      return;
    }

    if (index >= this.exaResults.length) {
      this.log(chalk.yellow("Invalid result index"));
      return;
    }

    const result = this.exaResults[index];

    // Create new memory from Exa result
    const newMemory: Memory = {
      id: `exa-${Date.now()}`,
      memory: `${result.title}\n\n${result.snippet}\n\nSource: ${result.url}`,
      created_at: new Date().toISOString(),
      user_id: MEM0_USER_ID,
      metadata: {
        source: "exa",
        url: result.url,
        title: result.title,
        relevance: result.relevance,
      },
    };

    // Add to local memories
    this.memories.push(newMemory);

    // Save to Redis if available
    if (this.redisClient) {
      try {
        await this.redisClient.set(
          `memory:${newMemory.id}`,
          JSON.stringify(newMemory),
        );
        this.log(chalk.green(`✓ Saved Exa result as memory: ${newMemory.id}`));
      } catch (error: any) {
        this.log(chalk.red(`Failed to save to Redis: ${error.message}`));
      }
    }

    // Rebuild graph to include new memory
    await this.buildGraph();
    this.refreshDisplay();
  }

  private displayExaResults() {
    if (!this.exaResults || this.exaResults.length === 0) {
      this.searchPanel.setContent("No Exa results to display");
      this.screen.render();
      return;
    }

    // Format results as text instead of table (more reliable)
    let resultsText = chalk.cyan.bold("=== Exa Search Results ===\n\n");

    this.exaResults.forEach((r, index) => {
      resultsText += chalk.yellow(`${index + 1}. ${r.title}\n`);
      resultsText += chalk.gray(`   ${r.url}\n`);
      if (r.snippet) {
        resultsText += `   ${r.snippet.substring(0, 100)}...\n`;
      }
      resultsText += chalk.green(`   Score: ${r.relevance || "N/A"}\n\n`);
    });

    // Use setContent instead of setData for better compatibility
    this.searchPanel.setContent(resultsText);
    this.currentPanel = "search";

    // Focus on search panel
    this.searchPanel.focus();

    this.log(chalk.green(`Displaying ${this.exaResults.length} Exa results`));
    this.screen.render();
  }

  private async searchMemories(query: string) {
    this.log(`Searching for: ${chalk.yellow(query)}`);

    // Search in local memories
    if (this.vectraMemory) {
      const results = await this.vectraMemory.searchMemories(query, 10);
      // Map Vectra results to our Memory interface
      this.searchResults = results.map((r) => ({
        id: r.id,
        memory: r.content, // Map content to memory field
        created_at: r.metadata?.created_at || new Date().toISOString(),
        user_id: r.user_id,
        metadata: r.metadata,
        relevance_score: r.metadata?.similarity_score,
      }));
    } else {
      // Fallback to simple filtering
      this.searchResults = this.memories.filter((m) =>
        m.memory.toLowerCase().includes(query.toLowerCase()),
      );
    }

    // Display results
    this.displaySearchResults();
  }

  private displaySearchResults() {
    const tableData = {
      headers: ["ID", "Content", "Score"],
      data: this.searchResults.map((m) => [
        m.id.substring(0, 8),
        m.memory.substring(0, 50) + "...",
        (m.relevance_score || 0).toFixed(2),
      ]),
    };

    this.searchPanel.setData(tableData);
    this.currentPanel = "search";
    this.screen.render();
  }

  private navigateGraph(direction: string) {
    // Get only memory nodes for navigation (not entity nodes)
    const memoryNodes = this.graphNodes.filter((n) => n.type === "memory");

    if (memoryNodes.length === 0) {
      this.log(chalk.yellow("No memories to navigate"));
      return;
    }

    if (!this.selectedNode) {
      // Select first memory node
      this.selectedNode = memoryNodes[0].id;
      this.log(chalk.cyan(`Selected: ${memoryNodes[0].label}`));
    } else {
      const currentIndex = memoryNodes.findIndex(
        (n) => n.id === this.selectedNode,
      );
      let newIndex = currentIndex;

      switch (direction) {
        case "up":
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case "down":
          newIndex = Math.min(memoryNodes.length - 1, currentIndex + 1);
          break;
        case "left":
          newIndex = Math.max(0, currentIndex - 5);
          break;
        case "right":
          newIndex = Math.min(memoryNodes.length - 1, currentIndex + 5);
          break;
      }

      if (newIndex !== currentIndex) {
        this.selectedNode = memoryNodes[newIndex].id;
        this.log(chalk.cyan(`Selected: ${memoryNodes[newIndex].label}`));
      }
    }

    this.updateGraphDisplay();
  }

  private async showMemoryDetails(memoryId: string) {
    const memory = this.memories.find((m) => m.id === memoryId);
    if (!memory) return;

    let details = `${chalk.cyan("Memory ID:")} ${memory.id}\n`;
    details += `${chalk.cyan("Created:")} ${memory.created_at}\n`;
    details += `${chalk.cyan("User:")} ${memory.user_id}\n\n`;
    details += `${chalk.cyan("Content:")}\n${memory.memory}\n\n`;

    if (memory.metadata) {
      details += `${chalk.cyan("Metadata:")}\n`;
      details += JSON.stringify(memory.metadata, null, 2) + "\n\n";
    }

    if (memory.matched_entities && memory.matched_entities.length > 0) {
      details += `${chalk.cyan("Entities:")} ${memory.matched_entities.join(", ")}\n`;
    }

    this.detailsPanel.setContent(details);
    this.currentPanel = "details";
    this.screen.render();
  }

  private async deleteMemory(memoryId: string) {
    this.log(`Deleting memory: ${memoryId}`);

    // Delete from Redis cache
    if (this.redisClient) {
      await this.redisClient.del(`memory:${memoryId}`);
    }

    // Remove from local arrays
    this.memories = this.memories.filter((m) => m.id !== memoryId);
    this.graphNodes = this.graphNodes.filter((n) => n.id !== memoryId);

    this.log(chalk.green(`Memory ${memoryId} deleted`));
    this.refreshDisplay();
  }

  private async exportData() {
    const exportPath = path.join(process.cwd(), `r3-export-${Date.now()}.json`);

    const exportData = {
      timestamp: new Date().toISOString(),
      memories: this.memories,
      graph: {
        nodes: this.graphNodes,
        edges: this.graphEdges,
      },
      stats: await this.getStats(),
    };

    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    this.log(chalk.green(`Data exported to: ${exportPath}`));
  }

  private async getStats() {
    const stats: any = {
      totalMemories: this.memories.length,
      totalNodes: this.graphNodes.length,
      totalEdges: this.graphEdges.length,
    };

    if (this.redisClient) {
      try {
        const cacheKeys = await this.redisClient.keys("memory:*");
        const accessKeys = await this.redisClient.keys("access:*");
        stats.cachedMemories = cacheKeys.length;
        stats.totalAccesses = accessKeys.length;
      } catch (error) {
        // Silent fail
      }
    }

    return stats;
  }

  private async updateStats() {
    const stats = await this.getStats();

    // Update LCD display with stats
    this.statsPanel.setDisplay(stats.totalMemories);

    // Show detailed stats in details panel
    let statsText = `${chalk.cyan.bold("Memory Statistics")}\n\n`;
    statsText += `Total Memories: ${chalk.yellow(stats.totalMemories)}\n`;
    statsText += `Graph Nodes: ${chalk.yellow(stats.totalNodes)}\n`;
    statsText += `Graph Edges: ${chalk.yellow(stats.totalEdges)}\n`;
    statsText += `Cached Memories: ${chalk.yellow(stats.cachedMemories || 0)}\n`;
    statsText += `Total Accesses: ${chalk.yellow(stats.totalAccesses || 0)}\n`;

    if (this.redisClient) {
      try {
        const info = await this.redisClient.info("memory");
        const memUsage =
          info.split("used_memory_human:")[1]?.split("\r\n")[0] || "Unknown";
        statsText += `Redis Memory: ${chalk.yellow(memUsage)}\n`;
      } catch (error) {
        // Silent fail
      }
    }

    this.detailsPanel.setContent(statsText);
    this.screen.render();
  }

  private updateGraphDisplay() {
    // Use a simpler box-based display instead of map
    if (!this.graphPanel || !this.graphNodes.length) return;

    // Create text representation of the graph
    let graphText = "";
    const maxNodes = 20; // Limit display for readability

    // Group nodes by type
    const memoryNodes = this.graphNodes
      .filter((n) => n.type === "memory")
      .slice(0, 10);
    const entityNodes = this.graphNodes
      .filter((n) => n.type !== "memory")
      .slice(0, 10);

    graphText += chalk.cyan.bold("=== Memories ===\n");
    memoryNodes.forEach((node) => {
      const isSelected = node.id === this.selectedNode;
      const marker = isSelected ? chalk.red("▶") : chalk.gray("●");
      graphText += `${marker} ${chalk.white(node.label)}\n`;
    });

    if (entityNodes.length > 0) {
      graphText += "\n" + chalk.green.bold("=== Entities ===\n");

      // Group entities by type
      const byType: Record<string, any[]> = {};
      entityNodes.forEach((node) => {
        if (!byType[node.type]) byType[node.type] = [];
        byType[node.type].push(node);
      });

      for (const [type, nodes] of Object.entries(byType)) {
        graphText += chalk.yellow(`  ${type}:\n`);
        nodes.forEach((node) => {
          const isSelected = node.id === this.selectedNode;
          const marker = isSelected ? chalk.red("▶") : chalk.gray("○");
          graphText += `    ${marker} ${node.label} (${node.count})\n`;
        });
      }
    }

    // Show edges summary
    if (this.graphEdges.length > 0) {
      graphText +=
        "\n" +
        chalk.magenta.bold(`=== Connections: ${this.graphEdges.length} ===\n`);
    }

    // Update the panel content directly
    this.graphPanel.setContent(graphText);
    this.screen.render();
  }

  private refreshDisplay() {
    this.updateGraphDisplay();
    this.updateStats();
    this.screen.render();
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logPanel.log(`[${timestamp}] ${message}`);
  }

  private async loadMemories() {
    this.log("Loading memories...");

    try {
      // Initialize connections
      await this.initializeConnections();

      // Load memories from Redis cache
      if (this.redisClient) {
        try {
          // Get only actual memory keys (they should be in format memory:uuid)
          const allKeys = await this.redisClient.keys("memory:*");

          // Filter to only get actual memory IDs (UUIDs or similar)
          const memoryKeys = allKeys.filter((key) => {
            // Skip keyword indexes, access counters, etc
            const parts = key.split(":");
            return (
              parts.length === 2 &&
              !["keywords", "access", "search"].includes(parts[1])
            );
          });

          this.memories = [];
          let skippedCount = 0;

          for (const key of memoryKeys) {
            try {
              const data = await this.redisClient.get(key);
              if (data && typeof data === "string") {
                const memory = JSON.parse(data);
                // Validate it's a real memory object
                if (memory && memory.id && memory.memory) {
                  this.memories.push(memory);
                }
              }
            } catch (parseError: any) {
              // Skip invalid entries silently
              skippedCount++;
            }
          }

          if (skippedCount > 0) {
            this.log(
              chalk.gray(`Filtered out ${skippedCount} non-memory entries`),
            );
          }
        } catch (redisError: any) {
          this.log(chalk.yellow(`Redis error: ${redisError.message}`));
          // Try to load sample data instead
          await this.loadSampleData();
        }
      } else {
        // Load sample data if no Redis
        await this.loadSampleData();
      }

      // Build graph from memories
      await this.buildGraph();

      // Auto-select first memory if available
      const memoryNodes = this.graphNodes.filter((n) => n.type === "memory");
      if (memoryNodes.length > 0 && !this.selectedNode) {
        this.selectedNode = memoryNodes[0].id;
        this.log(
          chalk.cyan(`Auto-selected first memory: ${memoryNodes[0].label}`),
        );
      }

      this.log(chalk.green(`Loaded ${this.memories.length} memories`));
      this.refreshDisplay();
    } catch (error: any) {
      this.log(chalk.red(`Failed to load memories: ${error.message}`));
      // Load sample data as fallback
      await this.loadSampleData();
    }
  }

  private async loadSampleData() {
    this.log(chalk.cyan("Loading sample data for demonstration..."));

    // Create sample memories
    this.memories = [
      {
        id: "sample-1",
        memory: "Claude is an AI assistant created by Anthropic",
        created_at: new Date().toISOString(),
        user_id: "demo",
        metadata: {
          entities: {
            technologies: [{ text: "Claude" }, { text: "AI" }],
            organizations: [{ text: "Anthropic" }],
          },
        },
      },
      {
        id: "sample-2",
        memory: "r3 uses Redis for caching and Mem0 for persistence",
        created_at: new Date().toISOString(),
        user_id: "demo",
        metadata: {
          entities: {
            technologies: [{ text: "r3" }, { text: "Redis" }, { text: "Mem0" }],
            projects: [{ text: "r3" }],
          },
        },
      },
      {
        id: "sample-3",
        memory: "TypeScript is used for building the r3 project",
        created_at: new Date().toISOString(),
        user_id: "demo",
        metadata: {
          entities: {
            technologies: [{ text: "TypeScript" }],
            projects: [{ text: "r3" }],
          },
        },
      },
      {
        id: "sample-4",
        memory: "Exa API provides external search capabilities",
        created_at: new Date().toISOString(),
        user_id: "demo",
        metadata: {
          entities: {
            technologies: [{ text: "Exa API" }],
            projects: [{ text: "search" }],
          },
        },
      },
    ];

    this.log(chalk.green("Sample data loaded"));
  }

  private async buildGraph() {
    this.graphNodes = [];
    this.graphEdges = [];

    // Create nodes from memories
    const entityMap = new Map<string, GraphNode>();

    for (const memory of this.memories) {
      // Add memory as a node
      this.graphNodes.push({
        id: memory.id,
        label: memory.id.substring(0, 8),
        type: "memory",
        count: 1,
      });

      // Extract entities if available
      if (memory.metadata?.entities) {
        for (const [type, entities] of Object.entries(
          memory.metadata.entities,
        )) {
          for (const entity of entities as any[]) {
            const key = `${type}:${entity.text}`;

            if (!entityMap.has(key)) {
              entityMap.set(key, {
                id: key,
                label: entity.text,
                type: type,
                count: 0,
              });
            }

            entityMap.get(key)!.count++;

            // Create edge between memory and entity
            this.graphEdges.push({
              from: memory.id,
              to: key,
              type: "HAS_ENTITY",
            });
          }
        }
      }
    }

    // Add entity nodes to graph
    this.graphNodes.push(...Array.from(entityMap.values()));
  }

  private async initializeConnections() {
    // Initialize Redis
    try {
      this.redisClient = createClient({ url: REDIS_URL });
      await this.redisClient.connect();
      this.log(chalk.green("Redis connected"));
    } catch (error: any) {
      this.log(chalk.yellow(`Redis connection failed: ${error.message}`));
    }

    // Initialize LocalMemory if no Redis
    if (!this.redisClient) {
      try {
        this.localMemory = new LocalMemory(true);
        await this.localMemory.start();
        this.redisClient = this.localMemory.getClient();
        this.log(chalk.green("Local memory initialized"));
      } catch (error: any) {
        this.log(chalk.red(`Local memory failed: ${error.message}`));
      }
    }

    // Skip Vectra and entity extraction to avoid mutex errors
    // These features can be re-enabled when the transformers.js issues are resolved
    this.log(
      chalk.gray("Vector search and entity extraction disabled for stability"),
    );
  }

  private async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    if (this.localMemory) {
      await this.localMemory.stop();
    }
  }

  async start() {
    // Restore console functions after blessed takes over
    console.warn = originalWarn;
    console.error = originalError;

    this.log(chalk.cyan.bold("r3 Memory Graph Manager Starting..."));

    // Load initial data
    await this.loadMemories();

    // Start the UI
    this.screen.render();
  }
}

// Main entry point
async function main() {
  const manager = new MemoryGraphManager();
  await manager.start();
}

// Handle process arguments
if (process.argv.includes("--help")) {
  console.log(`
r3 Memory Graph Manager

Usage:
  npx r3 --manage     Launch the visual memory manager
  npx r3-manage       Direct launch

Environment Variables:
  MEM0_API_KEY           Mem0 API key for cloud sync
  REDIS_URL              Redis connection URL
  EXA_API_KEY            Exa API key for external search

Key Commands:
  Tab    - Switch between panels
  /      - Search memories
  E      - Exa search (external knowledge)
  G      - Graph view
  S      - Statistics view
  R      - Refresh data
  X      - Export data
  D      - Delete selected memory
  Q      - Quit

Navigation:
  Arrow keys or H/J/K/L for vim-style movement
  Enter to select/expand
  `);
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to start manager:", error);
  process.exit(1);
});
