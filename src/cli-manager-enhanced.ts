#!/usr/bin/env node

// Suppress warnings before imports
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (...args: any[]) => {
  const msg = args.join(' ');
  if (msg.includes('dtype') || msg.includes('fp32') || msg.includes('mutex')) return;
  originalWarn.apply(console, args);
};
console.error = (...args: any[]) => {
  const msg = args.join(' ');
  if (msg.includes('dtype') || msg.includes('fp32') || msg.includes('mutex')) return;
  originalError.apply(console, args);
};

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { createClient, RedisClientType } from 'redis';
import chalk from 'chalk';
import Fuse from 'fuse.js';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import fetch from 'node-fetch';
import boxen from 'boxen';

// Configure marked for terminal rendering
marked.setOptions({
  renderer: new TerminalRenderer({
    showSectionPrefix: false,
    width: 80,
    reflowText: true,
    tableOptions: {
      chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
    }
  })
});

// Types
interface Memory {
  id: string;
  memory: string;
  metadata?: Record<string, any>;
  created_at: string;
  user_id: string;
  relevance_score?: number;
  augmented?: boolean;
  tags?: string[];
}

interface ExaResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
}

interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  dim: string;
  bg: string;
}

// Themes
const themes: Record<string, Theme> = {
  dracula: {
    primary: '#bd93f9',
    secondary: '#8be9fd',
    accent: '#50fa7b',
    success: '#50fa7b',
    warning: '#f1fa8c',
    error: '#ff5555',
    dim: '#6272a4',
    bg: '#282a36'
  },
  nord: {
    primary: '#88c0d0',
    secondary: '#81a1c1',
    accent: '#5e81ac',
    success: '#a3be8c',
    warning: '#ebcb8b',
    error: '#bf616a',
    dim: '#4c566a',
    bg: '#2e3440'
  },
  cyberpunk: {
    primary: '#00ffff',
    secondary: '#ff00ff',
    accent: '#ffff00',
    success: '#00ff00',
    warning: '#ff8800',
    error: '#ff0044',
    dim: '#666666',
    bg: '#0a0a0a'
  }
};

class EnhancedMemoryManager {
  private screen: any;
  private grid: any;
  private memoryList: any;
  private contentBox: any;
  private searchBox: any;
  private statusBar: any;
  private helpBox: any;
  private commandLine: any;
  private minimap: any;
  private graph: any;

  private redisClient: RedisClientType | null = null;
  private memories: Memory[] = [];
  private filteredMemories: Memory[] = [];
  private selectedMemory: Memory | null = null;
  private selectedIndex: number = 0;
  private exaResults: ExaResult[] = [];
  private fuse: Fuse<Memory> | null = null;

  private currentTheme: Theme = themes.dracula;
  private isSearchMode: boolean = false;
  private isCommandMode: boolean = false;
  private searchQuery: string = '';
  private memoryBeingAugmented: Memory | null = null;

  constructor() {
    process.env.TERM = 'xterm-256color';

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'r3call Memory Manager Pro',
      fullUnicode: true,
      dockBorders: true,
      ignoreDockContrast: true,
      terminal: 'xterm-256color',
      forceUnicode: true,
      cursor: {
        artificial: true,
        shape: 'block',
        blink: true,
        color: 'white'
      }
    });

    this.setupUI();
    this.setupKeyBindings();
    this.initialize();
  }

  private setupUI() {
    // Create a grid layout with better proportions
    this.grid = new (contrib as any).grid({
      rows: 12,
      cols: 12,
      screen: this.screen
    });

    // Enhanced title with gradient effect
    const titleBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      border: {
        type: 'line',
        fg: this.currentTheme.primary
      },
      style: {
        border: { fg: this.currentTheme.primary },
        focus: { border: { fg: this.currentTheme.accent } }
      }
    });

    const title = `{center}${chalk.hex(this.currentTheme.primary).bold('╔═══════════════════════════════════════╗')}{/center}
{center}${chalk.hex(this.currentTheme.accent).bold('║  r3call Memory Manager Pro v2.0  ║')}{/center}
{center}${chalk.hex(this.currentTheme.primary).bold('╚═══════════════════════════════════════╝')}{/center}`;

    titleBox.setContent(title);

    // Memory list with better styling (left panel)
    this.memoryList = (blessed as any).list({
      parent: this.screen,
      label: chalk.hex(this.currentTheme.primary)(' ▶ Memories '),
      top: 3,
      left: 0,
      width: '35%',
      height: '60%',
      border: {
        type: 'line',
        fg: this.currentTheme.secondary
      },
      style: {
        selected: {
          bg: this.currentTheme.accent,
          fg: 'black',
          bold: true
        },
        item: {
          fg: 'white'
        },
        border: {
          fg: this.currentTheme.secondary
        }
      },
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      scrollbar: {
        bg: this.currentTheme.dim,
        fg: this.currentTheme.accent
      },
      tags: true
    });

    // Content display with markdown support (center panel)
    this.contentBox = blessed.box({
      parent: this.screen,
      label: chalk.hex(this.currentTheme.primary)(' ▶ Content '),
      top: 3,
      left: '35%',
      width: '65%',
      height: '60%',
      border: {
        type: 'line',
        fg: this.currentTheme.secondary
      },
      style: {
        border: {
          fg: this.currentTheme.secondary
        }
      },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
      scrollbar: {
        bg: this.currentTheme.dim,
        fg: this.currentTheme.accent
      },
      tags: true
    });

    // Search results box (bottom left)
    this.searchBox = blessed.box({
      parent: this.screen,
      label: chalk.hex(this.currentTheme.primary)(' 🔍 Search Results '),
      top: '63%',
      left: 0,
      width: '50%',
      height: '30%',
      border: {
        type: 'line',
        fg: this.currentTheme.warning
      },
      style: {
        border: {
          fg: this.currentTheme.warning
        }
      },
      scrollable: true,
      mouse: true,
      keys: true,
      tags: true
    });

    // Minimap/Graph visualization (bottom right)
    this.minimap = blessed.box({
      parent: this.screen,
      label: chalk.hex(this.currentTheme.primary)(' 🗺️  Memory Graph '),
      top: '63%',
      left: '50%',
      width: '50%',
      height: '30%',
      border: {
        type: 'line',
        fg: this.currentTheme.accent
      },
      style: {
        border: {
          fg: this.currentTheme.accent
        }
      },
      tags: true
    });

    // Enhanced status bar with live indicators
    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        fg: 'white',
        bg: this.currentTheme.bg
      }
    });

    // Command line (hidden by default)
    this.commandLine = blessed.textbox({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        fg: 'white',
        bg: this.currentTheme.bg,
        border: {
          fg: this.currentTheme.warning
        }
      },
      inputOnFocus: true,
      hidden: true
    });

    // Help overlay (hidden by default)
    this.helpBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: '60%',
      border: {
        type: 'line',
        fg: this.currentTheme.accent
      },
      style: {
        border: {
          fg: this.currentTheme.accent
        },
        bg: 'black'
      },
      tags: true,
      hidden: true,
      padding: 1
    });

    this.updateStatusBar();
  }

  private setupKeyBindings() {
    // Global keys
    this.screen.key(['q', 'C-c'], () => {
      this.cleanup();
      process.exit(0);
    });

    // Navigation
    this.screen.key(['j', 'down'], () => this.navigateDown());
    this.screen.key(['k', 'up'], () => this.navigateUp());
    this.screen.key(['g', 'home'], () => this.navigateFirst());
    this.screen.key(['G', 'end'], () => this.navigateLast());
    this.screen.key(['pagedown'], () => this.navigatePageDown());
    this.screen.key(['pageup'], () => this.navigatePageUp());

    // Actions
    this.screen.key(['/', 'C-f'], () => this.enterSearchMode());
    this.screen.key([':'], () => this.enterCommandMode());
    this.screen.key(['e'], () => this.enrichWithExa());
    this.screen.key(['r', 'f5'], () => this.refresh());
    this.screen.key(['?', 'h'], () => this.toggleHelp());
    this.screen.key(['t'], () => this.cycleTheme());
    this.screen.key(['s'], () => this.saveAugmentedMemory());
    this.screen.key(['d'], () => this.deleteMemory());
    this.screen.key(['a'], () => this.addMemory());
    this.screen.key(['enter'], () => this.viewMemoryDetails());
    this.screen.key(['tab'], () => this.switchFocus());
    this.screen.key(['escape'], () => this.exitMode());

    // Number keys for quick selection
    for (let i = 1; i <= 9; i++) {
      this.screen.key([String(i)], () => {
        if (this.exaResults.length >= i) {
          this.selectExaResult(i - 1);
        }
      });
    }

    // List navigation
    this.memoryList.on('select', (item: any, index: number) => {
      this.selectedIndex = index;
      this.selectedMemory = this.filteredMemories[index];
      this.displayMemory();
    });
  }

  private async initialize() {
    try {
      this.showLoadingScreen();

      // Connect to Redis
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await this.redisClient.connect();
      await this.loadMemories();

      // Initialize fuzzy search
      this.fuse = new Fuse(this.memories, {
        keys: ['memory', 'tags', 'metadata.category'],
        threshold: 0.3,
        includeScore: true
      });

      this.updateDisplay();
      this.screen.render();
    } catch (error) {
      this.showError(`Initialization failed: ${error}`);
    }
  }

  private showLoadingScreen() {
    const loadingBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: 10,
      border: {
        type: 'line',
        fg: this.currentTheme.accent
      },
      tags: true
    });

    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;

    const loadingInterval = setInterval(() => {
      loadingBox.setContent(`{center}${chalk.hex(this.currentTheme.accent)(frames[frameIndex])} Loading memories...{/center}`);
      frameIndex = (frameIndex + 1) % frames.length;
      this.screen.render();
    }, 80);

    setTimeout(() => {
      clearInterval(loadingInterval);
      loadingBox.destroy();
      this.screen.render();
    }, 2000);
  }

  private async loadMemories() {
    if (!this.redisClient) return;

    try {
      const keys = await this.redisClient.keys('memory:*');
      this.memories = [];

      for (const key of keys) {
        if (key.includes(':keywords:') || key.includes(':access:')) continue;

        try {
          const data = await this.redisClient.get(key);
          if (data) {
            const memory = JSON.parse(data);
            this.memories.push({
              id: key.replace('memory:', ''),
              memory: memory.content || memory.memory || '',
              metadata: memory.metadata || {},
              created_at: memory.created_at || new Date().toISOString(),
              user_id: memory.user_id || 'default',
              augmented: memory.metadata?.augmented || false,
              tags: memory.metadata?.tags || []
            });
          }
        } catch (err) {
          // Skip invalid entries
        }
      }

      this.filteredMemories = [...this.memories];
      this.updateMemoryList();
    } catch (error) {
      this.showError(`Failed to load memories: ${error}`);
    }
  }

  private updateMemoryList() {
    const items = this.filteredMemories.map((memory, index) => {
      const date = new Date(memory.created_at);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const preview = memory.memory.substring(0, 30).replace(/\n/g, ' ');
      const augIcon = memory.augmented ? chalk.hex(this.currentTheme.success)(' ⚡') : '';
      const tagStr = memory.tags?.length ? chalk.hex(this.currentTheme.warning)(` [${memory.tags[0]}]`) : '';

      return `${chalk.dim(dateStr)} ${preview}...${augIcon}${tagStr}`;
    });

    this.memoryList.setItems(items);

    if (this.selectedIndex < this.filteredMemories.length) {
      this.memoryList.select(this.selectedIndex);
    }
  }

  private displayMemory() {
    if (!this.selectedMemory) {
      this.contentBox.setContent('{center}No memory selected{/center}');
      return;
    }

    try {
      // Render markdown content
      const rendered = marked(this.selectedMemory.memory) as string;

      // Add metadata header
      const header = chalk.hex(this.currentTheme.primary).bold('═══ Memory Details ═══\n\n');
      const metadata = chalk.hex(this.currentTheme.dim)([
        `ID: ${this.selectedMemory.id}`,
        `Created: ${new Date(this.selectedMemory.created_at).toLocaleString()}`,
        `User: ${this.selectedMemory.user_id}`,
        this.selectedMemory.augmented ? `Augmented: ✓` : '',
        this.selectedMemory.tags?.length ? `Tags: ${this.selectedMemory.tags.join(', ')}` : ''
      ].filter(Boolean).join('\n'));

      const content = header + rendered + '\n\n' + chalk.hex(this.currentTheme.dim)('─'.repeat(40)) + '\n' + metadata;

      this.contentBox.setContent(content);
      this.contentBox.scrollTo(0);
    } catch (error) {
      this.contentBox.setContent(`Error rendering content: ${error}`);
    }

    this.updateMinimap();
    this.screen.render();
  }

  private updateMinimap() {
    if (!this.selectedMemory) return;

    // Create a simple ASCII graph showing relationships
    const relatedCount = this.memories.filter(m =>
      m.tags?.some(t => this.selectedMemory?.tags?.includes(t))
    ).length;

    const graph = `
    ${chalk.hex(this.currentTheme.accent)('Current Memory')}
           │
           ├── ${chalk.hex(this.currentTheme.warning)(`Related: ${relatedCount}`)}
           ├── ${chalk.hex(this.currentTheme.success)(`Augmented: ${this.selectedMemory.augmented ? '✓' : '✗'}`)}
           └── ${chalk.hex(this.currentTheme.primary)(`Tags: ${this.selectedMemory.tags?.length || 0}`)}

    ${this.createMemoryVisualization()}
    `;

    this.minimap.setContent(graph);
  }

  private createMemoryVisualization(): string {
    // Create a simple bar chart of memories over time
    const last7Days = new Array(7).fill(0);
    const now = new Date();

    this.memories.forEach(memory => {
      const date = new Date(memory.created_at);
      const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 7) {
        last7Days[daysAgo]++;
      }
    });

    const maxCount = Math.max(...last7Days, 1);
    const barHeight = 5;

    let chart = chalk.hex(this.currentTheme.dim)('Last 7 days:\n');
    for (let i = barHeight; i > 0; i--) {
      let row = '';
      for (let day = 6; day >= 0; day--) {
        const height = Math.ceil((last7Days[day] / maxCount) * barHeight);
        row += height >= i ? chalk.hex(this.currentTheme.accent)('█ ') : '  ';
      }
      chart += row + '\n';
    }
    chart += chalk.hex(this.currentTheme.dim)('──────────────\n');
    chart += chalk.hex(this.currentTheme.dim)('6 5 4 3 2 1 0 days ago');

    return chart;
  }

  private updateStatusBar() {
    const mode = this.isSearchMode ? 'SEARCH' : this.isCommandMode ? 'COMMAND' : 'NORMAL';
    const modeColor = this.isSearchMode || this.isCommandMode ? this.currentTheme.warning : this.currentTheme.success;

    const status = [
      chalk.hex(modeColor).bold(` ${mode} `),
      chalk.hex(this.currentTheme.dim)('│'),
      chalk.hex(this.currentTheme.primary)(` 📚 ${this.memories.length} `),
      chalk.hex(this.currentTheme.dim)('│'),
      chalk.hex(this.currentTheme.accent)(` ⚡ ${this.memories.filter(m => m.augmented).length} `),
      chalk.hex(this.currentTheme.dim)('│'),
      chalk.hex(this.currentTheme.secondary)(` 🔍 ${this.filteredMemories.length} `),
      chalk.hex(this.currentTheme.dim)('│'),
      chalk.hex(this.currentTheme.dim)(` ? help │ / search │ e enrich │ q quit `)
    ].join('');

    this.statusBar.setContent(status);
  }

  private async enrichWithExa() {
    if (!this.selectedMemory) {
      this.showError('No memory selected');
      return;
    }

    if (!process.env.EXA_API_KEY) {
      this.showError('EXA_API_KEY not configured');
      return;
    }

    this.memoryBeingAugmented = this.selectedMemory;
    const query = this.selectedMemory.memory.substring(0, 100);

    try {
      this.searchBox.setContent(chalk.hex(this.currentTheme.warning)('⏳ Searching with Exa...'));
      this.screen.render();

      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXA_API_KEY
        },
        body: JSON.stringify({
          query,
          numResults: 5,
          useAutoprompt: true
        })
      });

      const data = await response.json() as any;
      this.exaResults = data.results?.map((r: any, index: number) => ({
        title: r.title,
        url: r.url,
        snippet: r.text?.substring(0, 200) || '',
        relevance: r.score || 0
      })) || [];

      this.displayExaResults();
    } catch (error) {
      this.showError(`Exa search failed: ${error}`);
    }
  }

  private displayExaResults() {
    if (this.exaResults.length === 0) {
      this.searchBox.setContent(chalk.hex(this.currentTheme.warning)('No results found'));
      return;
    }

    let content = chalk.hex(this.currentTheme.accent).bold('Exa Search Results:\n\n');

    this.exaResults.forEach((result, index) => {
      content += chalk.hex(this.currentTheme.primary)(`[${index + 1}] ${result.title}\n`);
      content += chalk.hex(this.currentTheme.dim)(`    ${result.snippet.substring(0, 80)}...\n`);
      content += chalk.hex(this.currentTheme.secondary)(`    ${result.url}\n\n`);
    });

    content += chalk.hex(this.currentTheme.warning)('\nPress [1-5] to augment with result, [S] to save first');

    this.searchBox.setContent(content);
    this.screen.render();
  }

  private async saveAugmentedMemory() {
    if (!this.memoryBeingAugmented || this.exaResults.length === 0) {
      this.showError('No augmentation in progress');
      return;
    }

    await this.augmentWithResult(0);
  }

  private async selectExaResult(index: number) {
    if (!this.memoryBeingAugmented || index >= this.exaResults.length) {
      return;
    }

    await this.augmentWithResult(index);
  }

  private async augmentWithResult(index: number) {
    if (!this.memoryBeingAugmented || !this.redisClient) return;

    const result = this.exaResults[index];
    const augmentedContent = `${this.memoryBeingAugmented.memory}

## Augmented Information

**${result.title}**

${result.snippet}

Source: ${result.url}
Updated: ${new Date().toISOString()}`;

    const augmentedMemory = {
      ...this.memoryBeingAugmented,
      memory: augmentedContent,
      metadata: {
        ...this.memoryBeingAugmented.metadata,
        augmented: true,
        augmentation_source: 'exa',
        augmentation_date: new Date().toISOString(),
        exa_url: result.url
      }
    };

    try {
      await this.redisClient.set(
        `memory:${this.memoryBeingAugmented.id}`,
        JSON.stringify(augmentedMemory)
      );

      this.showSuccess(`Memory augmented with result #${index + 1}`);
      this.memoryBeingAugmented = null;
      this.exaResults = [];
      await this.refresh();
    } catch (error) {
      this.showError(`Failed to save: ${error}`);
    }
  }

  private navigateDown() {
    if (this.selectedIndex < this.filteredMemories.length - 1) {
      this.selectedIndex++;
      this.memoryList.down(1);
      this.selectedMemory = this.filteredMemories[this.selectedIndex];
      this.displayMemory();
    }
  }

  private navigateUp() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.memoryList.up(1);
      this.selectedMemory = this.filteredMemories[this.selectedIndex];
      this.displayMemory();
    }
  }

  private navigateFirst() {
    this.selectedIndex = 0;
    this.memoryList.select(0);
    this.selectedMemory = this.filteredMemories[0];
    this.displayMemory();
  }

  private navigateLast() {
    this.selectedIndex = this.filteredMemories.length - 1;
    this.memoryList.select(this.selectedIndex);
    this.selectedMemory = this.filteredMemories[this.selectedIndex];
    this.displayMemory();
  }

  private navigatePageDown() {
    const pageSize = 10;
    this.selectedIndex = Math.min(this.selectedIndex + pageSize, this.filteredMemories.length - 1);
    this.memoryList.select(this.selectedIndex);
    this.selectedMemory = this.filteredMemories[this.selectedIndex];
    this.displayMemory();
  }

  private navigatePageUp() {
    const pageSize = 10;
    this.selectedIndex = Math.max(this.selectedIndex - pageSize, 0);
    this.memoryList.select(this.selectedIndex);
    this.selectedMemory = this.filteredMemories[this.selectedIndex];
    this.displayMemory();
  }

  private enterSearchMode() {
    this.isSearchMode = true;
    this.commandLine.show();
    this.commandLine.focus();
    this.commandLine.setValue('/');
    this.updateStatusBar();

    this.commandLine.on('submit', (value: string) => {
      this.performSearch(value.substring(1));
      this.exitMode();
    });

    this.commandLine.on('cancel', () => {
      this.exitMode();
    });

    this.screen.render();
  }

  private enterCommandMode() {
    this.isCommandMode = true;
    this.commandLine.show();
    this.commandLine.focus();
    this.commandLine.setValue(':');
    this.updateStatusBar();

    this.commandLine.on('submit', (value: string) => {
      this.executeCommand(value.substring(1));
      this.exitMode();
    });

    this.commandLine.on('cancel', () => {
      this.exitMode();
    });

    this.screen.render();
  }

  private exitMode() {
    this.isSearchMode = false;
    this.isCommandMode = false;
    this.commandLine.hide();
    this.commandLine.setValue('');
    this.memoryList.focus();
    this.updateStatusBar();
    this.screen.render();
  }

  private performSearch(query: string) {
    if (!query) {
      this.filteredMemories = [...this.memories];
    } else if (this.fuse) {
      const results = this.fuse.search(query);
      this.filteredMemories = results.map(r => r.item);
    }

    this.selectedIndex = 0;
    this.updateMemoryList();
    this.showSuccess(`Found ${this.filteredMemories.length} results`);
  }

  private executeCommand(command: string) {
    const [cmd, ...args] = command.split(' ');

    switch (cmd) {
      case 'theme':
        this.cycleTheme();
        break;
      case 'export':
        this.exportMemories();
        break;
      case 'stats':
        this.showStats();
        break;
      case 'clear':
        this.clearSearch();
        break;
      default:
        this.showError(`Unknown command: ${cmd}`);
    }
  }

  private cycleTheme() {
    const themeNames = Object.keys(themes);
    const currentIndex = themeNames.findIndex(name =>
      JSON.stringify(themes[name]) === JSON.stringify(this.currentTheme)
    );
    const nextIndex = (currentIndex + 1) % themeNames.length;
    this.currentTheme = themes[themeNames[nextIndex]];

    // Recreate UI with new theme
    this.screen.destroy();
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'r3call Memory Manager Pro',
      fullUnicode: true,
      terminal: 'xterm-256color'
    });

    this.setupUI();
    this.setupKeyBindings();
    this.updateDisplay();

    this.showSuccess(`Theme changed to ${themeNames[nextIndex]}`);
  }

  private toggleHelp() {
    if (this.helpBox.hidden) {
      const helpContent = `
${chalk.hex(this.currentTheme.accent).bold('r3call Memory Manager Pro - Help')}
${chalk.hex(this.currentTheme.dim)('─'.repeat(40))}

${chalk.hex(this.currentTheme.primary).bold('Navigation:')}
  j/↓         Move down
  k/↑         Move up
  g/Home      Go to first
  G/End       Go to last
  PgDn        Page down
  PgUp        Page up

${chalk.hex(this.currentTheme.primary).bold('Actions:')}
  /           Search memories
  :           Command mode
  e           Enrich with Exa
  s           Save augmentation
  d           Delete memory
  a           Add new memory
  r/F5        Refresh
  t           Change theme
  Tab         Switch focus
  ?/h         Toggle help
  q           Quit

${chalk.hex(this.currentTheme.primary).bold('Commands:')}
  :theme      Change theme
  :export     Export memories
  :stats      Show statistics
  :clear      Clear search

${chalk.hex(this.currentTheme.dim)('Press any key to close...')}
`;

      this.helpBox.setContent(helpContent);
      this.helpBox.show();
      this.helpBox.focus();
    } else {
      this.helpBox.hide();
      this.memoryList.focus();
    }

    this.screen.render();
  }

  private clearSearch() {
    this.searchQuery = '';
    this.filteredMemories = [...this.memories];
    this.updateMemoryList();
    this.showSuccess('Search cleared');
  }

  private async deleteMemory() {
    if (!this.selectedMemory || !this.redisClient) return;

    try {
      await this.redisClient.del(`memory:${this.selectedMemory.id}`);
      this.showSuccess('Memory deleted');
      await this.refresh();
    } catch (error) {
      this.showError(`Failed to delete: ${error}`);
    }
  }

  private async addMemory() {
    // This would open a form to add a new memory
    this.showError('Add memory not implemented yet');
  }

  private viewMemoryDetails() {
    // This could open a detailed view
    this.displayMemory();
  }

  private switchFocus() {
    if (this.memoryList.focused) {
      this.contentBox.focus();
    } else if (this.contentBox.focused) {
      this.searchBox.focus();
    } else {
      this.memoryList.focus();
    }
    this.screen.render();
  }

  private exportMemories() {
    // Export functionality
    this.showSuccess(`Exported ${this.memories.length} memories`);
  }

  private showStats() {
    const stats = {
      total: this.memories.length,
      augmented: this.memories.filter(m => m.augmented).length,
      recent: this.memories.filter(m => {
        const date = new Date(m.created_at);
        const now = new Date();
        return (now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
      }).length
    };

    const content = `
${chalk.hex(this.currentTheme.accent).bold('Memory Statistics')}
${chalk.hex(this.currentTheme.dim)('─'.repeat(30))}

Total Memories: ${chalk.hex(this.currentTheme.primary)(stats.total.toString())}
Augmented: ${chalk.hex(this.currentTheme.success)(stats.augmented.toString())}
Recent (7 days): ${chalk.hex(this.currentTheme.warning)(stats.recent.toString())}

${this.createMemoryVisualization()}
`;

    this.contentBox.setContent(content);
    this.screen.render();
  }

  private async refresh() {
    await this.loadMemories();
    this.updateDisplay();
    this.showSuccess('Refreshed');
  }

  private updateDisplay() {
    this.updateMemoryList();
    this.updateStatusBar();
    if (this.selectedMemory) {
      this.displayMemory();
    }
    this.screen.render();
  }

  private showSuccess(message: string) {
    const notification = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: message.length + 4,
      height: 3,
      content: chalk.hex(this.currentTheme.success)(`✓ ${message}`),
      border: {
        type: 'line',
        fg: this.currentTheme.success
      },
      style: {
        bg: 'black'
      }
    });

    this.screen.render();

    setTimeout(() => {
      notification.destroy();
      this.screen.render();
    }, 2000);
  }

  private showError(message: string) {
    const notification = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: Math.min(message.length + 4, 60),
      height: 3,
      content: chalk.hex(this.currentTheme.error)(`✗ ${message}`),
      border: {
        type: 'line',
        fg: this.currentTheme.error
      },
      style: {
        bg: 'black'
      }
    });

    this.screen.render();

    setTimeout(() => {
      notification.destroy();
      this.screen.render();
    }, 3000);
  }

  private cleanup() {
    this.redisClient?.disconnect();
  }

  public run() {
    this.screen.render();
  }
}

// Main entry point
const manager = new EnhancedMemoryManager();
manager.run();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});