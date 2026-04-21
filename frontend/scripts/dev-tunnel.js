/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const na = require('network-address');

const address = na() || 'localhost';

console.log('\n=== NETWORK ADDRESS ===');
console.log('Frontend: http://' + address + ':3000');
console.log('Backend:  http://' + address + ':3001');
console.log('======================\n');

console.log('Open these URLs on your phone (same network):');
console.log('- Frontend: http://' + address + ':3000');
console.log('- Backend:  http://' + address + ':3001');
console.log('');

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