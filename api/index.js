// Vercel injects env vars at runtime; dotenv is handled inside backend/src/index.js for local dev.
module.exports = require('../backend/src/index');
