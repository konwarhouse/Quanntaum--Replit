const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Check if we're building for a specific platform
const args = process.argv.slice(2);
const buildWindows = args.includes('--win') || args.includes('-w');
const buildMac = args.includes('--mac') || args.includes('-m');
const buildLinux = args.includes('--linux') || args.includes('-l');
const buildAll = !buildWindows && !buildMac && !buildLinux;

console.log(`${colors.cyan}=== Building Quanntaum Predict Desktop Application ===${colors.reset}`);

try {
  // Step 1: Create electron/build directory for resources
  console.log(`${colors.blue}[1/5] Creating build resources directory...${colors.reset}`);
  if (!fs.existsSync(path.join(__dirname, 'electron/build'))) {
    fs.mkdirSync(path.join(__dirname, 'electron/build'), { recursive: true });
  }
  
  // Step 2: Build the frontend
  console.log(`${colors.blue}[2/5] Building frontend...${colors.reset}`);
  execSync('npm run build', { stdio: 'inherit' });
  
  // Step 3: Copy node_modules for the backend
  console.log(`${colors.blue}[3/5] Preparing backend dependencies...${colors.reset}`);
  if (!fs.existsSync(path.join(__dirname, 'electron/node_modules'))) {
    fs.mkdirSync(path.join(__dirname, 'electron/node_modules'), { recursive: true });
  }
  
  // Step 4: Install electron dependencies
  console.log(`${colors.blue}[4/5] Installing Electron dependencies...${colors.reset}`);
  execSync('cd electron && npm install', { stdio: 'inherit' });
  
  // Step 5: Build the Electron app
  console.log(`${colors.blue}[5/5] Building Electron application...${colors.reset}`);
  
  let buildCommand = 'cd electron && npm run build';
  if (buildWindows) {
    buildCommand = 'cd electron && npm run build:win';
    console.log(`${colors.yellow}Building for Windows...${colors.reset}`);
  } else if (buildMac) {
    buildCommand = 'cd electron && npm run build:mac';
    console.log(`${colors.yellow}Building for macOS...${colors.reset}`);
  } else if (buildLinux) {
    buildCommand = 'cd electron && npm run build:linux';
    console.log(`${colors.yellow}Building for Linux...${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Building for all platforms...${colors.reset}`);
  }
  
  execSync(buildCommand, { stdio: 'inherit' });
  
  console.log(`${colors.green}=== Build Complete! ===${colors.reset}`);
  console.log(`${colors.cyan}Installers can be found in the dist_electron directory${colors.reset}`);
  
} catch (error) {
  console.error(`${colors.red}Build failed:${colors.reset}`, error.message);
  process.exit(1);
}