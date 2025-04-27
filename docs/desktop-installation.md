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

For macOS Monterey or later, you may need additional steps:
1. After downloading, open System Preferences > Security & Privacy.
2. Look for a message about "Quanntaum Predict was blocked" and click "Open Anyway".
3. Confirm by clicking "Open" in the subsequent dialog.

#### Windows SmartScreen warning
If Windows SmartScreen prevents the app from starting:
1. Click "More info".
2. Click "Run anyway" to proceed with the installation.

For Windows 11, you may need to take additional steps:
1. Right-click the installer file and select "Properties".
2. Check the "Unblock" box next to "This file came from another computer".
3. Click "Apply" and "OK".
4. Now try running the installer again.

## Support

For additional assistance, please contact:
- Email: support@quanntaum.com
- Website: https://www.quanntaum.com/support

## Data Storage

The desktop version of Quanntaum Predict uses SQLite for persistent data storage. No additional database setup is required. All data is automatically saved to a local database file on your system.

### Database Location

The SQLite database is stored in:

- **Windows**: `%APPDATA%\Quanntaum-Predict\quanntaum-predict.db`
  - Typically: `C:\Users\[YourUsername]\AppData\Roaming\Quanntaum-Predict\quanntaum-predict.db`

- **macOS**: `~/Library/Application Support/Quanntaum-Predict/quanntaum-predict.db`
  - Typically: `/Users/[YourUsername]/Library/Application Support/Quanntaum-Predict/quanntaum-predict.db`

- **Linux**: `~/.local/share/Quanntaum-Predict/quanntaum-predict.db`
  - Typically: `/home/[YourUsername]/.local/share/Quanntaum-Predict/quanntaum-predict.db`

### Data Persistence

All modules in Quanntaum Predict support data persistence across sessions:

- User accounts and authentication
- Equipment and asset data
- FMECA analysis (both asset-level and system-level)
- RCM analysis data
- RAM analysis data
- Failure history records

### Database Backup

It's recommended to periodically back up your database file. To create a backup:

1. Close the Quanntaum Predict application
2. Navigate to the database location mentioned above
3. Copy the `quanntaum-predict.db` file to a secure backup location

### Troubleshooting Database Issues

If you experience database-related issues:

1. Close the application
2. Make a backup copy of your database file
3. Restart the application

For persistent database corruption issues, you can reset the database by:
1. Close the application
2. Rename or remove the database file
3. Restart the application (a new database will be created)
4. Note that this will reset all your data