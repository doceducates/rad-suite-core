import fs from 'fs';
import path from 'path';

export interface ReleaseInfo {
  version: string;
  releaseDate: string;
  pubDateIso?: string;
  publishedAtFormatted: string;
  installerUrl: string;
  installerFileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  sha256: string;
  releaseNotes: string[];
  isMandatory: boolean;
  minVersion?: string;
  platforms?: {
    'windows-x86_64': {
      url: string;
      signature?: string;
    };
  };
}

export interface TauriUpdaterManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    [platform: string]: {
      url: string;
      signature: string;
    };
  };
}

const DEFAULT_RELEASE: ReleaseInfo = {
  version: '1.0.0',
  releaseDate: '2026-10-24',
  pubDateIso: '2026-10-24T07:42:10Z',
  publishedAtFormatted: 'Oct 24, 2026',
  installerUrl: '/api/download/desktop',
  installerFileName: 'Rad Suite_1.0.0_x64-setup.exe',
  fileSizeBytes: 741210475,
  fileSizeFormatted: '706.87 MB',
  sha256: '621c031dec449cb2a8bfa1365279819a6b0c70cab9c9a491b03cebb485dbf631',
  releaseNotes: [
    'Rad Suite Diagnostic Radiology Workstation v1.0.0 Alpha release',
    'Bundled zero-dependency offline runtime: embedded portable Node.js and local SQLite engine',
    'Hospital PACS Gigabit LAN direct harvester & C-FIND/C-GET DICOM retrieval',
    'Rule 5 Punjab HMIS Invariant: Strict Zero-Submit draft locking with local durable vault',
    'Personal Google Drive DICOM case storage integration and study viewer',
    'Streamlined Unified RBAC permission system with early access review queue',
  ],
  isMandatory: false,
  minVersion: '1.0.0',
  platforms: {
    'windows-x86_64': {
      url: '/api/download/desktop',
      signature: '',
    },
  },
};

export const releaseService = {
  /**
   * Resolves the latest release metadata
   */
  getLatestRelease(): ReleaseInfo {
    try {
      const manifestPath = path.join(process.cwd(), 'public', 'releases', 'latest.json');
      if (fs.existsSync(manifestPath)) {
        const raw = fs.readFileSync(manifestPath, 'utf8');
        const parsed = JSON.parse(raw);

        // Format publication date into user-friendly string
        const pubDateRaw = parsed.pub_date || DEFAULT_RELEASE.pubDateIso;
        let publishedFormatted = DEFAULT_RELEASE.publishedAtFormatted;
        try {
          const d = new Date(pubDateRaw);
          if (!isNaN(d.getTime())) {
            publishedFormatted = d.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          }
        } catch {}

        // Parse and clean release notes
        let rawNotes: string[] = [];
        if (Array.isArray(parsed.notes)) {
          rawNotes = parsed.notes;
        } else if (typeof parsed.notes === 'string') {
          rawNotes = parsed.notes
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0);
        } else {
          rawNotes = DEFAULT_RELEASE.releaseNotes;
        }

        // Check if an actual installer file physically exists to verify real file size if needed
        let fileSizeFormatted = parsed.fileSizeFormatted || DEFAULT_RELEASE.fileSizeFormatted;
        let fileSizeBytes = parsed.fileSizeBytes || DEFAULT_RELEASE.fileSizeBytes;
        const installerFileName = parsed.installerFileName || `Rad Suite_${parsed.version || '1.0.0'}_x64-setup.exe`;
        const localExePath = path.join(process.cwd(), 'public', 'releases', installerFileName);
        if (fs.existsSync(localExePath)) {
          try {
            const stat = fs.statSync(localExePath);
            fileSizeBytes = stat.size;
            fileSizeFormatted = `${(stat.size / (1024 * 1024)).toFixed(2)} MB`;
          } catch {}
        }

        return {
          version: parsed.version || DEFAULT_RELEASE.version,
          releaseDate: parsed.pub_date ? parsed.pub_date.split('T')[0] : DEFAULT_RELEASE.releaseDate,
          pubDateIso: pubDateRaw,
          publishedAtFormatted: publishedFormatted,
          installerUrl: parsed.downloadUrl || DEFAULT_RELEASE.installerUrl,
          installerFileName,
          fileSizeBytes,
          fileSizeFormatted,
          sha256: parsed.sha256 || DEFAULT_RELEASE.sha256,
          releaseNotes: rawNotes,
          isMandatory: !!parsed.isMandatory,
          minVersion: parsed.minVersion || DEFAULT_RELEASE.minVersion,
          platforms: parsed.platforms || DEFAULT_RELEASE.platforms,
        };
      }
    } catch (err) {
      console.warn('[ReleaseService] Failed to read latest.json from public/releases:', err);
    }
    return DEFAULT_RELEASE;
  },

  /**
   * Returns Tauri v2 auto-updater compliant payload
   */
  getTauriUpdaterPayload(baseUrl: string = ''): TauriUpdaterManifest {
    const rel = this.getLatestRelease();
    const downloadUrl = rel.platforms?.['windows-x86_64']?.url?.startsWith('http')
      ? rel.platforms['windows-x86_64'].url
      : `${baseUrl}/api/download/desktop`;

    return {
      version: rel.version,
      notes: rel.releaseNotes.join('\n'),
      pub_date: new Date(rel.releaseDate).toISOString(),
      platforms: {
        'windows-x86_64': {
          url: downloadUrl,
          signature: rel.platforms?.['windows-x86_64']?.signature || '',
        },
      },
    };
  },

  /**
   * Compares two semver strings (vA > vB returns 1, vA < vB returns -1, equal returns 0)
   */
  compareVersions(vA: string, vB: string): number {
    const cleanA = vA.replace(/^v/i, '').trim();
    const cleanB = vB.replace(/^v/i, '').trim();

    const partsA = cleanA.split('.').map((p) => parseInt(p, 10) || 0);
    const partsB = cleanB.split('.').map((p) => parseInt(p, 10) || 0);

    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
      const a = partsA[i] || 0;
      const b = partsB[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  },

  /**
   * Checks if an update is available given a client version
   */
  isUpdateAvailable(clientVersion: string): { available: boolean; latest: ReleaseInfo } {
    const latest = this.getLatestRelease();
    const isNewer = this.compareVersions(latest.version, clientVersion) > 0;
    return {
      available: isNewer,
      latest,
    };
  },
};
