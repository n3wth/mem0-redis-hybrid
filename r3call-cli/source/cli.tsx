#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';
import {addMemory, searchMemories, loadMemories, deleteMemory} from './api.js';
import chalk from 'chalk';

const cli = meow(
	`
	Usage
	  $ r3call-cli [command] [options]

	Commands
	  add <text>      Add a new memory
	  search <query>  Search memories
	  view            View all memories
	  delete <id>     Delete a memory
	  (no command)    Show interactive UI

	Options
		--api-url  Your R3CALL API endpoint
		--api-key  Your R3CALL API key
		--user-id  User ID for memories

	Examples
	  $ r3call-cli add "The sky is blue"
	  $ r3call-cli search "color of the sky"
	`,
	{
		importMeta: import.meta,
		flags: {
			apiUrl: {type: 'string'},
			apiKey: {type: 'string'},
			userId: {type: 'string'},
		},
	},
);

// Set environment variables from flags if provided
if (cli.flags.apiUrl) process.env['R3CALL_API_URL'] = cli.flags.apiUrl;
if (cli.flags.userId) process.env['R3CALL_USER_ID'] = cli.flags.userId;

const apiKey =
	cli.flags.apiKey ||
	process.env['R3CALL_API_KEY'] ||
	process.env['MEM0_API_KEY'];

const command = cli.input[0];
const text = cli.input.slice(1).join(' ');

async function run() {
	if (command) {
		try {
			switch (command) {
				case 'add':
					if (!text)
						throw new Error('Memory content is required for "add" command.');
					await addMemory(text, apiKey);
					console.log(chalk.green('✓ Memory added successfully!'));
					break;

				case 'search':
					if (!text)
						throw new Error('Search query is required for "search" command.');
					const searchResults = await searchMemories(text, apiKey);
					if (searchResults.length === 0) {
						console.log('No memories found.');
					} else {
						console.log(chalk.cyan('Search Results:'));
						searchResults.forEach((mem: any) => {
							const similarity = mem.similarity
								? `[${(mem.similarity * 100).toFixed(1)}%] `
								: '';
							console.log(`- ${similarity}${mem.content}`);
						});
					}
					break;

				case 'view':
					const memories = await loadMemories(apiKey);
					if (memories.length === 0) {
						console.log('No memories found.');
					} else {
						console.log(chalk.cyan('All Memories:'));
						memories.forEach((mem: any) => {
							console.log(`- [${mem.id}] ${mem.content}`);
						});
					}
					break;

				case 'delete':
					if (!text)
						throw new Error('Memory ID is required for "delete" command.');
					await deleteMemory(text, apiKey);
					console.log(chalk.green('✓ Memory deleted successfully!'));
					break;

				default:
					console.log(chalk.red(`Unknown command: ${command}`));
					cli.showHelp();
			}
		} catch (error: any) {
			console.error(chalk.red('Error:'), error);
			process.exit(1);
		}
	} else {
		render(<App apiKey={apiKey} />);
	}
}

run();
