// This is the standalone server for Electron
// It loads the compiled server code and runs it with Electron-specific configuration

// Set environment variables
process.env.ELECTRON_RUN = 'true';
process.env.NODE_ENV = 'production';

// Redirect console output to electron-log in main process
console.log = (...args) => {
  if (process.send) {
    process.send({ type: 'log', data: args });
  }
};

console.error = (...args) => {
  if (process.send) {
    process.send({ type: 'error', data: args });
  }
};

// Load the compiled server
console.log('Starting Quanntaum Predict server in Electron mode');
try {
  // The compiled server file is in the 'dist' directory
  require('../dist/index.js');
} catch (error) {
  console.error('Failed to start server:', error);
  // Exit with error code
  process.exit(1);
}
