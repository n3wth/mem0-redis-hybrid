#!/bin/bash

# Simple installer script for r3call MCP server
echo "Installing r3call MCP server..."
cc mcp add r3call "npx r3call"
echo "r3call MCP server installed successfully!"
echo "Restart Claude to use the r3call memory functions."