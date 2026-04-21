/* eslint-disable @typescript-eslint/no-require-imports */
const localtunnel = require('localtunnel');

async function startTunnel() {
  const tunnel = await localtunnel({ port: 3000, subdomain: 'hdata-app' });
  
  console.log('\n=== TUNNEL READY ===');
  console.log('Frontend URL:', tunnel.url);
  console.log('Backend URL: http://localhost:3001');
  console.log('==================\n');
  
  tunnel.on('close', () => {
    console.log('Tunnel closed');
    process.exit(1);
  });
}

startTunnel().catch(err => {
  console.error('Failed to start tunnel:', err.message);
  console.log('\nMake sure port 3000 is not in use, then try again.');
  process.exit(1);
});