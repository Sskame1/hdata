/* eslint-disable @typescript-eslint/no-require-imports */
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