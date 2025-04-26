const { spawn } = require('child_process');
const path = require('path');
const { existsSync } = require('fs');

// Color constants for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Print header
console.log(`${colors.cyan}==============================================${colors.reset}`);
console.log(`${colors.cyan}      Testing Quanntaum Predict in Electron   ${colors.reset}`);
console.log(`${colors.cyan}==============================================${colors.reset}`);

// Check if Electron is installed
try {
  require.resolve('electron');
} catch (e) {
  console.error(`${colors.red}Electron is not installed. Please run 'npm install --save-dev electron' first.${colors.reset}`);
  process.exit(1);
}

// Check if frontend is built
const distPath = path.join(__dirname, 'client', 'dist');
if (!existsSync(distPath)) {
  console.log(`${colors.yellow}Frontend build not found.${colors.reset}`);
  console.log(`${colors.yellow}Building frontend first...${colors.reset}`);
  try {
    const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
    buildProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`${colors.red}Frontend build failed with code ${code}${colors.reset}`);
        process.exit(1);
      }
      startElectron();
    });
  } catch (error) {
    console.error(`${colors.red}Error building frontend: ${error.message}${colors.reset}`);
    process.exit(1);
  }
} else {
  startElectron();
}

function startElectron() {
  console.log(`${colors.green}Starting Electron app in test mode...${colors.reset}`);
  console.log(`${colors.blue}Using in-memory storage - no database needed${colors.reset}`);
  
  // Set environment variables for electron mode
  const env = {
    ...process.env,
    ELECTRON_RUN: 'true',
    NODE_ENV: 'production'
  };
  
  // Start Electron
  try {
    const electronProcess = spawn('electron', [path.join(__dirname, 'electron')], { 
      env, 
      stdio: 'inherit' 
    });
    
    electronProcess.on('error', (error) => {
      console.error(`${colors.red}Failed to start Electron: ${error.message}${colors.reset}`);
      process.exit(1);
    });
    
    electronProcess.on('close', (code) => {
      if (code !== 0) {
        console.log(`${colors.yellow}Electron exited with code ${code}${colors.reset}`);
      } else {
        console.log(`${colors.green}Electron test completed successfully${colors.reset}`);
      }
    });
    
    // Handle CTRL+C
    process.on('SIGINT', () => {
      console.log(`${colors.yellow}Interrupted. Stopping Electron...${colors.reset}`);
      electronProcess.kill();
    });
  } catch (error) {
    console.error(`${colors.red}Error starting Electron: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}