#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../rad-suite-plugins/plugins');
const targetDir = path.resolve(__dirname, '../plugins');

if (!fs.existsSync(srcDir)) {
  console.error(`[-] Private plugins repository not found at: ${srcDir}`);
  process.exit(0);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const entries = fs.readdirSync(srcDir, { withFileTypes: true });
let linkedCount = 0;

for (const entry of entries) {
  if (entry.isDirectory()) {
    const srcPlugin = path.join(srcDir, entry.name);
    const targetPlugin = path.join(targetDir, entry.name);
    if (!fs.existsSync(targetPlugin)) {
      fs.cpSync(srcPlugin, targetPlugin, { recursive: true });
      console.log(`[+] Linked proprietary dev plugin: ${entry.name}`);
      linkedCount++;
    }
  }
}

if (linkedCount === 0) {
  console.log('[*] All proprietary plugins are already linked in plugins/.');
} else {
  console.log(`[✓] Successfully linked ${linkedCount} plugins for local development testing.`);
}
