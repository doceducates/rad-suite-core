import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDesktopApp, isMobileDevice, getAppPlatform } from '../platform';

describe('Platform Feature Gating Utility (src/lib/platform.ts)', () => {
  const originalWindow = global.window;
  const originalUserAgent = global.navigator?.userAgent;

  const setUserAgent = (ua: string) => {
    Object.defineProperty(global.navigator, 'userAgent', {
      value: ua,
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
    if (originalUserAgent) {
      setUserAgent(originalUserAgent);
    }
  });

  it('correctly identifies Web environment by default', () => {
    (global as any).window = {
      location: { search: '', pathname: '/' },
      innerWidth: 1920,
    };
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

    expect(isDesktopApp()).toBe(false);
    expect(isMobileDevice()).toBe(false);
    expect(getAppPlatform()).toBe('web');
  });

  it('correctly detects Tauri Desktop environment via internals', () => {
    (global as any).window = {
      location: { search: '', pathname: '/' },
      innerWidth: 1920,
      __TAURI_INTERNALS__: {},
    };
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

    expect(isDesktopApp()).toBe(true);
    expect(getAppPlatform()).toBe('desktop');
  });

  it('correctly detects Desktop environment via query parameter source=desktop', () => {
    (global as any).window = {
      location: { search: '?source=desktop', pathname: '/login' },
      innerWidth: 1920,
    };
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

    expect(isDesktopApp()).toBe(true);
    expect(getAppPlatform()).toBe('desktop');
  });

  it('correctly detects Mobile environment via User-Agent', () => {
    (global as any).window = {
      location: { search: '', pathname: '/' },
      innerWidth: 1024,
    };
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36');

    expect(isDesktopApp()).toBe(false);
    expect(isMobileDevice()).toBe(true);
    expect(getAppPlatform()).toBe('mobile');
  });

  it('correctly detects Mobile environment via viewport width < 768px', () => {
    (global as any).window = {
      location: { search: '', pathname: '/' },
      innerWidth: 375,
    };
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');

    expect(isDesktopApp()).toBe(false);
    expect(isMobileDevice()).toBe(true);
    expect(getAppPlatform()).toBe('mobile');
  });
});
