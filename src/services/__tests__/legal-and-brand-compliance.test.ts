import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Legal & Brand Assets Compliance for Google Verification', () => {
  const publicBrandDir = path.join(process.cwd(), 'public', 'brand');
  const termsPagePath = path.join(process.cwd(), 'src', 'app', 'terms', 'page.tsx');
  const privacyPagePath = path.join(process.cwd(), 'src', 'app', 'privacy', 'page.tsx');

  it('contains all required production brand assets (SVGs and high-res concepts)', () => {
    const requiredFiles = [
      'radsuite-icon.svg',
      'radsuite-logo.svg',
      'radsuite-logo-light.svg',
      'favicon.svg',
      'radsuite-concept-a-app-icon.jpg',
      'radsuite-concept-b-vector-emblem.jpg',
      'radsuite-concept-c-diagnostic-lens.jpg',
    ];

    for (const f of requiredFiles) {
      const fullPath = path.join(publicBrandDir, f);
      expect(fs.existsSync(fullPath), `Missing brand asset: ${f}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(500);
    }
  });

  it('verifies Privacy Policy includes mandatory Google API Services User Data Policy clauses', () => {
    expect(fs.existsSync(privacyPagePath)).toBe(true);
    const content = fs.readFileSync(privacyPagePath, 'utf-8');

    // Google OAuth verification requirements
    expect(content).toContain('Google API Services User Data Policy');
    expect(content).toContain('Limited Use requirements');
    expect(content).toContain('https://www.googleapis.com/auth/drive.file');
    expect(content).toContain('official@sehatai.org');
    expect(content).toContain('No Generalized AI Training');
    expect(content).toContain('Zero Advertising or Sale');
    expect(content).toContain('Disconnect Google Drive');
  });

  it('verifies Terms of Service includes clinical disclaimer and Google Drive terms', () => {
    expect(fs.existsSync(termsPagePath)).toBe(true);
    const content = fs.readFileSync(termsPagePath, 'utf-8');

    // Clinical disclaimer and responsibility
    expect(content).toContain('Acceptance of Terms');
    expect(content).toContain('Clinical Scope');
    expect(content).toContain('Google Drive');
    expect(content).toContain('drive.file');
    expect(content).toContain('official@sehatai.org');
  });

  it('verifies landing footer links to both terms and privacy', () => {
    const footerPath = path.join(process.cwd(), 'src', 'components', 'landing', 'landing-footer.tsx');
    expect(fs.existsSync(footerPath)).toBe(true);
    const content = fs.readFileSync(footerPath, 'utf-8');

    expect(content).toContain('/terms');
    expect(content).toContain('/privacy');
  });
});
