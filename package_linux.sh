#!/bin/bash
set -e

echo "📦 Starting DScope Linux Packaging..."

# 1. Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf client/dist
rm -rf server/node_modules

# 2. Build Client
echo "🏗️ Building Frontend..."
cd client
npm install
npm run build
cd ..

# 3. Prepare Server
echo "⚙️ Installing Backend Production Dependencies..."
cd server
npm install --omit=dev
cd ..

# 4. Package Electron App
echo "🎁 Packaging Application..."
echo "  - Building AppImage..."
npm run dist -- --linux AppImage

echo "  - Building Deb..."
npm run dist -- --linux deb || echo "⚠️ Deb build failed, continuing..."

echo "  - Building RPM..."
npm run dist -- --linux rpm || echo "⚠️ RPM build failed, continuing..."

echo "✅ Packaging Process Finished! Artifacts are in 'dist/'"
