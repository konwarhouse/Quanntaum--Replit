const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Get app version
  getAppVersion: () => ipcRenderer.sendSync('app-version'),
  
  // System info
  platform: process.platform,
  
  // Flag to indicate running in Electron
  isElectron: true
});

console.log('Preload script loaded');