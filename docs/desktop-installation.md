# Quanntaum Predict Desktop Installation Guide

This guide will help you install and run the Quanntaum Predict desktop application on Windows, macOS, or Linux.

## System Requirements

### Windows
- Windows 10 or later (64-bit)
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space

### macOS
- macOS 10.13 (High Sierra) or later
- Intel or Apple Silicon processor
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space

### Linux
- Ubuntu 18.04 or later, Fedora 30 or later, or compatible distribution
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space

## Installation Instructions

### Windows

1. Download the installer package (`Quanntaum-Predict-Setup-x.x.x.exe`) from the official website or distribution point.
2. Double-click the installer file to start the installation process.
3. Follow the on-screen instructions to complete the installation.
4. The application will be installed in your Program Files directory by default.
5. A desktop shortcut will be created for easy access.

### macOS

#### Intel Macs
1. Download the macOS Intel installer package (`Quanntaum-Predict-x.x.x-intel.dmg`) from the official website or distribution point.
2. Double-click the DMG file to mount it.
3. Drag the Quanntaum Predict application to your Applications folder.
4. Eject the DMG.
5. Open the application from your Applications folder.

#### Apple Silicon Macs (M1/M2)
1. Download the macOS Apple Silicon installer package (`Quanntaum-Predict-x.x.x-arm64.dmg`) from the official website or distribution point.
2. Double-click the DMG file to mount it.
3. Drag the Quanntaum Predict application to your Applications folder.
4. Eject the DMG.
5. Open the application from your Applications folder.

### Linux

#### Debian/Ubuntu-based distributions
1. Download the DEB package (`quanntaum-predict_x.x.x_amd64.deb`) from the official website or distribution point.
2. Install using your package manager or run:
   ```
   sudo dpkg -i quanntaum-predict_x.x.x_amd64.deb
   sudo apt-get install -f
   ```
3. Launch from your applications menu or run `quanntaum-predict` from the terminal.

#### Fedora/RHEL-based distributions
1. Download the RPM package (`quanntaum-predict-x.x.x.x86_64.rpm`) from the official website or distribution point.
2. Install using your package manager or run:
   ```
   sudo rpm -i quanntaum-predict-x.x.x.x86_64.rpm
   ```
3. Launch from your applications menu or run `quanntaum-predict` from the terminal.

#### AppImage
1. Download the AppImage file (`Quanntaum-Predict-x.x.x.AppImage`) from the official website or distribution point.
2. Make the AppImage executable:
   ```
   chmod +x Quanntaum-Predict-x.x.x.AppImage
   ```
3. Run the AppImage by double-clicking it or executing it from the terminal.

## First-time Setup

When you first launch Quanntaum Predict, you'll need to log in with your credentials:

- Default admin username: `admin`
- Default admin password: `adminpassword`

It's strongly recommended to change the default password after your first login.

## Troubleshooting

### Common Issues

#### Application won't start
- Ensure your operating system meets the minimum requirements.
- Check if you have sufficient disk space and system memory.
- Verify that your user account has adequate permissions.

#### MacOS security warning
If you receive a warning that the app cannot be opened because it is from an unidentified developer:
1. Right-click (or Control-click) the app icon.
2. Select "Open" from the shortcut menu.
3. Click "Open" in the dialog that appears.

#### Windows SmartScreen warning
If Windows SmartScreen prevents the app from starting:
1. Click "More info".
2. Click "Run anyway" to proceed with the installation.

## Support

For additional assistance, please contact:
- Email: support@quanntaum.com
- Website: https://www.quanntaum.com/support

## Data Storage

The desktop version of Quanntaum Predict uses a local in-memory database for storing application data. No additional database setup is required. All data is stored in memory and will be reset when the application is closed.

For a persistent database setup, please use the web-based deployment option of Quanntaum Predict.