const fs = require('fs');
const path = require('path');

const packageSwiftPath = path.join(
  process.cwd(),
  'node_modules',
  '@capacitor-community',
  'apple-sign-in',
  'Package.swift'
);

if (!fs.existsSync(packageSwiftPath)) {
  process.exit(0);
}

const original = fs.readFileSync(packageSwiftPath, 'utf8');
const patched = original.replace(
  '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")',
  '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")'
);

if (patched !== original) {
  fs.writeFileSync(packageSwiftPath, patched);
  console.log('Patched @capacitor-community/apple-sign-in SPM dependency for Capacitor 8.');
}
