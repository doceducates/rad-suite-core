import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitize';

describe('HTML Sanitizer for Clinical Reporting', () => {
  it('should strip malicious script tags completely', () => {
    const malicious = '<p>Normal finding</p><script>alert("XSS")</script>';
    const clean = sanitizeHtml(malicious);
    expect(clean).toBe('<p>Normal finding</p>');
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('alert');
  });

  it('should strip iframe and embed tags', () => {
    const malicious = '<div><iframe src="http://evil.com"></iframe><b>Intact bone</b></div>';
    const clean = sanitizeHtml(malicious);
    expect(clean).not.toContain('iframe');
    expect(clean).toContain('<b>Intact bone</b>');
  });

  it('should strip inline event handlers like onerror, onload, onclick', () => {
    const malicious = '<img src="x" onerror="alert(1)" /><span onclick="stealData()">Text</span>';
    const clean = sanitizeHtml(malicious);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('stealData');
    expect(clean).toContain('<span>Text</span>');
  });

  it('should preserve safe clinical formatting tags', () => {
    const safe = '<p><strong>Left Kidney:</strong> Normal size and shape. <em>No calculus.</em></p>';
    const clean = sanitizeHtml(safe);
    expect(clean).toBe(safe);
  });
});
