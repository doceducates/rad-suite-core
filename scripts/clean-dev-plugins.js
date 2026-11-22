#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '../plugins');
const proprietary = ['anatomy-atlas', 'clinic-edge', 'clinical-ai', 'hmis-gateway'];
let cleanedCount = 0;

for (const id of proprietary) {
  const p = path.join(targetDir, id);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`[-] Removed dev plugin: ${id}`);
    cleanedCount++;
  }
}

if (cleanedCount > 0) {
  console.log(`[✓] Removed ${cleanedCount} proprietary plugins. Workstation is in clean public release state.`);
} else {
  console.log('[*] Plugins directory is already clean (no proprietary plugins present).');
}
