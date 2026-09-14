#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
echo "== Wallaa recovered source verification =="
node -p "'package version: ' + require('./package.json').version"
grep -E 'MARKETING_VERSION|CURRENT_PROJECT_VERSION' ios/App/App.xcodeproj/project.pbxproj | sort -u
rm -rf node_modules dist
npm install
npm run build
npm run cap:sync
echo "OK: source built and Capacitor synchronized."
echo "Next: npm run ios:open"
