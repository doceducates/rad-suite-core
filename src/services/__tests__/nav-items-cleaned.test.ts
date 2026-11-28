import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from '@/components/layout/nav-items';

describe('Sidebar Navigation Menu Items', () => {
  it('should not contain clinic-node in side menu items', () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(ids).not.toContain('clinic-node');
  });

  it('should retain core clinical workflow routes in side menu', () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('my_cases');
    expect(ids).toContain('hmis');
    expect(ids).toContain('pacs');
    expect(ids).toContain('workspace');
    expect(ids).toContain('studio');
    expect(ids).toContain('settings');
  });

  it('should place Command Center dashboard as primary homepage item', () => {
    expect(NAV_ITEMS[0].id).toBe('dashboard');
    expect(NAV_ITEMS[0].href).toBe('/dashboard');
    expect(NAV_ITEMS[0].label).toBe('Command Center');
  });

  it('should link workspace to /workspace directly without hardcoded case', () => {
    const workspaceItem = NAV_ITEMS.find((item) => item.id === 'workspace');
    expect(workspaceItem).toBeDefined();
    expect(workspaceItem?.href).toBe('/workspace');
    expect(workspaceItem?.href).not.toContain('ASGHARI_BB');
  });

  it('should use updated clean clinical labels: HMIS, PACS, and Workspace', () => {
    expect(NAV_ITEMS.find((item) => item.id === 'hmis')?.label).toBe('HMIS');
    expect(NAV_ITEMS.find((item) => item.id === 'hmis')?.href).toBe('/hmis');
    expect(NAV_ITEMS.find((item) => item.id === 'pacs')?.label).toBe('PACS');
    expect(NAV_ITEMS.find((item) => item.id === 'workspace')?.label).toBe('Workspace');
  });
});
