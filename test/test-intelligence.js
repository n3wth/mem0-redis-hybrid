#!/usr/bin/env node

/**
 * Test suite for enhanced AI intelligence features
 */

import { EnhancedVectraMemory } from "../dist/lib/enhanced-vectra-memory.js";
import { EntityExtractor } from "../dist/lib/entity-extractor.js";
import { spawn } from "child_process";
import fs from "fs/promises";

const TEST_DIR = "./data/test-intelligence";

async function cleanup() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }
}

async function testDefaultMode() {
  console.log("Testing: Default mode is enhanced...");

  return new Promise((resolve, reject) => {
    const server = spawn("node", ["dist/index.js"], {
      env: { ...process.env, QUIET_MODE: "false" },
    });

    let output = "";
    server.stderr.on("data", (data) => {
      output += data.toString();
    });

    setTimeout(() => {
      server.kill();
      if (output.includes("AI Intelligence: ENABLED (default)")) {
        console.log("  ✓ Enhanced mode is default");
        resolve();
      } else {
        reject(new Error("Enhanced mode not default"));
      }
    }, 2000);
  });
}

async function testEntityExtraction() {
  console.log("Testing: Entity extraction...");

  const extractor = new EntityExtractor(true);
  const result = await extractor.extract(
    "The r3call project uses TypeScript and Redis. It integrates with Node.js.",
  );

  if (result.entities.technologies.length === 0) {
    throw new Error("No technologies extracted");
  }
  if (result.relationships.length === 0) {
    throw new Error("No relationships extracted");
  }
  if (result.keywords.length === 0) {
    throw new Error("No keywords extracted");
  }

  console.log(
    `  ✓ Extracted ${result.entities.technologies.length} technologies`,
  );
  console.log(`  ✓ Extracted ${result.relationships.length} relationships`);
  console.log(`  ✓ Extracted ${result.keywords.length} keywords`);
}

async function testVectorEmbeddings() {
  console.log("Testing: Vector embeddings...");

  await cleanup();
  const vectra = new EnhancedVectraMemory(TEST_DIR, true);
  await vectra.initialize();

  // Add test memories
  await vectra.addMemory({
    id: "vec-1",
    content: "Machine learning models need training data",
    user_id: "test",
  });

  await vectra.addMemory({
    id: "vec-2",
    content: "Database optimization improves query performance",
    user_id: "test",
  });

  // Test semantic search
  const results = await vectra.searchMemories("AI and ML", 2);
  if (results.length === 0) {
    throw new Error("Vector search failed");
  }

  console.log(`  ✓ Vector search returned ${results.length} results`);
  console.log(
    `  ✓ Top result similarity: ${(results[0].metadata?.similarity_score * 100).toFixed(1)}%`,
  );
}

async function testPerformance() {
  console.log("Testing: Performance metrics...");

  await cleanup();
  const vectra = new EnhancedVectraMemory(TEST_DIR, true);
  await vectra.initialize();

  // Add test data
  for (let i = 0; i < 10; i++) {
    await vectra.addMemory({
      id: `perf-${i}`,
      content: `Test memory ${i} with various keywords and content`,
      user_id: "test",
    });
  }

  // Measure search performance
  const start = Date.now();
  await vectra.searchMemories("test keywords", 5);
  const searchTime = Date.now() - start;

  if (searchTime > 20) {
    throw new Error(`Search took ${searchTime}ms (expected <20ms)`);
  }

  console.log(`  ✓ Search latency: ${searchTime}ms`);
  console.log("  ✓ Performance within acceptable range");
}

async function testKnowledgeGraph() {
  console.log("Testing: Knowledge graph construction...");

  await cleanup();
  const vectra = new EnhancedVectraMemory(TEST_DIR, true);
  const extractor = new EntityExtractor(true);
  await vectra.initialize();

  // Add memories with entities
  const texts = [
    "Sarah works at Marketing Corp and manages the Dashboard project",
    "The Dashboard project uses React and TypeScript",
    "Marketing Corp is located in San Francisco",
  ];

  for (let i = 0; i < texts.length; i++) {
    const extraction = await extractor.extract(texts[i]);
    await vectra.addMemory({
      id: `kg-${i}`,
      content: texts[i],
      user_id: "test",
      metadata: {
        entities: extraction.entities,
        relationships: extraction.relationships,
      },
    });
  }

  const memories = await vectra.getAllMemories();
  if (memories.length !== texts.length) {
    throw new Error("Knowledge graph retrieval failed");
  }

  // Count entities and relationships
  let totalEntities = 0;
  let totalRelationships = 0;

  for (const mem of memories) {
    if (mem.metadata?.entities) {
      totalEntities += Object.values(mem.metadata.entities).flat().length;
    }
    if (mem.metadata?.relationships) {
      totalRelationships += mem.metadata.relationships.length;
    }
  }

  console.log(`  ✓ Stored ${memories.length} memories`);
  console.log(`  ✓ Total entities: ${totalEntities}`);
  console.log(`  ✓ Total relationships: ${totalRelationships}`);
}

// Main test runner
async function runTests() {
  console.log("🧪 Running Intelligence Feature Tests\n");
  console.log("=".repeat(50));

  const tests = [
    { name: "Default Mode", fn: testDefaultMode },
    { name: "Entity Extraction", fn: testEntityExtraction },
    { name: "Vector Embeddings", fn: testVectorEmbeddings },
    { name: "Performance", fn: testPerformance },
    { name: "Knowledge Graph", fn: testKnowledgeGraph },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.error(`  ✗ ${test.name} failed: ${error.message}`);
      failed++;
    }
    console.log();
  }

  // Final cleanup
  await cleanup();

  console.log("=".repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("\n✅ All intelligence tests passed!");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed");
    process.exit(1);
  }
}

// Handle uncaught exceptions (mutex errors)
process.on("uncaughtException", (error) => {
  if (
    error.message?.includes("mutex") ||
    error.message?.includes("Invalid argument")
  ) {
    // Silently ignore mutex errors from transformers.js
    return;
  }
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Run tests
runTests().catch(console.error);
