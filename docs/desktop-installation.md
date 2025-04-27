# Quanntaum Predict Desktop Installation Guide

This guide will help you install and run the Quanntaum Predict desktop application on Windows, macOS, or Linux. The desktop application includes built-in SQLite database support for local data storage, requiring no additional database setup.

## Installer Availability

The pre-built installers for Quanntaum Predict are distributed through the project's private repository or direct download links. If you do not have access to these links, please:

1. Contact your organization's administrator to receive download access
2. Use the instructions in the "Building From Source" section later in this document

Current desktop installers available:
- Windows 10/11 (64-bit): `Quanntaum-Predict-Setup-1.0.0.exe`
- macOS Intel: `Quanntaum-Predict-1.0.0-x64.dmg`
- macOS Apple Silicon: `Quanntaum-Predict-1.0.0-arm64.dmg`

## System Requirements

### Windows
- Windows 10 or 11 (64-bit)
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space
- No internet connection required for basic operation

### macOS
- macOS Monterey (12) or Sequoia (15) or later
- Intel or Apple Silicon processor (both architectures supported)
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space
- No internet connection required for basic operation

### Linux
- Ubuntu 20.04 or later, Fedora 35 or later, or compatible distribution
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space
- No internet connection required for basic operation

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
Since the desktop installers are not currently signed with an Apple Developer certificate, macOS will display security warnings when you try to run the application. To bypass these warnings:

**For macOS Monterey:**
1. When you first try to open the application, you'll see a message stating "Quanntaum Predict cannot be opened because the developer cannot be verified."
2. Right-click (or Control-click) the app icon in Finder.
3. Select "Open" from the context menu.
4. In the dialog that appears, click "Open" to confirm.
5. If you still encounter issues, go to System Preferences > Security & Privacy > General tab.
6. You should see a message about "Quanntaum Predict was blocked from use." Click "Open Anyway".
7. Confirm by clicking "Open" in the subsequent dialog.

**For macOS Sequoia:**
1. After downloading, right-click (or Control-click) the application in Finder.
2. Choose "Open" from the context menu (doing this instead of double-clicking is crucial).
3. When prompted with a warning dialog, click "Open".
4. If the warning persists, go to System Settings > Privacy & Security.
5. Scroll down to find a message about "Quanntaum Predict was blocked" and click "Open Anyway".
6. Enter your password or use Touch ID when prompted.

#### Windows SmartScreen warning
Windows SmartScreen may prevent unsigned applications from running. Here's how to bypass this protection:

**For Windows 10:**
1. When you see the "Windows protected your PC" message, click "More info".
2. Click "Run anyway" to proceed with the installation.
3. If Windows Defender SmartScreen blocks the actual application after installation, repeat the same process for the application.

**For Windows 11:**
1. When SmartScreen blocks the installer, click on "More options" or "More info".
2. Click "Run anyway" to proceed.
3. If you continue to have issues, right-click the installer file and select "Properties".
4. At the bottom of the General tab, check the "Unblock" box next to "This file came from another computer".
5. Click "Apply" and "OK".
6. Now try running the installer again.

#### Advanced bypass for persistent security warnings
For persistent security issues, you may need to temporarily adjust security settings:

**macOS advanced bypass:**
```bash
# Run in Terminal after installation
xattr -dr com.apple.quarantine /Applications/Quanntaum\ Predict.app
```

**Windows advanced bypass:**
1. Open Windows Security settings
2. Go to App & browser control > Reputation-based protection settings
3. Temporarily turn off "Check apps and files"
4. Install the application
5. Re-enable the security setting after installation

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

## SQLite Integration Details

The desktop version of Quanntaum Predict uses SQLite for full data persistence without requiring any external database setup. Here's what you should know:

### Comprehensive Data Persistence
SQLite integration ensures all your data is saved between sessions:

- **User Authentication:** User accounts, roles, and permissions
- **Asset Management:** Equipment classes, assets, components
- **FMECA:** Both asset-level and system-level FMECA analyses
- **RCM:** RCM decision logic, maintenance strategies
- **RAM:** Reliability, availability, and maintainability analyses
- **Failure Data:** Historical failure records, Weibull parameters

### Transaction Safety
The application implements robust transaction handling and error recovery:

- Automatic transaction rollback in case of errors
- Graceful handling of database shutdowns
- Exponential backoff retry for transient errors

### File Size and Performance

- The SQLite database file typically remains under 100MB for most installations
- Performance remains excellent with hundreds of assets and thousands of records
- No noticeable performance degradation over time

## Building From Source

If you prefer to build the desktop application yourself, follow these instructions:

### Prerequisites

- Node.js 18.x or later
- Git
- Build tools for your platform:
  - **Windows:** Visual Studio Build Tools with C++ workload
  - **macOS:** Xcode Command Line Tools
  - **Linux:** GCC, make, and development libraries

### Build Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/quanntaum/predict.git
   cd predict
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup Electron dependencies:
   ```bash
   node setup-electron-deps.sh
   ```

4. Build the application:
   ```bash
   # For all platforms
   node build-electron.js
   
   # For specific platforms
   node build-electron.js --win  # Windows only
   node build-electron.js --mac  # macOS only
   node build-electron.js --linux  # Linux only
   ```

5. Find the installers in the `dist_electron` directory.

### Code Signing

The installers are currently unsigned. If you have your own code signing certificates, you can configure them in the `electron-builder.yml` file:

```yaml
# For macOS
mac:
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: electron/entitlements.plist
  entitlementsInherit: electron/entitlements.plist
  identity: "Your Developer ID Application Certificate"

# For Windows
win:
  certificateFile: path/to/certificate.pfx
  certificatePassword: YOUR_PASSWORD
```

## Frequently Asked Questions

### Costs and Licensing

**Q: Are there costs for SQLite integration or installer support with my existing plan?**  
A: No, there are no additional costs for SQLite integration or desktop installer support with your current plan. The SQLite database functionality is fully included without requiring any add-ons or premium features.

**Q: Do I need to purchase any licenses to use the desktop application?**  
A: No, the desktop application is included under your existing license. There are no additional license fees for using the desktop version on multiple computers within your organization.

### Installation and Distribution

**Q: Where can I download the pre-built installers?**  
A: The pre-built installers are available through your organization's private repository. If you don't have access to these, please contact your administrator or refer to the "Building From Source" section to build the installers yourself.

**Q: What tools do I need to build the installers locally?**  
A: To build the installers locally, you need:
- Node.js 18.x or later
- Platform-specific build tools (Visual Studio Build Tools for Windows, Xcode Command Line Tools for macOS)
- Git for source code management
- At least 2GB of free disk space for the build process

### SQLite and Data Persistence

**Q: Does SQLite support all the same functions as the server version?**  
A: Yes, the SQLite version supports all the same functionality as the server version, including user authentication, FMECA, RCM, and RAM modules. The only difference is that the data is stored locally rather than on a centralized server.

**Q: Can I share my data between multiple computers?**  
A: The desktop version with SQLite stores data locally on each computer. To share data between computers, you would need to either:
1. Use the server version with a centralized database
2. Manually copy the SQLite database file between computers (not recommended for collaborative work)

**Q: Is my data safe if the application crashes?**  
A: Yes, the application implements robust transaction handling and error recovery. In case of application crashes, your data should remain intact. We still recommend regular backups of your database file as outlined in the "Database Backup" section.