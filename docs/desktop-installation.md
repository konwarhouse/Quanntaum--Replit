# Quanntaum Predict Desktop Installation Guide

This guide explains how to install and use the Quanntaum Predict application as a desktop application. The desktop version is designed for testing and evaluation purposes, with sample data included and no database setup required.

## System Requirements

### Windows
- Windows 10 or 11 (64-bit recommended)
- 4GB RAM minimum (8GB recommended)
- 500MB disk space
- Administrator privileges for installation

### macOS
- macOS Monterey (12.0) or newer
- Compatible with both Apple Silicon (M1/M2) and Intel processors
- 4GB RAM minimum (8GB recommended)
- 500MB disk space

### Linux
- Ubuntu 20.04 LTS or newer (or equivalent)
- 4GB RAM minimum (8GB recommended)
- 500MB disk space

## Installation Instructions

### Windows Installation

1. Download the Quanntaum Predict installer (`Quanntaum-Predict-Setup-x.x.x.exe`) from the provided source.
2. Double-click the installer file to start the installation process.
3. If you see a security warning, click "More info" and then "Run anyway" (this occurs because the app may not be signed with a trusted certificate).
4. Follow the on-screen instructions to complete the installation.
5. The application will be installed in your Program Files directory and a shortcut will be created on your desktop and in the Start menu.

### macOS Installation

1. Download the Quanntaum Predict disk image (`Quanntaum-Predict-x.x.x.dmg`) from the provided source.
2. Double-click the .dmg file to open it.
3. Drag the Quanntaum Predict icon to the Applications folder.
4. When opening for the first time, right-click (or Control+click) on the app in the Applications folder and select "Open".
5. Click "Open" in the security dialog that appears (this only needs to be done the first time).

### Linux Installation

1. Download the appropriate package for your distribution:
   - `.AppImage`: Universal Linux package
   - `.deb`: For Debian/Ubuntu-based distributions
   - `.rpm`: For Red Hat/Fedora-based distributions
2. For .AppImage:
   - Make it executable: `chmod +x Quanntaum-Predict-x.x.x.AppImage`
   - Run it directly: `./Quanntaum-Predict-x.x.x.AppImage`
3. For .deb:
   - Install with: `sudo dpkg -i Quanntaum-Predict-x.x.x.deb`
   - Or double-click to open with your package manager
4. For .rpm:
   - Install with: `sudo rpm -i Quanntaum-Predict-x.x.x.rpm`
   - Or double-click to open with your package manager

## Using the Desktop Application

### Login Information

The desktop application comes pre-configured with sample data and a default admin account:

- Username: `admin`
- Password: `adminpassword`

### Features Available in Desktop Mode

The desktop version includes all features of the web application, including:

- Asset management and reliability analysis
- Weibull analysis for failure prediction
- FMECA (Failure Mode, Effects, and Criticality Analysis)
- RCM (Reliability Centered Maintenance) planning
- AI-powered chat assistant

### Important Notes

1. **Sample Data**: The desktop application uses pre-populated sample data for demonstration purposes. This data is stored in-memory and will reset when the application is restarted.

2. **No Database Required**: Unlike the server version, the desktop application doesn't require a separate database setup.

3. **File Import/Export**: You can import and export data files from the desktop version, but permanent data storage requires the server version with a proper database.

## Troubleshooting

### Application Won't Start

- **Windows**: Check the Event Viewer for details about application crashes
- **macOS**: Check Console.app for error messages
- **Linux**: Try running from terminal to see error output

### Security Warnings

- **Windows**: The application may trigger SmartScreen warnings if it's not signed with a trusted certificate
- **macOS**: You may need to authorize the app in System Preferences > Security & Privacy
- **Linux**: Make sure .AppImage files have execute permissions

### Other Issues

For any other issues or questions about the desktop application, please contact support with the following information:

1. Your operating system and version
2. Steps to reproduce the issue
3. Any error messages displayed

## Uninstallation

### Windows
- Use the "Add or Remove Programs" feature in Windows Settings
- Or use the uninstaller in the installation directory

### macOS
- Drag the application from the Applications folder to the Trash
- Optionally, clean preferences with: `rm ~/Library/Preferences/com.quanntaum.predict.plist`

### Linux
- For .deb packages: `sudo apt remove quanntaum-predict`
- For .rpm packages: `sudo rpm -e quanntaum-predict`
- For .AppImage: Simply delete the .AppImage file