#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
	Usage
	  $ r3call-cli

	Options
		--api-url   R3CALL API URL (default: http://localhost:3030)
		--user-id   User ID for memories (default: default)
		--help      Show help

	Examples
	  $ r3call-cli
	  $ r3call-cli --api-url https://api.r3call.com
	  $ R3CALL_API_KEY=your-key r3call-cli

	Environment Variables:
	  R3CALL_API_KEY   API key for authentication
	  R3CALL_API_URL   API base URL
	  R3CALL_USER_ID   User ID for memories
	  MEM0_API_KEY     Alternative API key
`,
	{
		importMeta: import.meta,
		flags: {
			apiUrl: {
				type: 'string',
			},
			userId: {
				type: 'string',
			},
		},
	},
);

// Set environment variables from CLI flags if provided
if (cli.flags.apiUrl) {
	process.env['R3CALL_API_URL'] = cli.flags.apiUrl;
}
if (cli.flags.userId) {
	process.env['R3CALL_USER_ID'] = cli.flags.userId;
}

render(<App />);
