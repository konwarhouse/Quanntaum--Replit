# Quanntaum Predict Desktop Application

This directory contains the configuration files needed to build desktop installers for the Quanntaum Predict application.

## Features

- Cross-platform desktop application (Windows, macOS, Linux)
- Self-contained - bundles Node.js runtime and all dependencies
- Database-less mode with sample data for testing
- Native installers with proper shortcuts and icons

## Prerequisites

- Node.js 16+ and npm
- For Windows builds: Windows 10/11 (optional: signing certificate)
- For macOS builds: macOS 10.15+ (optional: Apple Developer account)
- For Linux builds: Any modern Linux distribution

## Building Desktop Installers

Follow these steps to create the desktop application installers:

### 1. Install Dependencies

Run the setup script from the project root:

```bash
./setup-electron-deps.sh
```

This will install the necessary dependencies in both the project root and the electron directory.

### 2. Build the Frontend

Build the client application first:

```bash
npm run build
```

### 3. Build the Desktop Application

Run the electron build script:

```bash
# Build for all platforms
node build-electron.js

# OR build for specific platforms
node build-electron.js --win  # Windows only
node build-electron.js --mac  # macOS only 
node build-electron.js --linux  # Linux only
```

The packaged installers will be available in the `dist_electron` directory.

## Configuration Files

- `main.js` - Main Electron process file
- `preload.js` - Script that runs in the renderer process
- `electron-builder.yml` - Configuration for electron-builder
- `entitlements.plist` - macOS security entitlements

## Electron Mode Features

When running in Electron mode:

1. The application uses in-memory storage instead of PostgreSQL
2. Pre-populated demo data is automatically loaded
3. Default admin user: username `admin`, password `adminpassword`
4. Basic sample assets and equipment classes are included

## Custom Build Options

To customize the build process, edit the `electron-builder.yml` file. Some common customizations:

- Change application name and ID
- Configure installers (NSIS for Windows, DMG for macOS)
- Add code signing certificates
- Modify installer appearance

## Signing Installers

### Windows Code Signing

To sign the Windows installer:

1. Obtain a code signing certificate
2. Add the following to `electron-builder.yml`:

```yaml
win:
  certificateFile: path/to/certificate.pfx
  certificatePassword: YOUR_PASSWORD
```

### macOS Code Signing and Notarization

To sign and notarize the macOS app:

1. Add your Apple Developer credentials to your keychain
2. Modify the `electron-builder.yml` file:

```yaml
mac:
  hardenedRuntime: true
  entitlements: electron/entitlements.plist
  entitlementsInherit: electron/entitlements.plist
  gatekeeperAssess: false
  notarize: true
```

3. Set environment variables:
   - `APPLE_ID` - Your Apple ID email
   - `APPLE_ID_PASSWORD` - Your app-specific password