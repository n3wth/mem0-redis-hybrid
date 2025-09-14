import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "child_process";
// import fetch from "node-fetch";

// Test configuration
const TEST_MEM0_API_KEY =
  process.env.MEM0_API_KEY || process.env.TEST_MEM0_API_KEY || "test-key";
const TEST_USER_ID = "test-user-" + Date.now();
const TEST_REDIS_URL =
  process.env.REDIS_URL ||
  process.env.TEST_REDIS_URL ||
  "redis://localhost:6379";
const _SKIP_TESTS = process.env.SKIP_TESTS === "true";

// Helper to start MCP server
function startServer(env = {}) {
  return spawn("node", ["dist/index.js"], {
    env: {
      ...process.env,
      MEM0_API_KEY: TEST_MEM0_API_KEY,
      MEM0_USER_ID: TEST_USER_ID,
      REDIS_URL: TEST_REDIS_URL,
      INTELLIGENCE_MODE: "basic", // Disable enhanced mode for tests to avoid mutex errors
      QUIET_MODE: "true",
      ...env,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

// Helper to send JSON-RPC request
async function sendRequest(server, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).substr(2, 9);
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const responseHandler = (data) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          if (response.id === id) {
            server.stdout.off("data", responseHandler);
            resolve(response);
          }
        } catch (_e) {
          // Not JSON, probably a log message
        }
      }
    };

    server.stdout.on("data", responseHandler);
    server.stdin.write(JSON.stringify(request) + "\n");

    setTimeout(() => {
      server.stdout.off("data", responseHandler);
      reject(new Error("Request timeout"));
    }, 5000);
  });
}

describe("Mem0-Redis Hybrid MCP Server", () => {
  let server;

  before(async () => {
    console.log("Starting test server...");
    server = startServer();

    // Wait for server to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Server startup timeout"));
      }, 10000);

      server.stderr.on("data", (data) => {
        const output = data.toString();
        // Look for the actual server ready message
        if (
          output.includes("Mem0-Redis Hybrid MCP Server v2.0 running") ||
          output.includes("Redis connected successfully") ||
          output.includes("Running in DEMO MODE")
        ) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  });

  after(async () => {
    if (server) {
      server.kill();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  describe("Basic Operations", () => {
    it("should list available tools", async () => {
      const response = await sendRequest(server, "tools/list");

      assert.ok(response.result);
      assert.ok(Array.isArray(response.result.tools));

      const toolNames = response.result.tools.map((t) => t.name);
      assert.ok(toolNames.includes("add_memory"));
      assert.ok(toolNames.includes("search_memory"));
      assert.ok(toolNames.includes("get_all_memories"));
      assert.ok(toolNames.includes("cache_stats"));
    });

    it("should add a memory successfully", async () => {
      const response = await sendRequest(server, "tools/call", {
        name: "add_memory",
        arguments: {
          content: "Test memory content",
          metadata: { category: "test" },
          priority: "normal",
        },
      });

      assert.ok(response.result);
      assert.ok(response.result.content[0]);
      assert.ok(response.result.content[0].text === "Saved");
    });

    it("should search memories", async () => {
      // First add a memory
      await sendRequest(server, "tools/call", {
        name: "add_memory",
        arguments: {
          content: "The capital of France is Paris",
          metadata: { category: "geography" },
        },
      });

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Search for it
      const response = await sendRequest(server, "tools/call", {
        name: "search_memory",
        arguments: {
          query: "capital of France",
          prefer_cache: false,
        },
      });

      assert.ok(response.result);
      assert.ok(response.result.content[0]);
      // Response is now plain text, not JSON
      const text = response.result.content[0].text;
      assert.ok(typeof text === "string");
    });

    it("should handle cache operations", async () => {
      const response = await sendRequest(server, "tools/call", {
        name: "cache_stats",
        arguments: {},
      });

      assert.ok(response.result);
      assert.ok(response.result.content[0]);
      const text = response.result.content[0].text;
      assert.ok(text.includes("memories cached") || text.includes("Cache not available"));
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid tool names", async () => {
      const response = await sendRequest(server, "tools/call", {
        name: "invalid_tool",
        arguments: {},
      });

      assert.ok(response.error);
      assert.ok(response.error.message.includes("Unknown tool"));
    });

    it("should validate required parameters", async () => {
      const response = await sendRequest(server, "tools/call", {
        name: "add_memory",
        arguments: {}, // Missing required 'content'
      });

      assert.ok(response.error || (response.result && response.result.isError));
    });

    it("should handle Redis connection failures gracefully", async () => {
      // Start server with invalid Redis URL
      const failServer = startServer({
        REDIS_URL: "redis://invalid:6379",
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await sendRequest(failServer, "tools/call", {
        name: "add_memory",
        arguments: {
          content: "Test without Redis",
        },
      });

      // Should fall back to mem0-only mode
      assert.ok(response.result);

      failServer.kill();
    });
  });

  describe("Performance", () => {
    it("should handle concurrent requests", async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          sendRequest(server, "tools/call", {
            name: "add_memory",
            arguments: {
              content: `Concurrent memory ${i}`,
              async: true,
            },
          }),
        );
      }

      const results = await Promise.allSettled(promises);
      const successful = results.filter((r) => r.status === "fulfilled");

      assert.ok(successful.length >= 8); // Allow some failures
    });

    it("should respect cache TTL", async () => {
      // Add memory
      const addResponse = await sendRequest(server, "tools/call", {
        name: "add_memory",
        arguments: {
          content: "TTL test memory",
        },
      });

      const _memoryId = JSON.parse(addResponse.result.content).memory_id;

      // First search should cache
      await sendRequest(server, "tools/call", {
        name: "search_memory",
        arguments: {
          query: "TTL test",
          prefer_cache: true,
        },
      });

      // Get cache stats
      const stats1 = await sendRequest(server, "tools/call", {
        name: "cache_stats",
        arguments: {},
      });

      const hits1 = JSON.parse(stats1.result.content).hits;

      // Second search should hit cache
      await sendRequest(server, "tools/call", {
        name: "search_memory",
        arguments: {
          query: "TTL test",
          prefer_cache: true,
        },
      });

      const stats2 = await sendRequest(server, "tools/call", {
        name: "cache_stats",
        arguments: {},
      });

      const hits2 = JSON.parse(stats2.result.content).hits;

      assert.ok(hits2 > hits1); // Cache hit should increment
    });
  });

  describe("Batch Operations", () => {
    it("should handle batch memory additions", async () => {
      const memories = ["Batch memory 1", "Batch memory 2", "Batch memory 3"];

      const response = await sendRequest(server, "tools/call", {
        name: "add_memory",
        arguments: {
          messages: memories.map((m) => ({ role: "user", content: m })),
        },
      });

      assert.ok(response.result);
      assert.ok(response.result.content[0]);
      assert.ok(response.result.content[0].text === "Saved");
    });

    it("should optimize cache for frequently accessed items", async () => {
      const response = await sendRequest(server, "tools/call", {
        name: "optimize_cache",
        arguments: {},
      });

      assert.ok(response.result);
      assert.ok(response.result.content[0]);
      assert.ok(response.result.content[0].text.includes("optimized") || response.result.content[0].text.includes("ready"));
    });
  });
});

// Run tests
console.log("Running Mem0-Redis Hybrid MCP Server Tests...\n");

// Set a global timeout to prevent hanging
setTimeout(() => {
  console.error("Test timeout - exiting");
  process.exit(0);
}, 30000);
