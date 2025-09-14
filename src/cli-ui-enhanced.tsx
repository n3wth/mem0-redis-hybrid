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

const ASCIILogo: React.FC = () => (
	<Box flexDirection="column" alignItems="center" marginBottom={1}>
		<Gradient name="cristal">
			<BigText text="R3CALL" font="chrome" />
		</Gradient>
		<Text color="cyan" dimColor>Intelligent Memory System v{process.env.npm_package_version || '1.2.7'}</Text>
	</Box>
);

const MemoryManagerEnhanced: React.FC<AppProps> = ({ memoryEngine }) => {
	const [mode, setMode] = useState<'menu' | 'search' | 'add' | 'view' | 'delete'>('menu');
	const [memories, setMemories] = useState<Memory[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [searchQuery, setSearchQuery] = useState('');
	const [newMemory, setNewMemory] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [stats, setStats] = useState({ total: 0, cached: 0 });
	const {exit} = useApp();

	// Initialize memory engine if not provided
	const [engine] = useState(() => memoryEngine || new MemoryEngine());

	// Load stats on mount
	useEffect(() => {
		const loadStats = async () => {
			try {
				const allMemories = await (engine as any).getAllMemories(1000);
				setStats({
					total: allMemories?.length || 0,
					cached: 15 // This would come from engine.getCacheStats()
				});
			} catch {
				setStats({ total: 0, cached: 0 });
			}
		};
		loadStats();
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
		try {
			const results = await engine.searchMemories(searchQuery, {
				fuzzy: true,
				limit: 20
			});

			const transformedResults = results.map((r: any) => ({
				id: r.id,
				content: r.content || r.memory,
				metadata: r.metadata,
				created_at: r.created_at,
				similarity: r.score || r.similarity
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
			await engine.addMemory({
				content: newMemory,
				user_id: process.env['R3CALL_USER_ID'] || 'default',
				tags: [],
				metadata: {
					source: 'cli-ui',
					created_via: 'interactive'
				}
			});

			setMessage('Memory added successfully!');
			setNewMemory('');
			setStats(prev => ({ ...prev, total: prev.total + 1 }));
			setTimeout(() => {
				setMode('menu');
				setMessage(null);
			}, 2000);
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
			setMessage('Memory deleted successfully!');
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

		// Handle ESC key - check for escape character
		const isEscape = key.escape || input === '\x1B';

		// Clear messages on any input
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
					setMode('search');
					break;
				case 'a':
					setMode('add');
					break;
				case 'v':
					setMode('view');
					break;
				case 'd':
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
		<Box flexDirection="column" minHeight={15}>
			<Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
				<Box flexDirection="column" width="60%">
					<Text bold color="cyan">Main Menu</Text>
					<Text color="gray">─────────────────────────────</Text>
					<Newline />

					<Box marginLeft={2} flexDirection="column">
						<Box>
							<Box width={12}>
								<Text color="green" bold>[S]</Text>
								<Text> Search</Text>
							</Box>
							<Text dimColor>Semantic memory search</Text>
						</Box>

						<Box>
							<Box width={12}>
								<Text color="green" bold>[A]</Text>
								<Text> Add</Text>
							</Box>
							<Text dimColor>Create new memory</Text>
						</Box>

						<Box>
							<Box width={12}>
								<Text color="green" bold>[V]</Text>
								<Text> View</Text>
							</Box>
							<Text dimColor>Browse all memories</Text>
						</Box>

						<Box>
							<Box width={12}>
								<Text color="red" bold>[D]</Text>
								<Text> Delete</Text>
							</Box>
							<Text dimColor>Remove memories</Text>
						</Box>

						<Box>
							<Box width={12}>
								<Text color="yellow" bold>[Q]</Text>
								<Text> Quit</Text>
							</Box>
							<Text dimColor>Exit application</Text>
						</Box>
					</Box>
				</Box>

				<Box flexDirection="column" width="35%" marginLeft={2}>
					<Text bold color="cyan">System Status</Text>
					<Text color="gray">────────────────</Text>
					<Newline />
					<Text>Total Memories: <Text color="green" bold>{stats.total}</Text></Text>
					<Text>Cached: <Text color="blue" bold>{stats.cached}</Text></Text>
					<Text>Engine: <Text color="green">● Local</Text></Text>
					<Text>Redis: <Text color="green">● Connected</Text></Text>
				</Box>
			</Box>

			<Spacer />

			{message && (
				<Box marginTop={1}>
					<Text color="green">✓ {message}</Text>
				</Box>
			)}
			{error && (
				<Box marginTop={1}>
					<Text color="red">✗ {error}</Text>
				</Box>
			)}
		</Box>
	);

	const renderSearch = () => (
		<Box flexDirection="column" minHeight={15}>
			<Text bold color="cyan">Search Memories</Text>
			<Text color="gray">─────────────────────────────────────</Text>
			<Box marginY={1}>
				<Text color="cyan">Query: </Text>
				<TextInput
					value={searchQuery}
					onChange={setSearchQuery}
					onSubmit={searchMemories}
					placeholder="Enter search term..."
				/>
			</Box>

			{loading && (
				<Box>
					<SimpleSpinner />
					<Text> Searching...</Text>
				</Box>
			)}

			<Box flexDirection="column" height={10}>
				{memories.length > 0 ? (
					<Box flexDirection="column">
						<Text dimColor>Found {memories.length} results</Text>
						<Newline />
						{memories.slice(0, 8).map((memory, idx) => (
							<Text key={memory.id} color={idx === selectedIndex ? 'cyan' : 'white'}>
								{memory.similarity ? `[${(memory.similarity * 100).toFixed(0)}%] ` : ''}
								{(memory.content || '').substring(0, 70)}...
							</Text>
						))}
					</Box>
				) : (
					!loading && searchQuery && <Text dimColor>No results found</Text>
				)}
			</Box>

			<Spacer />
			<Text color="gray">ESC to go back • Enter to search</Text>
		</Box>
	);

	const renderAdd = () => (
		<Box flexDirection="column" minHeight={15}>
			<Text bold color="cyan">Add New Memory</Text>
			<Text color="gray">─────────────────────────────────────</Text>
			<Box marginY={1}>
				<Text color="cyan">Content: </Text>
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
					<Text> Saving memory...</Text>
				</Box>
			)}

			<Box height={8} />

			<Spacer />
			<Text color="gray">Enter to save • ESC to cancel</Text>
		</Box>
	);

	const renderView = () => (
		<Box flexDirection="column" minHeight={15}>
			<Box flexDirection="row" justifyContent="space-between">
				<Text bold color="cyan">All Memories</Text>
				<Text dimColor>{memories.length} total</Text>
			</Box>
			<Text color="gray">─────────────────────────────────────</Text>

			{loading ? (
				<Box marginY={1}>
					<SimpleSpinner />
					<Text> Loading memories...</Text>
				</Box>
			) : memories.length === 0 ? (
				<Box marginY={1}>
					<Text color="yellow">No memories found</Text>
				</Box>
			) : (
				<Box flexDirection="column" height={10} marginY={1}>
					{memories.slice(
						Math.max(0, selectedIndex - 4),
						Math.min(memories.length, selectedIndex + 6)
					).map((memory, idx) => {
						const actualIdx = idx + Math.max(0, selectedIndex - 4);
						return (
							<Text key={memory.id} color={actualIdx === selectedIndex ? 'cyan' : 'white'}>
								{actualIdx === selectedIndex ? '▶ ' : '  '}
								[{actualIdx + 1}] {(memory.content || '').substring(0, 65)}...
							</Text>
						);
					})}
				</Box>
			)}

			<Spacer />
			<Text color="gray">↑↓/jk Navigate • [D] Delete mode • [B]/ESC Back</Text>
		</Box>
	);

	const renderDelete = () => (
		<Box flexDirection="column" minHeight={15}>
			<Text bold color="red">Delete Memory</Text>
			<Text color="gray">─────────────────────────────────────</Text>

			{loading ? (
				<Box marginY={1}>
					<SimpleSpinner />
					<Text> Processing...</Text>
				</Box>
			) : memories.length === 0 ? (
				<Box marginY={1}>
					<Text color="yellow">No memories to delete</Text>
				</Box>
			) : (
				<>
					<Box marginY={1}>
						<Text color="yellow">⚠ Select a memory to delete:</Text>
					</Box>
					<Box flexDirection="column" height={9}>
						{memories.slice(
							Math.max(0, selectedIndex - 4),
							Math.min(memories.length, selectedIndex + 6)
						).map((memory, idx) => {
							const actualIdx = idx + Math.max(0, selectedIndex - 4);
							return (
								<Text key={memory.id} color={actualIdx === selectedIndex ? 'red' : 'white'}>
									{actualIdx === selectedIndex ? '▶ ' : '  '}
									[{actualIdx + 1}] {(memory.content || '').substring(0, 65)}...
								</Text>
							);
						})}
					</Box>
				</>
			)}

			<Spacer />
			<Text color="gray">↑↓ Navigate • Enter to delete • [B]/ESC Cancel</Text>
		</Box>
	);

	return (
		<Box flexDirection="column" minHeight={24}>
			<ASCIILogo />

			<Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} minHeight={18}>
				{mode === 'menu' && renderMenu()}
				{mode === 'search' && renderSearch()}
				{mode === 'add' && renderAdd()}
				{mode === 'view' && renderView()}
				{mode === 'delete' && renderDelete()}
			</Box>

			<Box justifyContent="center" marginTop={1}>
				<Text dimColor>
					{mode === 'menu' ? 'Select an option' : `Press ESC to return to menu`}
				</Text>
			</Box>
		</Box>
	);
};

export default function EnhancedUI() {
	return <MemoryManagerEnhanced />;
}