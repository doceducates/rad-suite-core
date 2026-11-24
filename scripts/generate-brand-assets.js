/**
 * Rad Suite Master Brand Asset & Icon Generator
 * Single Source of Truth: public/brand/radsuite-icon.svg
 *
 * Automatically generates and synchronizes:
 * - Web Favicons (favicon.ico multi-res, favicon.svg, favicon-96x96.png, apple-touch-icon.png)
 * - PWA Assets (web-app-manifest-192x192.png, web-app-manifest-512x512.png, site.webmanifest)
 * - Brand Vector Assets (public/brand/favicon.svg, radsuite-logo.svg, radsuite-logo-light.svg)
 * - Desktop Tauri Icons (icon.ico, icon.icns, icon.png, 32x32, 64x64, 128x128, 256x256, Square*Logo)
 * - Android App Icons (res/mipmap-* hdpi, xhdpi, xxhdpi, xxxhdpi)
 * - Standalone Next.js and Tauri build cache synchronization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const BRAND_DIR = path.join(PUBLIC_DIR, 'brand');
const TAURI_ICONS_DIR = path.join(ROOT_DIR, 'src-tauri', 'icons');

// Single source of truth master icon
const DEFAULT_SOURCE_SVG = path.join(BRAND_DIR, 'radsuite-icon.svg');

function log(msg) {
  console.log(`[BrandAssets] ${msg}`);
}

function runCommand(cmd, cwd = ROOT_DIR) {
  log(`Executing: ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

function copyFileSafe(src, dest) {
  if (fs.existsSync(src)) {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, dest);
    log(`Synced: ${path.relative(ROOT_DIR, dest)}`);
  }
}

function main() {
  const customSource = process.argv[2];
  let sourceFile = DEFAULT_SOURCE_SVG;

  if (customSource) {
    const resolvedCustom = path.resolve(process.cwd(), customSource);
    if (!fs.existsSync(resolvedCustom)) {
      console.error(`[BrandAssets] Error: Specified source file "${resolvedCustom}" does not exist.`);
      process.exit(1);
    }
    sourceFile = resolvedCustom;
    log(`Using custom source icon: ${sourceFile}`);

    // If source is a different SVG, update master radsuite-icon.svg
    if (resolvedCustom !== DEFAULT_SOURCE_SVG && resolvedCustom.endsWith('.svg')) {
      fs.copyFileSync(resolvedCustom, DEFAULT_SOURCE_SVG);
      log(`Updated master single source of truth: public/brand/radsuite-icon.svg`);
    }
  } else {
    log(`Using master single source of truth: ${path.relative(ROOT_DIR, sourceFile)}`);
  }

  if (!fs.existsSync(sourceFile)) {
    console.error(`[BrandAssets] Error: Master icon "${sourceFile}" not found!`);
    process.exit(1);
  }

  // 1. Run Tauri Icon generator to produce desktop & mobile icons from master SVG
  log('Generating Desktop & Mobile App Icons via Tauri engine...');
  const relSource = path.relative(ROOT_DIR, sourceFile).replace(/\\/g, '/');
  runCommand(`npm run tauri -- icon "${relSource}"`);

  // 2. Generate multi-resolution favicon.ico and web PNGs from generated icon.png (512x512)
  const masterPng = path.join(TAURI_ICONS_DIR, 'icon.png');
  if (fs.existsSync(masterPng)) {
    log('Generating Web Favicons, Apple Touch Icon, and PWA Manifest Icons via Pillow...');
    const pythonScript = `
import os
from PIL import Image

src_png = r"${masterPng}"
public_dir = r"${PUBLIC_DIR}"

img = Image.open(src_png).convert("RGBA")

# 1. Multi-resolution favicon.ico
ico_path = os.path.join(public_dir, "favicon.ico")
img.save(ico_path, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(f"Generated multi-res: {ico_path}")

# 2. Web PNG icons
img.resize((96, 96), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "favicon-96x96.png"), format="PNG")
img.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "apple-touch-icon.png"), format="PNG")
img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "web-app-manifest-192x192.png"), format="PNG")
img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "web-app-manifest-512x512.png"), format="PNG")
print("Generated web pngs: favicon-96x96.png, apple-touch-icon.png, web-app-manifest-192x192.png, web-app-manifest-512x512.png")
`;
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch_gen_icons.py'), pythonScript);
    try {
      execSync('python scratch_gen_icons.py', { cwd: ROOT_DIR, stdio: 'inherit' });
    } finally {
      if (fs.existsSync(path.join(ROOT_DIR, 'scratch_gen_icons.py'))) {
        fs.unlinkSync(path.join(ROOT_DIR, 'scratch_gen_icons.py'));
      }
    }
  }

  // 3. Sync icon.ico to public/favicon.ico fallback
  const tauriIco = path.join(TAURI_ICONS_DIR, 'icon.ico');
  if (fs.existsSync(tauriIco) && !fs.existsSync(path.join(PUBLIC_DIR, 'favicon.ico'))) {
    copyFileSafe(tauriIco, path.join(PUBLIC_DIR, 'favicon.ico'));
  }

  // 4. Synchronize to standalone build caches if they exist
  const cacheLocations = [
    path.join(ROOT_DIR, '.next', 'standalone', 'public'),
    path.join(ROOT_DIR, 'src-tauri', 'resources', 'standalone', 'public'),
    path.join(ROOT_DIR, 'src-tauri', 'target', 'release', 'standalone', 'public'),
    path.join(ROOT_DIR, 'src-tauri', 'target', 'debug', 'standalone', 'public'),
  ];

  const filesToSync = [
    'favicon.ico',
    'favicon.svg',
    'favicon-96x96.png',
    'apple-touch-icon.png',
    'web-app-manifest-192x192.png',
    'web-app-manifest-512x512.png',
    'site.webmanifest',
    path.join('brand', 'radsuite-icon.svg'),
    path.join('brand', 'radsuite-logo.svg'),
    path.join('brand', 'radsuite-logo-light.svg'),
    path.join('brand', 'favicon.svg'),
  ];

  for (const cacheDir of cacheLocations) {
    if (fs.existsSync(cacheDir)) {
      log(`Syncing brand assets to cache directory: ${path.relative(ROOT_DIR, cacheDir)}`);
      for (const relFile of filesToSync) {
        const src = path.join(PUBLIC_DIR, relFile);
        const dest = path.join(cacheDir, relFile);
        copyFileSafe(src, dest);
      }
    }
  }

  log('===========================================================');
  log('SUCCESS: All brand assets, favicons, and icons regenerated!');
  log('Single Source of Truth: public/brand/radsuite-icon.svg');
  log('Primary Color Scheme: Sage Mint (#8ecf9e) & Clinical Emerald (#4a7c59)');
  log('===========================================================');
}

main();
