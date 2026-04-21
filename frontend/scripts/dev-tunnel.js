/* eslint-disable @typescript-eslint/no-require-imports */
const localtunnel = require('localtunnel');

(async () => {
  const options = {
    port: 3000,
    subdomain: 'hdata'
  };

  const tunnel = await localtunnel(options);
  console.log('Ваш публичный URL:', tunnel.url);

  tunnel.on('close', () => {
    process.exit(1);
  });
})();