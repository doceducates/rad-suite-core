import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Brand Identity & Single Source of Truth Icon Architecture', () => {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const brandDir = path.join(publicDir, 'brand');
  const tauriIconsDir = path.join(rootDir, 'src-tauri', 'icons');

  it('verifies public/brand/radsuite-icon.svg exists as the single source of truth', () => {
    const masterSvgPath = path.join(brandDir, 'radsuite-icon.svg');
    expect(fs.existsSync(masterSvgPath)).toBe(true);

    const content = fs.readFileSync(masterSvgPath, 'utf-8');
    // Enforces the preferred green color scheme
    expect(content).toContain('#8ecf9e');
    expect(content).toContain('#4a7c59');
    // Ensures old blue/cyan palette is not present
    expect(content).not.toContain('#38bdf8');
    expect(content).not.toContain('#0284c7');
  });

  it('verifies web favicons exist and use the green color scheme', () => {
    const faviconSvg = path.join(publicDir, 'favicon.svg');
    const brandFaviconSvg = path.join(brandDir, 'favicon.svg');
    const faviconIco = path.join(publicDir, 'favicon.ico');

    expect(fs.existsSync(faviconSvg)).toBe(true);
    expect(fs.existsSync(brandFaviconSvg)).toBe(true);
    expect(fs.existsSync(faviconIco)).toBe(true);

    const svgContent = fs.readFileSync(faviconSvg, 'utf-8');
    expect(svgContent).toContain('#8ecf9e');
    expect(svgContent).toContain('#4a7c59');
    expect(svgContent).not.toContain('#38bdf8');
  });

  it('verifies desktop and mobile app icons exist in src-tauri/icons', () => {
    const requiredIcons = [
      'icon.ico',
      'icon.png',
      'icon.icns',
      '32x32.png',
      '128x128.png',
      '128x128@2x.png',
      'Square150x150Logo.png',
    ];

    for (const iconFile of requiredIcons) {
      const p = path.join(tauriIconsDir, iconFile);
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.statSync(p).size).toBeGreaterThan(0);
    }
  });

  it('verifies RadSuiteLogo component references the single source of truth icon', () => {
    const logoComponentPath = path.join(rootDir, 'src', 'components', 'brand', 'radsuite-logo.tsx');
    expect(fs.existsSync(logoComponentPath)).toBe(true);

    const content = fs.readFileSync(logoComponentPath, 'utf-8');
    expect(content).toContain('/brand/radsuite-icon.svg');
  });

  it('verifies RootLayout registers favicons and web app manifest', () => {
    const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf-8');

    expect(content).toContain('/favicon.ico');
    expect(content).toContain('/favicon.svg');
    expect(content).toContain('/site.webmanifest');
  });

  it('verifies package.json exposes npm run generate:icons script', () => {
    const packageJsonPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(pkg.scripts['generate:icons']).toBeDefined();
    expect(pkg.scripts['generate:icons']).toContain('generate-brand-assets.js');
  });
});
