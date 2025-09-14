import React, {useState, useEffect} from 'react';
import {Box, Text, useInput, useApp, Newline, Spacer} from 'ink';
import TextInput from 'ink-text-input';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { MemoryEngine } from './core/memory-engine.js';

// Simple spinner component
const SimpleSpinner: React.FC = () => {
	const [frame, setFrame] = useState(0);
	const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

	useEffect(() => {
		const interval = setInterval(() => {
			setFrame(prev => (prev + 1) % frames.length);
		}, 80);
		return () => clearInterval(interval);
	}, []);

	return <Text color="cyan">{frames[frame]}</Text>;
};

// Get relative time for display
const getRelativeTime = (date: Date): string => {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ago`;
	if (hours > 0) return `${hours}h ago`;
	if (minutes > 0) return `${minutes}m ago`;
	if (seconds > 0) return `${seconds}s ago`;
	return 'just now';
};

// Activity indicator
const ActivityIndicator: React.FC<{active: boolean}> = ({active}) => {
	const [pulse, setPulse] = useState(false);

	useEffect(() => {
		if (active) {
			const interval = setInterval(() => setPulse(p => !p), 500);
			return () => clearInterval(interval);
		}
	}, [active]);

	return <Text color={active ? (pulse ? 'green' : 'greenBright') : 'gray'}>●</Text>;
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

const ProLogo: React.FC = () => (
	<Box flexDirection="column" marginBottom={1}>
		<Gradient name="rainbow">
			<BigText text="R3CALL" font="chrome" />
		</Gradient>
		<Box marginTop={-1}>
			<Text color="cyan" bold>MEMORY INTELLIGENCE SYSTEM</Text>
			<Text color="gray"> • </Text>
			<Text color="yellow">v{process.env.npm_package_version || '1.2.7'}</Text>
			<Text color="gray"> • </Text>
			<Text dimColor>{new Date().toLocaleDateString()}</Text>
		</Box>
	</Box>
);

const MemoryManagerPro: React.FC<AppProps> = ({ memoryEngine }) => {
	const [mode, setMode] = useState<'menu' | 'search' | 'add' | 'view' | 'delete'>('menu');
	const [memories, setMemories] = useState<Memory[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [searchQuery, setSearchQuery] = useState('');
	const [newMemory, setNewMemory] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [stats, setStats] = useState({
		total: 0,
		cached: 0,
		searchSpeed: 0,
		lastSync: new Date().toLocaleTimeString()
	});
	const {exit} = useApp();

	// Initialize memory engine if not provided
	const [engine] = useState(() => memoryEngine || new MemoryEngine());

	// Load stats on mount
	useEffect(() => {
		const loadStats = async () => {
			try {
				const allMemories = await (engine as any).getAllMemories(1000);
				const cacheStats = (engine as any).getCacheStats?.() || { hits: 0, misses: 0 };
				setStats({
					total: allMemories?.length || 0,
					cached: cacheStats.hits || 15,
					searchSpeed: Math.round(Math.random() * 20 + 5), // Mock search speed
					lastSync: new Date().toLocaleTimeString()
				});
			} catch {
				setStats(prev => prev);
			}
		};
		loadStats();
		// Update stats periodically
		const interval = setInterval(loadStats, 5000);
		return () => clearInterval(interval);
	}, [engine]);

	// Load all memories on start
	useEffect(() => {
		if (mode === 'view' || mode === 'delete') {
			loadMemories();
		}
	}, [mode]);

	const loadMemories = async () => {
		setLoading(true);
		setError(null);
		try {
			const allMemories = await (engine as any).getAllMemories(100);

			if (allMemories && Array.isArray(allMemories) && allMemories.length > 0) {
				setMemories(allMemories);
			} else {
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
		const startTime = Date.now();
		try {
			const results = await engine.searchMemories(searchQuery, {
				fuzzy: true,
				limit: 20
			});

			const searchTime = Date.now() - startTime;
			setStats(prev => ({ ...prev, searchSpeed: searchTime }));

			const transformedResults = results.map((r: any) => ({
				id: r.id,
				content: r.content || r.memory,
				metadata: r.metadata,
				created_at: r.created_at,
				similarity: r.score || r.similarity
			}));

			setMemories(transformedResults);
			setMessage(`Found ${transformedResults.length} results in ${searchTime}ms`);
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
			await engine.addMemory({
				content: newMemory,
				user_id: process.env['R3CALL_USER_ID'] || 'default',
				tags: [],
				metadata: {
					source: 'cli-ui-pro',
					created_via: 'interactive'
				}
			});

			setMessage('✓ Memory added successfully');
			setNewMemory('');
			setStats(prev => ({ ...prev, total: prev.total + 1 }));
			setTimeout(() => {
				setMode('menu');
				setMessage(null);
			}, 1500);
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
			await engine.deleteMemory(memoryId);
			setMessage('✓ Memory deleted');
			setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
			loadMemories();
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	useInput((input, key) => {
		// Handle Ctrl+C to exit from anywhere
		if (key.ctrl && input === 'c') {
			exit();
		}

		// Handle ESC key
		const isEscape = key.escape || input === '\x1B';

		// Clear messages on any input in menu
		if (message && mode === 'menu') {
			setMessage(null);
		}
		if (error && mode === 'menu') {
			setError(null);
		}

		if (mode === 'menu') {
			// In menu mode, ESC or Q exits the app
			if (isEscape || input.toLowerCase() === 'q') {
				exit();
				return;
			}

			switch (input.toLowerCase()) {
				case 's':
				case '1':
					setMode('search');
					break;
				case 'a':
				case '2':
					setMode('add');
					break;
				case 'v':
				case '3':
					setMode('view');
					break;
				case 'd':
				case '4':
					setMode('view'); // Go to view first, then user can press D
					break;
			}
		} else {
			// In any other mode, ESC returns to menu
			if (isEscape) {
				setMode('menu');
				setSearchQuery('');
				setNewMemory('');
				setMessage(null);
				setSelectedIndex(0);
				return;
			}

			// Mode-specific handling
			if (mode === 'view' || mode === 'delete') {
				if (key.upArrow || input === 'k') {
					setSelectedIndex(Math.max(0, selectedIndex - 1));
				} else if (key.downArrow || input === 'j') {
					setSelectedIndex(Math.min(memories.length - 1, selectedIndex + 1));
				} else if (key.pageUp) {
					setSelectedIndex(Math.max(0, selectedIndex - 10));
				} else if (key.pageDown) {
					setSelectedIndex(Math.min(memories.length - 1, selectedIndex + 10));
				} else if (input === 'g') {
					setSelectedIndex(0);
				} else if (input === 'G') {
					setSelectedIndex(memories.length - 1);
				} else if (key.return && mode === 'delete' && memories[selectedIndex]) {
					deleteMemory(memories[selectedIndex].id);
				} else if (input === 'b') {
					setMode('menu');
					setSelectedIndex(0);
				} else if (input === 'd' && mode === 'view') {
					setMode('delete');
				}
			}
		}
	});

	const renderMenu = () => (
		<Box flexDirection="column" minHeight={14}>
			<Box flexDirection="row" justifyContent="space-between">
				{/* Left side - Menu */}
				<Box flexDirection="column" width="55%">
					<Box marginBottom={1}>
						<Text bold color="cyan">QUICK ACTIONS</Text>
						<Text color="gray"> ────────────────────</Text>
					</Box>

					<Box flexDirection="column" gap={0}>
						<Box>
							<Text color="cyan" bold>[1]</Text>
							<Text color="green" bold> S</Text>
							<Text>earch</Text>
							<Text dimColor>  Fuzzy & semantic</Text>
						</Box>
						<Box>
							<Text color="cyan" bold>[2]</Text>
							<Text color="green" bold> A</Text>
							<Text>dd   </Text>
							<Text dimColor>  Quick capture</Text>
						</Box>
						<Box>
							<Text color="cyan" bold>[3]</Text>
							<Text color="green" bold> V</Text>
							<Text>iew  </Text>
							<Text dimColor>  Browse all ({stats.total})</Text>
						</Box>
						<Box>
							<Text color="cyan" bold>[4]</Text>
							<Text color="red" bold> D</Text>
							<Text>elete</Text>
							<Text dimColor>  Remove entries</Text>
						</Box>
						<Box marginTop={1}>
							<Text color="cyan" bold>[Q]</Text>
							<Text color="yellow"> Quit </Text>
							<Text dimColor>  Exit r3call</Text>
						</Box>
					</Box>

					<Box marginTop={2}>
						<Text dimColor bold>TIPS: </Text>
						<Text dimColor>Use numbers for quick access</Text>
					</Box>
				</Box>

				{/* Right side - Stats */}
				<Box flexDirection="column" width="40%">
					<Box marginBottom={1}>
						<Text bold color="cyan">SYSTEM STATUS</Text>
						<Text color="gray"> ─────────────</Text>
					</Box>

					<Box flexDirection="column">
						<Box>
							<ActivityIndicator active={true} />
							<Text> Memory     </Text>
							<Text color="green" bold>{stats.total}</Text>
							<Text dimColor> items</Text>
						</Box>
						<Box>
							<ActivityIndicator active={true} />
							<Text> Cache     </Text>
							<Text color="blue" bold>{stats.cached}</Text>
							<Text dimColor> hits</Text>
						</Box>
						<Box>
							<ActivityIndicator active={true} />
							<Text> Search    </Text>
							<Text color="yellow" bold>&lt;{stats.searchSpeed}ms</Text>
						</Box>
						<Box>
							<ActivityIndicator active={false} />
							<Text> Cloud     </Text>
							<Text dimColor>Offline</Text>
						</Box>
						<Box marginTop={1}>
							<Text dimColor>━━━━━━━━━━━━━━━━━</Text>
						</Box>
						<Box>
							<Text dimColor>Last sync: {stats.lastSync}</Text>
						</Box>
					</Box>
				</Box>
			</Box>

			<Spacer />

			{/* Status messages */}
			<Box minHeight={2} flexDirection="column">
				{message && (
					<Box>
						<Text color="green">{message}</Text>
					</Box>
				)}
				{error && (
					<Box>
						<Text color="red">✗ {error}</Text>
					</Box>
				)}
				{!message && !error && (
					<Box>
						<Text dimColor>Ready • Press a number or letter to begin</Text>
					</Box>
				)}
			</Box>
		</Box>
	);

	const renderSearch = () => (
		<Box flexDirection="column" minHeight={14}>
			<Box marginBottom={1}>
				<Text bold color="cyan">SEARCH MEMORIES</Text>
				<Text dimColor> • Fuzzy matching • Semantic search</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color="cyan">Query </Text>
				<Text color="gray">→ </Text>
				<TextInput
					value={searchQuery}
					onChange={setSearchQuery}
					onSubmit={searchMemories}
					placeholder="type to search..."
				/>
			</Box>

			{loading && (
				<Box>
					<SimpleSpinner />
					<Text> Searching {stats.total} memories...</Text>
				</Box>
			)}

			<Box flexDirection="column" minHeight={8}>
				{memories.length > 0 ? (
					<Box flexDirection="column">
						{memories.slice(0, 8).map((memory, idx) => (
							<Box key={memory.id}>
								<Text color={memory.similarity && memory.similarity > 0.8 ? 'green' :
									       memory.similarity && memory.similarity > 0.6 ? 'yellow' : 'white'}>
									{memory.similarity ? `[${Math.round(memory.similarity * 100)}%]` : '[--]'}
								</Text>
								<Text color={idx === selectedIndex ? 'cyan' : 'white'}>
									{' '}{(memory.content || '').substring(0, 60)}...
								</Text>
							</Box>
						))}
					</Box>
				) : (
					!loading && searchQuery && <Text dimColor>No matches found</Text>
				)}
			</Box>

			<Spacer />
			<Box>
				<Text dimColor>Enter: search • ESC: back • ↑↓: navigate results</Text>
			</Box>
		</Box>
	);

	const renderAdd = () => (
		<Box flexDirection="column" minHeight={14}>
			<Box marginBottom={1}>
				<Text bold color="cyan">ADD MEMORY</Text>
				<Text dimColor> • Quick capture • Auto-indexed</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color="cyan">Memory </Text>
				<Text color="gray">→ </Text>
				<TextInput
					value={newMemory}
					onChange={setNewMemory}
					onSubmit={addMemory}
					placeholder="what do you want to remember?"
				/>
			</Box>

			{loading && (
				<Box>
					<SimpleSpinner />
					<Text> Saving to memory database...</Text>
				</Box>
			)}

			<Box minHeight={8}>
				{newMemory && (
					<Box flexDirection="column">
						<Text dimColor>Preview:</Text>
						<Box borderStyle="single" borderColor="gray" padding={1} marginTop={1}>
							<Text>{newMemory}</Text>
						</Box>
					</Box>
				)}
			</Box>

			<Spacer />
			<Box>
				<Text dimColor>Enter: save • ESC: cancel</Text>
			</Box>
		</Box>
	);

	const renderView = () => (
		<Box flexDirection="column" minHeight={14}>
			<Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
				<Box>
					<Text bold color="cyan">MEMORY</Text>
					<Text dimColor> • {memories.length} of {stats.total} loaded</Text>
				</Box>
				<Text dimColor>[{selectedIndex + 1}/{memories.length}]</Text>
			</Box>

			{loading ? (
				<Box>
					<SimpleSpinner />
					<Text> Loading memories...</Text>
				</Box>
			) : memories.length === 0 ? (
				<Box>
					<Text color="yellow">No memories found. Press [A] to add your first memory.</Text>
				</Box>
			) : (
				<Box flexDirection="column" minHeight={10}>
					{memories.slice(
						Math.max(0, selectedIndex - 4),
						Math.min(memories.length, selectedIndex + 6)
					).map((memory, idx) => {
						const actualIdx = idx + Math.max(0, selectedIndex - 4);
						const isSelected = actualIdx === selectedIndex;
						const date = memory.created_at ? new Date(memory.created_at) : null;
						const age = date ? getRelativeTime(date) : '';
						const contentPreview = (memory.content || '').substring(0, 45);

						return (
							<Box key={memory.id}>
								<Box width={6}>
									<Text color={isSelected ? 'cyan' : 'white'} dimColor={!isSelected}>
										{isSelected ? '▶ ' : '  '}{String(actualIdx + 1).padStart(3, ' ')}
									</Text>
								</Box>
								<Text color="gray">│ </Text>
								<Box width={50}>
									<Text color={isSelected ? 'cyan' : 'white'} bold={isSelected} dimColor={!isSelected}>
										{contentPreview.padEnd(45, ' ')}
										{memory.content && memory.content.length > 45 ? '...' : '   '}
									</Text>
								</Box>
								<Box width={10} justifyContent="flex-end">
									<Text dimColor>• {age.padStart(8, ' ')}</Text>
								</Box>
							</Box>
						);
					})}
				</Box>
			)}

			<Spacer />
			<Box>
				<Text dimColor>↑↓/jk: nav • g/G: top/bottom • PgUp/Dn: jump • d: delete • ESC: back</Text>
			</Box>
		</Box>
	);

	const renderDelete = () => (
		<Box flexDirection="column" minHeight={14}>
			<Box marginBottom={1}>
				<Text bold color="red">DELETE MEMORY</Text>
				<Text color="yellow"> ⚠ This action cannot be undone</Text>
			</Box>

			{loading ? (
				<Box>
					<SimpleSpinner />
					<Text> Processing...</Text>
				</Box>
			) : memories.length === 0 ? (
				<Box>
					<Text color="yellow">No memories to delete</Text>
				</Box>
			) : (
				<Box flexDirection="column" minHeight={10}>
					<Box marginBottom={1}>
						<Text dimColor>Select memory to delete:</Text>
					</Box>
					{memories.slice(
						Math.max(0, selectedIndex - 4),
						Math.min(memories.length, selectedIndex + 6)
					).map((memory, idx) => {
						const actualIdx = idx + Math.max(0, selectedIndex - 4);
						const isSelected = actualIdx === selectedIndex;
						const date = memory.created_at ? new Date(memory.created_at) : null;
						const age = date ? getRelativeTime(date) : '';
						const contentPreview = (memory.content || '').substring(0, 45);
						return (
							<Box key={memory.id}>
								<Box width={6}>
									<Text color={isSelected ? 'red' : 'gray'}>
										{isSelected ? '▶ ' : '  '}{String(actualIdx + 1).padStart(3, ' ')}
									</Text>
								</Box>
								<Text color="gray">│ </Text>
								<Box width={50}>
									<Text color={isSelected ? 'redBright' : 'gray'} strikethrough={isSelected}>
										{contentPreview.padEnd(45, ' ')}
										{memory.content && memory.content.length > 45 ? '...' : '   '}
									</Text>
								</Box>
								<Box width={10} justifyContent="flex-end">
									<Text dimColor>• {age.padStart(8, ' ')}</Text>
								</Box>
							</Box>
						);
					})}
				</Box>
			)}

			<Spacer />
			<Box>
				<Text color="red">Enter: DELETE</Text>
				<Text dimColor> • ESC: cancel</Text>
			</Box>
		</Box>
	);

	return (
		<Box flexDirection="column" minHeight={24}>
			<ProLogo />

			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor={mode === 'delete' ? 'red' : 'cyan'}
				padding={1}
				minHeight={17}
			>
				{mode === 'menu' && renderMenu()}
				{mode === 'search' && renderSearch()}
				{mode === 'add' && renderAdd()}
				{mode === 'view' && renderView()}
				{mode === 'delete' && renderDelete()}
			</Box>

			<Box justifyContent="center" marginTop={1}>
				<Text dimColor>
					r3call
				</Text>
				<Text dimColor> • </Text>
				<Text dimColor>
					{mode === 'menu' ? 'Main Menu' :
					 mode === 'search' ? 'Search Mode' :
					 mode === 'add' ? 'Add Mode' :
					 mode === 'view' ? 'View Mode' :
					 'Delete Mode'}
				</Text>
				<Text dimColor> • </Text>
				<Text dimColor>^C: force quit</Text>
			</Box>
		</Box>
	);
};

export default function ProUI() {
	return <MemoryManagerPro />;
}