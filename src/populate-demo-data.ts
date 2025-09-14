#!/usr/bin/env node

import { MemoryEngine } from './core/memory-engine.js';

const demoMemories = [
  {
    content: 'docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"',
    user_id: 'oliver',
    project: 'r3call',
    directory: '/Users/oliver/projects/r3call',
    tags: ['docker', 'containers', 'debug'],
    metadata: {
      category: 'docker',
      use_count: 15,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 min ago
    }
  },
  {
    content: 'npm run build && npm run test',
    user_id: 'oliver',
    project: 'r3call',
    directory: '/Users/oliver/projects/r3call',
    tags: ['build', 'test', 'npm'],
    metadata: {
      category: 'build',
      use_count: 8,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 min ago
    }
  },
  {
    content: 'git log --oneline --graph --decorate --all',
    user_id: 'oliver',
    project: 'r3call',
    directory: '/Users/oliver/projects/r3call',
    tags: ['git', 'history', 'visualization'],
    metadata: {
      category: 'git',
      use_count: 25,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 45).toISOString() // 45 min ago
    }
  },
  {
    content: 'kubectl get pods -n production --watch',
    user_id: 'oliver',
    project: 'k8s-ops',
    directory: '/Users/oliver/projects/k8s-ops',
    tags: ['kubernetes', 'monitoring', 'production'],
    metadata: {
      category: 'kubernetes',
      use_count: 12,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 120).toISOString() // 2 hours ago
    }
  },
  {
    content: 'sudo rm -rf /var/log/*.log',
    user_id: 'oliver',
    project: 'system-admin',
    directory: '/Users/oliver',
    tags: ['cleanup', 'logs', 'system'],
    metadata: {
      category: 'system',
      use_count: 3,
      dangerous: true,
      requires_sudo: true,
      last_used: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
    }
  },
  {
    content: 'exa --tree --level=2 --icons --git-ignore',
    user_id: 'oliver',
    project: 'r3call',
    directory: '/Users/oliver/projects/r3call',
    tags: ['file-listing', 'tree', 'modern'],
    metadata: {
      category: 'files',
      use_count: 20,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 10).toISOString() // 10 min ago
    }
  },
  {
    content: 'rg --type ts --type js "useState|useEffect" --stats',
    user_id: 'oliver',
    project: 'frontend',
    directory: '/Users/oliver/projects/frontend',
    tags: ['search', 'react', 'hooks'],
    metadata: {
      category: 'search',
      use_count: 7,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
    }
  },
  {
    content: 'fd --type f --exec wc -l {} \\; | sort -rn | head -20',
    user_id: 'oliver',
    project: 'analytics',
    directory: '/Users/oliver/projects/analytics',
    tags: ['find', 'analysis', 'metrics'],
    metadata: {
      category: 'analysis',
      use_count: 4,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() // 3 hours ago
    }
  },
  {
    content: 'curl -X POST https://api.example.com/webhook -H "Content-Type: application/json" -d \'{"event": "deploy", "status": "success"}\'',
    user_id: 'oliver',
    project: 'api-integration',
    directory: '/Users/oliver/projects/api',
    tags: ['api', 'webhook', 'curl'],
    metadata: {
      category: 'api',
      use_count: 6,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 90).toISOString() // 1.5 hours ago
    }
  },
  {
    content: 'ssh -i ~/.ssh/production.pem ubuntu@prod-server "tail -f /var/log/app.log"',
    user_id: 'oliver',
    project: 'production',
    directory: '/Users/oliver/projects/production',
    tags: ['ssh', 'logs', 'monitoring'],
    metadata: {
      category: 'remote',
      use_count: 18,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() // 4 hours ago
    }
  },
  {
    content: 'z projects && code .',
    user_id: 'oliver',
    project: 'workflow',
    directory: '/Users/oliver',
    tags: ['navigation', 'editor', 'workflow'],
    metadata: {
      category: 'workflow',
      use_count: 35,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 min ago
    }
  },
  {
    content: 'bat package.json | grep -E "(scripts|dependencies)"',
    user_id: 'oliver',
    project: 'r3call',
    directory: '/Users/oliver/projects/r3call',
    tags: ['package', 'json', 'inspection'],
    metadata: {
      category: 'inspection',
      use_count: 11,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 25).toISOString() // 25 min ago
    }
  },
  {
    content: 'htop --sort-key PERCENT_CPU',
    user_id: 'oliver',
    project: 'system-monitoring',
    directory: '/Users/oliver',
    tags: ['monitoring', 'cpu', 'performance'],
    metadata: {
      category: 'monitoring',
      use_count: 9,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
    }
  },
  {
    content: 'fzf --preview "bat --color=always {}" | xargs code',
    user_id: 'oliver',
    project: 'workflow',
    directory: '/Users/oliver/projects',
    tags: ['fuzzy-finder', 'preview', 'editor'],
    metadata: {
      category: 'workflow',
      use_count: 22,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date(Date.now() - 1000 * 60 * 20).toISOString() // 20 min ago
    }
  },
  {
    content: 'git add . && git commit -m "feat: awesome memory manager implementation" && git push',
    user_id: 'oliver',
    project: 'r3call',
    directory: '/Users/oliver/projects/r3call',
    tags: ['git', 'commit', 'push'],
    metadata: {
      category: 'git',
      use_count: 42,
      dangerous: false,
      requires_sudo: false,
      last_used: new Date().toISOString() // Just now!
    }
  }
];

async function populateDemoData() {
  console.log('🚀 Populating demo data for AWESOME Memory Manager...');

  const engine = new MemoryEngine();

  try {
    // Add all demo memories
    for (const memory of demoMemories) {
      const id = await engine.addMemory(memory);
      console.log(`✓ Added memory: ${memory.content.substring(0, 50)}... (${id})`);
    }

    console.log(`\n🎉 Successfully added ${demoMemories.length} demo memories!`);
    console.log('💡 Now run: npx r3call-manage');
    console.log('');
    console.log('Try these commands:');
    console.log('  /docker     - Search Docker commands');
    console.log('  /git        - Find Git commands');
    console.log('  Ctrl+K      - Open command palette');
    console.log('  j/k         - Navigate memories');
    console.log('  Enter       - View details');
    console.log('');

    await engine.close();
  } catch (error) {
    console.error('❌ Error populating data:', error);
    await engine.close();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  populateDemoData();
}

export { populateDemoData };