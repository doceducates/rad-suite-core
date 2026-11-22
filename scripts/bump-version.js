#!/usr/bin/env node
/**
 * Automated Semantic Version Bumper (<100 lines)
 * Synchronizes version across package.json, tauri.conf.json, Cargo.toml, and build.gradle.kts
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const pkgPath = path.join(projectRoot, 'package.json');
const tauriConfPath = path.join(projectRoot, 'src-tauri', 'tauri.conf.json');
const cargoPath = path.join(projectRoot, 'src-tauri', 'Cargo.toml');
const gradlePath = path.join(projectRoot, 'src-tauri', 'gen', 'android', 'app', 'build.gradle.kts');

const arg = (process.argv[2] || 'patch').toLowerCase().trim();

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';

function incrementVersion(version, type) {
  const parts = version.split('.').map((p) => parseInt(p, 10));
  while (parts.length < 3) parts.push(0);

  if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else if (type === 'patch') {
    parts[2] += 1;
  } else if (/^\d+\.\d+\.\d+$/.test(type)) {
    return type;
  } else {
    throw new Error(`Invalid version or bump type: ${type}. Use 'patch', 'minor', 'major', or 'X.Y.Z'.`);
  }
  return parts.join('.');
}

const nextVersion = incrementVersion(currentVersion, arg);
console.log(`\x1b[36mSynchronizing version: ${currentVersion} -> ${nextVersion}\x1b[0m`);

// 1. package.json
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('  * Updated package.json');

// 2. src-tauri/tauri.conf.json
if (fs.existsSync(tauriConfPath)) {
  const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  conf.version = nextVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2) + '\n', 'utf8');
  console.log('  * Updated src-tauri/tauri.conf.json');
}

// 3. src-tauri/Cargo.toml
if (fs.existsSync(cargoPath)) {
  let cargo = fs.readFileSync(cargoPath, 'utf8');
  cargo = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${nextVersion}"`);
  fs.writeFileSync(cargoPath, cargo, 'utf8');
  console.log('  * Updated src-tauri/Cargo.toml');
}

// 4. Android build.gradle.kts (versionName & versionCode)
if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  const vParts = nextVersion.split('.').map((p) => parseInt(p, 10));
  const newCode = vParts[0] * 10000 + vParts[1] * 100 + vParts[2];
  gradle = gradle.replace(/versionName\s*=\s*"[^"]+"/m, `versionName = "${nextVersion}"`);
  gradle = gradle.replace(/versionCode\s*=\s*\d+/m, `versionCode = ${newCode}`);
  fs.writeFileSync(gradlePath, gradle, 'utf8');
  console.log(`  * Updated Android build.gradle.kts (versionCode = ${newCode})`);
}

console.log(`\x1b[32mSuccessfully bumped version to v${nextVersion}!\x1b[0m`);
