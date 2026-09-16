// Loaded via `node --import` before any test file. React reads NODE_ENV at
// import time: under an inherited NODE_ENV=production (e.g. a deploy host),
// react-test-renderer's act() throws. The suite always runs as tests.
process.env.NODE_ENV = "test";
