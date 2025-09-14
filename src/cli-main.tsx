#!/usr/bin/env node

import React from "react";
import { render } from "ink";
import meow from "meow";

const cli = meow(
  `
	Usage
	  $ r3 [command] [options]

	Commands
	  serve         Start MCP server (default)
	  ui            Launch interactive memory manager UI
	  manage        Launch advanced UI (experimental)

	Options
	  --api-url     R3CALL API URL (default: http://localhost:3030)
	  --user-id     User ID for memories (default: default)
	  --help        Show help
	  --version     Show version

	Examples
	  $ r3                    # Start MCP server
	  $ r3 ui                 # Launch interactive UI
	  $ r3 manage             # Launch advanced UI
	  $ r3 ui --api-url https://api.r3.com

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
        type: "string",
      },
      userId: {
        type: "string",
      },
    },
  },
);

// Set environment variables from CLI flags if provided
if (cli.flags.apiUrl) {
  process.env["R3CALL_API_URL"] = cli.flags.apiUrl;
}
if (cli.flags.userId) {
  process.env["R3CALL_USER_ID"] = cli.flags.userId;
}

const command = cli.input[0] || "serve";

async function main() {
  switch (command) {
    case "serve":
      // Start the MCP server
      const { startServer } = await import("./index.js");
      await startServer();
      break;

    case "ui":
      // Launch the professional UI with improved design
      const ProUI = (await import("./cli-ui-pro.js")).default;
      render(<ProUI />);
      break;

    case "manage":
      // Launch the advanced UI
      await import("./cli-awesome.js");
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "r3 --help" for usage information');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
