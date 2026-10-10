const dotenv = require('dotenv');

dotenv.config();

const { createApp } = require('./app');
const { getRuntimeConfig, validateRuntimeConfig } = require('./config/runtime');

validateRuntimeConfig(process.env);

const config = getRuntimeConfig(process.env);
const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`LMS API listening on port ${config.port}`);
});

server.requestTimeout = config.requestTimeoutMs;
server.headersTimeout = Math.min(config.requestTimeoutMs + 1_000, 121_000);
server.keepAliveTimeout = 5_000;

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; closing HTTP server`);
  server.close((error) => {
    if (error) {
      console.error('HTTP server shutdown failed');
      process.exitCode = 1;
    }
  });

  setTimeout(() => {
    console.error('HTTP server shutdown timed out');
    process.exit(1);
  }, 10_000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
