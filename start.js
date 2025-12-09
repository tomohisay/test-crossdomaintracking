/**
 * Multi-Server Startup Script
 *
 * This script starts Site A, Site B, and Site C servers simultaneously
 * without requiring any external dependencies.
 */

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');
const dns = require('dns');

const servers = [
  {
    name: 'Site A',
    script: path.join(__dirname, 'site-a', 'server.js'),
    port: 3001,
    hostname: 'site-a.local',
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'Site B',
    script: path.join(__dirname, 'site-b', 'server.js'),
    port: 3002,
    hostname: 'site-b.local',
    color: '\x1b[35m' // Magenta
  },
  {
    name: 'Site C',
    script: path.join(__dirname, 'site-c', 'server.js'),
    port: 3003,
    hostname: 'site-c.local',
    color: '\x1b[33m' // Yellow
  }
];

const reset = '\x1b[0m';
const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';

console.log('\n========================================');
console.log('  Adobe Analytics Cross-Domain Test');
console.log('========================================\n');

// Check hosts file configuration
function checkHostsConfig() {
  return new Promise((resolve) => {
    console.log('Checking hosts file configuration...\n');

    let allConfigured = true;
    let checkCount = 0;

    servers.forEach(server => {
      dns.lookup(server.hostname, (err, address) => {
        checkCount++;

        if (err || address !== '127.0.0.1') {
          console.log(`  ${red}✗${reset} ${server.hostname} - Not configured`);
          allConfigured = false;
        } else {
          console.log(`  ${green}✓${reset} ${server.hostname} -> ${address}`);
        }

        if (checkCount === servers.length) {
          if (!allConfigured) {
            console.log(`\n${yellow}WARNING: Some hostnames are not configured in /etc/hosts${reset}`);
            console.log('\nPlease add the following lines to your /etc/hosts file:\n');
            console.log('  127.0.0.1 site-a.local');
            console.log('  127.0.0.1 site-b.local');
            console.log('  127.0.0.1 site-c.local');
            console.log('\nOn macOS/Linux: sudo nano /etc/hosts');
            console.log('On Windows: Edit C:\\Windows\\System32\\drivers\\etc\\hosts as Administrator');
            console.log('\n' + yellow + 'Without this configuration, cross-domain tracking will not work correctly!' + reset);
            console.log('(Cookie/localStorage will be shared across all sites on localhost)\n');
          } else {
            console.log(`\n${green}All hostnames are properly configured!${reset}\n`);
          }
          resolve(allConfigured);
        }
      });
    });
  });
}

// Start servers
async function startServers() {
  const hostsConfigured = await checkHostsConfig();

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
      console.error(`${server.color}[${server.name}]${reset} ${red}ERROR:${reset} ${data.toString().trim()}`);
    });

    proc.on('close', (code) => {
      console.log(`${server.color}[${server.name}]${reset} Process exited with code ${code}`);
    });
  });

  console.log('Starting servers...\n');
  console.log('Access the test sites at:');

  if (hostsConfigured) {
    console.log(`  ${servers[0].color}Site A:${reset} http://${servers[0].hostname}:${servers[0].port}/ (Cross-Domain Enabled)`);
    console.log(`  ${servers[1].color}Site B:${reset} http://${servers[1].hostname}:${servers[1].port}/ (Cross-Domain Enabled)`);
    console.log(`  ${servers[2].color}Site C:${reset} http://${servers[2].hostname}:${servers[2].port}/ (Cross-Domain DISABLED)`);
  } else {
    console.log(`  ${servers[0].color}Site A:${reset} http://localhost:${servers[0].port}/ ${yellow}(hosts not configured)${reset}`);
    console.log(`  ${servers[1].color}Site B:${reset} http://localhost:${servers[1].port}/ ${yellow}(hosts not configured)${reset}`);
    console.log(`  ${servers[2].color}Site C:${reset} http://localhost:${servers[2].port}/ ${yellow}(hosts not configured)${reset}`);
  }

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
}

startServers();
