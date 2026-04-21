/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const na = require('network-address');

const address = na() || 'localhost';

console.log('\n=== NETWORK ADDRESS ===');
console.log('Frontend: http://' + address + ':3000');
console.log('Backend:  http://' + address + ':3001');
console.log('======================\n');

const isLocal = address.match(/^(192\.168|10\.|172\.(1[6-9]|2|3[0-1]))/);

if (isLocal) {
  console.log('Open these URLs on your phone (same WiFi network):');
  console.log('- Frontend: http://' + address + ':3000');
  console.log('- Backend:  http://' + address + ':3001');
  console.log('');
} else {
  console.log('Note: Using localhost because no local network IP found.');
  console.log('- Frontend: http://localhost:3000');
  console.log('- Backend:  http://localhost:3001');
  console.log('');
}

console.log('Starting Next.js dev server...\n');

const dev = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, HOST: '0.0.0.0' }
});

dev.on('close', (code) => {
  process.exit(code);
});