/**
 * Multi-Server Startup Script
 *
 * This script starts both Site A and Site B servers simultaneously
 * without requiring any external dependencies.
 */

const { spawn } = require('child_process');
const path = require('path');

const servers = [
  {
    name: 'Site A',
    script: path.join(__dirname, 'site-a', 'server.js'),
    port: 3001,
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'Site B',
    script: path.join(__dirname, 'site-b', 'server.js'),
    port: 3002,
    color: '\x1b[35m' // Magenta
  },
  {
    name: 'Site C',
    script: path.join(__dirname, 'site-c', 'server.js'),
    port: 3003,
    color: '\x1b[33m' // Yellow
  }
];

const reset = '\x1b[0m';

console.log('\n========================================');
console.log('  Adobe Analytics Cross-Domain Test');
console.log('========================================\n');

const processes = [];

servers.forEach(server => {
  const proc = spawn('node', [server.script], {
    env: { ...process.env, PORT: server.port.toString() },
    stdio: ['inherit', 'pipe', 'pipe']
  });

  processes.push(proc);

  proc.stdout.on('data', (data) => {
    console.log(`${server.color}[${server.name}]${reset} ${data.toString().trim()}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`${server.color}[${server.name}]${reset} \x1b[31mERROR:\x1b[0m ${data.toString().trim()}`);
  });

  proc.on('close', (code) => {
    console.log(`${server.color}[${server.name}]${reset} Process exited with code ${code}`);
  });
});

console.log('Starting servers...\n');
console.log('Access the test sites at:');
console.log(`  ${servers[0].color}Site A:${reset} http://localhost:${servers[0].port}/ (Cross-Domain Enabled)`);
console.log(`  ${servers[1].color}Site B:${reset} http://localhost:${servers[1].port}/ (Cross-Domain Enabled)`);
console.log(`  ${servers[2].color}Site C:${reset} http://localhost:${servers[2].port}/ (Cross-Domain DISABLED)`);
console.log('\nPress Ctrl+C to stop all servers.\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down servers...');
  processes.forEach(proc => proc.kill());
  process.exit(0);
});

process.on('SIGTERM', () => {
  processes.forEach(proc => proc.kill());
  process.exit(0);
});
