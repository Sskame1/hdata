/* eslint-disable @typescript-eslint/no-require-imports */
const localtunnel = require('localtunnel');

(async () => {
  console.log('\n=== STARTING ===\n');

  const tunnel = await localtunnel({ port: 3000 });

  console.log('Open on your phone:');
  console.log(tunnel.url);
  console.log('');

  tunnel.on('close', () => {
    process.exit(1);
  });
})();