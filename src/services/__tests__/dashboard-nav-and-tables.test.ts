import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Dashboard Navigation, Sticky Header & Sticky Tables Architecture', () => {
  const componentsDir = path.join(process.cwd(), 'src', 'components');

  it('verifies Navbar does NOT contain redundant "Radiology Workstation" text', () => {
    const navbarFile = path.join(componentsDir, 'layout', 'navbar.tsx');
    expect(fs.existsSync(navbarFile)).toBe(true);
    const content = fs.readFileSync(navbarFile, 'utf-8');

    expect(content).not.toContain('Radiology Workstation');
    expect(content).toContain('RadSuiteLogo');
    expect(content).toContain('sticky top-0');
  });

  it('verifies Sidebar and MobileNavDrawer use RadSuiteLogo', () => {
    const sidebarFile = path.join(componentsDir, 'layout', 'sidebar.tsx');
    const mobileDrawerFile = path.join(componentsDir, 'layout', 'mobile-nav-drawer.tsx');

    const sidebarContent = fs.readFileSync(sidebarFile, 'utf-8');
    expect(sidebarContent).toContain('RadSuiteLogo');

    const drawerContent = fs.readFileSync(mobileDrawerFile, 'utf-8');
    expect(drawerContent).toContain('RadSuiteLogo');
  });

  it('verifies TablePagination has persistent sticky classes', () => {
    const tablePaginationFile = path.join(componentsDir, 'ui', 'table-pagination.tsx');
    const content = fs.readFileSync(tablePaginationFile, 'utf-8');

    expect(content).toContain('sticky bottom-0');
    expect(content).toContain('backdrop-blur-md');
  });

  it('verifies all major clinical tables enforce internal scrolling and stay under 350 lines', () => {
    const tableFiles = [
      path.join(componentsDir, 'worklist', 'worklist-reporting-view.tsx'),
      path.join(componentsDir, 'pacs', 'pacs-workstation-table.tsx'),
      path.join(componentsDir, 'pacs', 'pacs-unified-table.tsx'),
      path.join(componentsDir, 'my-cases', 'my-cases-table.tsx'),
      path.join(componentsDir, 'patients', 'patient-records-table.tsx'),
      path.join(componentsDir, 'admin', 'clinicians-table.tsx'),
      path.join(componentsDir, 'admin', 'alpha-waitlist-tab.tsx'),
      path.join(componentsDir, 'admin', 'invite-codes-tab.tsx'),
    ];

    for (const file of tableFiles) {
      expect(fs.existsSync(file), `Table file exists: ${file}`).toBe(true);
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').length;

      // Invariant: strict line limit (< 350)
      expect(lines, `${path.basename(file)} must be under 350 lines`).toBeLessThan(350);

      // Invariant: internal scroll with sticky header
      expect(content).toContain('sticky top-0');
    }
  });
});
