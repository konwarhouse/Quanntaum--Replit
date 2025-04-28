#!/bin/bash
# Check if arguments are provided
if [ $# -eq 0 ]; then
  # No arguments, build for all platforms
  node build-electron.js
else
  # Pass all arguments to build-electron.js
  node build-electron.js "$@"
fi
