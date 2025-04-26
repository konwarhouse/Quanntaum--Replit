#!/bin/bash

# Color setup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print header
echo -e "${CYAN}=======================================================${NC}"
echo -e "${CYAN}   Setting up dependencies for Electron packaging      ${NC}"
echo -e "${CYAN}=======================================================${NC}"

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
if command_exists node; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}Node.js version ${NODE_VERSION} found.${NC}"
else
  echo -e "${RED}Node.js not found. Please install Node.js 16+ before continuing.${NC}"
  exit 1
fi

# Install Electron dependencies in the electron directory
echo -e "${BLUE}Installing Electron dependencies...${NC}"
cd electron || { echo -e "${RED}Could not find electron directory${NC}"; exit 1; }

# Check if package.json exists
if [ ! -f package.json ]; then
  echo -e "${RED}package.json not found in electron directory${NC}"
  exit 1
fi

# Install dependencies
echo -e "${YELLOW}Running npm install...${NC}"
npm install || { echo -e "${RED}Failed to install Electron dependencies${NC}"; exit 1; }

echo -e "${GREEN}Electron dependencies installed successfully!${NC}"

# Return to root directory
cd ..

# Check for build-electron.js
if [ ! -f build-electron.js ]; then
  echo -e "${RED}build-electron.js not found${NC}"
  exit 1
fi

# Install root dependencies needed for building
echo -e "${BLUE}Installing additional dependencies in project root...${NC}"
npm install --save-dev electron electron-builder portfinder wait-on || { 
  echo -e "${RED}Failed to install project dependencies${NC}"; 
  exit 1; 
}

# Create convenience scripts for Electron operations
echo -e "${BLUE}Creating convenience scripts...${NC}"

# Create electron-test.sh
cat > electron-test.sh << 'EOF'
#!/bin/bash
node test-electron.js
EOF
chmod +x electron-test.sh

# Create electron-build.sh
cat > electron-build.sh << 'EOF'
#!/bin/bash
# Check if arguments are provided
if [ $# -eq 0 ]; then
  # No arguments, build for all platforms
  node build-electron.js
else
  # Pass all arguments to build-electron.js
  node build-electron.js "$@"
fi
EOF
chmod +x electron-build.sh

# Create platform-specific scripts
cat > electron-build-win.sh << 'EOF'
#!/bin/bash
node build-electron.js --win
EOF
chmod +x electron-build-win.sh

cat > electron-build-mac.sh << 'EOF'
#!/bin/bash
node build-electron.js --mac
EOF
chmod +x electron-build-mac.sh

cat > electron-build-linux.sh << 'EOF'
#!/bin/bash
node build-electron.js --linux
EOF
chmod +x electron-build-linux.sh

echo -e "${GREEN}Convenience scripts created successfully!${NC}"
echo -e "${GREEN}All dependencies installed successfully!${NC}"
echo -e "${CYAN}=======================================================${NC}"
echo -e "${CYAN}   Setup Complete!                                     ${NC}"
echo -e "${CYAN}=======================================================${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run ${MAGENTA}npm run build${NC} to build the frontend"
echo -e "2. Run ${MAGENTA}./electron-test.sh${NC} to test the app in Electron"
echo -e "3. Run ${MAGENTA}./electron-build.sh${NC} to build the desktop app"
echo -e "   - For Windows: ${MAGENTA}./electron-build-win.sh${NC}"
echo -e "   - For macOS: ${MAGENTA}./electron-build-mac.sh${NC}"
echo -e "   - For Linux: ${MAGENTA}./electron-build-linux.sh${NC}"
echo
echo -e "${BLUE}The packaged app will be available in the dist_electron directory${NC}"