/**
 * Strict HTML Sanitizer for Clinical Reporting & AI Output
 * Protects against XSS attacks in rich-text outputs and dictation feeds.
 */

const ALLOWED_TAGS = new Set([
  'p', 'b', 'i', 'strong', 'em', 'u', 'br', 'ul', 'ol', 'li',
  'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr',
]);

const ALLOWED_ATTRS = new Set(['class']);

/**
 * Sanitizes input HTML string by removing dangerous tags, attributes, and scripts.
 */
export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml) return '';

  // 1. Remove dangerous script, iframe, object, embed, style, and link blocks entirely
  let clean = dirtyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '');

  // 2. Strip all inline event handlers (e.g. onload=, onerror=, onclick=) and javascript: schemes
  clean = clean
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, '');

  // 3. Filter tags against whitelist
  clean = clean.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return ''; // Strip disallowed tag entirely
    }

    if (match.startsWith('</')) {
      return `</${lowerTag}>`;
    }

    // Filter attributes to allow only safe ones like class
    let sanitizedAttrs = '';
    const attrRegex = /([a-z-]+)\s*=\s*(?:'([^']*)'|"([^"]*)"|([^\s>]+))/gi;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      if (ALLOWED_ATTRS.has(attrName)) {
        sanitizedAttrs += ` ${attrName}="${attrVal.replace(/"/g, '&quot;')}"`;
      }
    }

    const selfClosing = match.endsWith('/>') ? ' /' : '';
    return `<${lowerTag}${sanitizedAttrs}${selfClosing}>`;
  });

  return clean;
}
