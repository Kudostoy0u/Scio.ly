#!/usr/bin/env node

/**
 * Chunked Test Runner for Scio.ly
 * 
 * This script runs tests in logical chunks to avoid memory issues.
 * Each chunk focuses on a specific area of the codebase.
 */

const { execSync } = require('child_process');
const path = require('path');

// Define test chunks with their patterns and descriptions
const TEST_CHUNKS = [
  {
    name: 'utils',
    description: 'Utility functions and helpers',
    patterns: [
      'src/lib/utils/**/*.test.*',
      'src/lib/api/**/*.test.*',
      'src/lib/services/**/*.test.*'
    ]
  },
  {
    name: 'app-core',
    description: 'Core app functionality',
    patterns: [
      'src/app/analytics/**/*.test.*',
      'src/app/docs/**/*.test.*',
      'src/app/plagiarism/**/*.test.*',
      'src/app/practice/**/*.test.*',
      'src/app/reports/**/*.test.*',
      'src/app/robots.test.*'
    ]
  },
  {
    name: 'api',
    description: 'API routes and endpoints',
    patterns: [
      'src/app/api'
    ]
  },
  {
    name: 'teams',
    description: 'Teams functionality',
    patterns: [
      'src/app/teams/components/**/*.test.*',
      'src/app/teams/__tests__/TeamsPageClient.test.*'
    ]
  },
  {
    name: 'teams-integration',
    description: 'Teams integration tests',
    patterns: [
      'src/app/teams/__tests__/calendar-integration.test.*'
    ],
    skip: true // Skip due to memory issues
  },
  {
    name: 'codebusters',
    description: 'Codebusters features',
    patterns: [
      'src/app/codebusters/**/*.test.*'
    ]
  },
  {
    name: 'test-features',
    description: 'Test and practice features',
    patterns: [
      'src/app/test/**/*.test.*'
    ]
  },
  {
    name: 'unlimited',
    description: 'Unlimited practice features',
    patterns: [
      'src/app/unlimited/**/*.test.*'
    ]
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runChunk(chunk) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Running ${chunk.name} tests: ${chunk.description}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
  
  // Skip chunks marked with skip flag
  if (chunk.skip) {
    log(`⏭️  Skipping ${chunk.name} tests (marked as skip)`, 'yellow');
    return true;
  }
  
  const startTime = Date.now();
  
  try {
    // Build the vitest command with patterns
    const patterns = chunk.patterns.join(' ');
    const command = `npx vitest run ${patterns} --reporter=verbose`;
    
    log(`Command: ${command}`, 'blue');
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ ${chunk.name} tests passed in ${duration}s`, 'green');
    return true;
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`❌ ${chunk.name} tests failed in ${duration}s`, 'red');
    return false;
  }
}

function runAllChunks() {
  log('🚀 Starting chunked test run...', 'bright');
  log(`Total chunks: ${TEST_CHUNKS.length}`, 'blue');
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < TEST_CHUNKS.length; i++) {
    const chunk = TEST_CHUNKS[i];
    log(`\n[${i + 1}/${TEST_CHUNKS.length}] Processing ${chunk.name}...`, 'yellow');
    
    const success = runChunk(chunk);
    results.push({ chunk: chunk.name, success, index: i + 1 });
    
    if (!success) {
      log(`\n❌ Test chunk ${chunk.name} failed. Stopping execution.`, 'red');
      break;
    }
    
    // Small delay between chunks to allow memory cleanup
    if (i < TEST_CHUNKS.length - 1) {
      log('⏳ Waiting 2 seconds for memory cleanup...', 'yellow');
      new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Summary
  log(`\n${'='.repeat(60)}`, 'cyan');
  log('📊 TEST SUMMARY', 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${status} ${result.chunk}`, color);
  });
  
  log(`\nTotal time: ${totalDuration}s`, 'blue');
  log(`Passed: ${passed}/${results.length} chunks`, passed === results.length ? 'green' : 'yellow');
  
  if (failed > 0) {
    log(`Failed: ${failed} chunks`, 'red');
    process.exit(1);
  } else {
    log('🎉 All test chunks passed!', 'green');
  }
}

function runSpecificChunk(chunkName) {
  const chunk = TEST_CHUNKS.find(c => c.name === chunkName);
  
  if (!chunk) {
    log(`❌ Unknown chunk: ${chunkName}`, 'red');
    log('Available chunks:', 'yellow');
    TEST_CHUNKS.forEach(c => log(`  - ${c.name}: ${c.description}`, 'blue'));
    process.exit(1);
  }
  
  log(`🎯 Running specific chunk: ${chunk.name}`, 'bright');
  const success = runChunk(chunk);
  process.exit(success ? 0 : 1);
}

function listChunks() {
  log('📋 Available test chunks:', 'bright');
  TEST_CHUNKS.forEach((chunk, index) => {
    log(`${index + 1}. ${chunk.name}: ${chunk.description}`, 'blue');
    log(`   Patterns: ${chunk.patterns.join(', ')}`, 'cyan');
  });
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'all':
    runAllChunks();
    break;
  case 'chunk':
    const chunkName = args[1];
    if (!chunkName) {
      log('❌ Please specify a chunk name', 'red');
      listChunks();
      process.exit(1);
    }
    runSpecificChunk(chunkName);
    break;
  case 'list':
    listChunks();
    break;
  default:
    log('🧪 Chunked Test Runner', 'bright');
    log('Usage:', 'yellow');
    log('  node scripts/test-chunks.js all          # Run all chunks sequentially', 'blue');
    log('  node scripts/test-chunks.js chunk <name> # Run specific chunk', 'blue');
    log('  node scripts/test-chunks.js list         # List available chunks', 'blue');
    log('');
    listChunks();
    break;
}
