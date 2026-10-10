const { main } = require('./migrate');

console.warn('init_db.js is deprecated; use npm run db:migrate');
main().catch((error) => {
  console.error(`Database initialization failed: ${error.message}`);
  process.exitCode = 1;
});
