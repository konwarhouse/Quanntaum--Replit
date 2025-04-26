const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';
const waitOn = require('wait-on');
const portfinder = require('portfinder');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;
let serverProcess;
let serverPort;

async function startServer() {
  serverPort = await portfinder.getPortPromise({ port: 3000 });
  
  const serverPath = path.join(__dirname, '../server/index.js');
  
  // Set environment variables for the server
  const env = { 
    ...process.env, 
    PORT: serverPort.toString(),
    NODE_ENV: 'production',
    ELECTRON_RUN: 'true'
  };
  
  console.log(`Starting server on port ${serverPort}`);
  
  // Start the server as a child process
  serverProcess = spawn('node', [serverPath], { 
    env, 
    stdio: 'pipe'
  });
  
  // Log server output
  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
  
  // Wait for the server to be available
  await waitOn({
    resources: [`http://localhost:${serverPort}`],
    timeout: 15000
  });
  
  console.log('Server is ready');
  return serverPort;
}

async function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    icon: path.join(__dirname, 'icons/icon.png')
  });

  // Start the server first
  try {
    await startServer();
    
    // Load the app from the server
    const startUrl = `http://localhost:${serverPort}`;
    console.log(`Loading application from: ${startUrl}`);
    mainWindow.loadURL(startUrl);
    
    // Show when ready
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
    });

    // Open DevTools in development mode
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    // Handle window being closed
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

// Initialize the app when Electron is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, recreate window when dock icon is clicked
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Gracefully shut down the server when quitting
app.on('before-quit', () => {
  if (serverProcess) {
    console.log('Shutting down server...');
    // On Windows we need to forcefully kill
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      try {
        execSync(`taskkill /pid ${serverProcess.pid} /T /F`);
      } catch (e) {
        console.error('Failed to kill server process:', e);
      }
    } else {
      serverProcess.kill();
    }
  }
});

// Handle IPC messages from renderer process
ipcMain.on('app-version', (event) => {
  event.returnValue = app.getVersion();
});