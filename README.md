# Quanntaum-Predict2

**Cross-platform desktop application with backend API and Electron frontend.**

## Repository Structure

- **Root:** Backend API (Node.js/Express), frontend (Vite/React), build scripts.
- **`/electron`:** Electron desktop app, build tooling, platform-specific configs.

## Quick Start

```bash
# Install all dependencies
bash setup-electron-deps.sh

# Build Desktop App
cd electron
npm run build
```

## Building & Packaging

See [`/electron/README.md`](electron/README.md) for cross-platform Electron build instructions.

## Backend/Electron Integration

- Electron app uses backend API via local or embedded server.
- SQLite/Postgres support for both modes.

## Documentation

- Electron build: [`/electron/README.md`](electron/README.md)
- (Expand with backend usage, troubleshooting, FAQ, etc.)

## Contributing

- Pull requests welcome!
- See audit recommendations for ongoing improvements.

