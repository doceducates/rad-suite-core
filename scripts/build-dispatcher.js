#!/usr/bin/env node
/**
 * Rad Suite Unified Multi-Platform Build Dispatcher
 * Dispatches builds for Windows, Android, macOS, and Linux
 */

const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const target = (process.argv[2] || 'windows').toLowerCase().trim();
const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

const projectRoot = path.resolve(__dirname, '..');

console.log('\x1b[36m%s\x1b[0m', '==========================================================');
console.log('\x1b[36m%s\x1b[0m', '   RAD SUITE MULTI-PLATFORM BUILD DISPATCHER              ');
console.log('\x1b[90m%s\x1b[0m', `   Host: ${os.platform()} (${os.arch()}) | Target: ${target}`);
console.log('\x1b[36m%s\x1b[0m', '==========================================================\n');

function runPowerShellScript(scriptName, args = []) {
  const scriptPath = path.join(__dirname, scriptName);
  const psArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args];
  const res = spawnSync('powershell', psArgs, {
    stdio: 'inherit',
    cwd: projectRoot,
  });
  return res.status;
}

function runCommand(command, args = []) {
  const res = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: projectRoot,
    shell: true,
  });
  return res.status;
}

switch (target) {
  case 'windows':
  case 'win':
    console.log('\x1b[33m%s\x1b[0m', '-> Initiating Windows Desktop NSIS Pipeline...');
    if (isWindows) {
      process.exit(runPowerShellScript('release-desktop.ps1'));
    } else {
      console.log('\x1b[31m%s\x1b[0m', 'Windows installers must be compiled on Windows or GitHub Actions CI.');
      process.exit(1);
    }
    break;

  case 'android':
  case 'apk':
    console.log('\x1b[33m%s\x1b[0m', '-> Initiating Android APK Pipeline...');
    if (isWindows) {
      process.exit(runPowerShellScript('build-android.ps1'));
    } else {
      process.exit(runCommand('npx', ['@tauri-apps/cli', 'android', 'build', '--apk']));
    }
    break;

  case 'macos':
  case 'mac':
  case 'darwin':
    console.log('\x1b[33m%s\x1b[0m', '-> Initiating macOS Application Pipeline...');
    if (isWindows) {
      process.exit(runPowerShellScript('build-macos.ps1'));
    } else if (isMac) {
      process.exit(runCommand('npx', ['@tauri-apps/cli', 'build', '--bundles', 'dmg,app']));
    } else {
      console.log('\x1b[31m%s\x1b[0m', 'macOS builds must be compiled on macOS or GitHub Actions CI.');
      process.exit(1);
    }
    break;

  case 'linux':
  case 'deb':
  case 'appimage':
    console.log('\x1b[33m%s\x1b[0m', '-> Initiating Linux Package Pipeline...');
    if (isWindows) {
      process.exit(runPowerShellScript('build-linux.ps1'));
    } else if (isLinux) {
      process.exit(runCommand('npx', ['@tauri-apps/cli', 'build', '--bundles', 'deb,appimage']));
    } else {
      console.log('\x1b[31m%s\x1b[0m', 'Linux packages must be compiled on Linux or via WSL/Docker.');
      process.exit(1);
    }
    break;

  case 'all':
    console.log('\x1b[33m%s\x1b[0m', '-> Initiating Full Multi-Platform Matrix...');
    console.log('1. Building Windows desktop installer...');
    runPowerShellScript('release-desktop.ps1');
    console.log('\n2. Building Android production APK...');
    runPowerShellScript('build-android.ps1');
    console.log('\n3. macOS & Linux target summary...');
    runPowerShellScript('build-macos.ps1');
    runPowerShellScript('build-linux.ps1');
    break;

  default:
    console.log('\x1b[31m%s\x1b[0m', `Unknown target: ${target}`);
    console.log('Valid targets: windows, android, macos, linux, all');
    process.exit(1);
}
