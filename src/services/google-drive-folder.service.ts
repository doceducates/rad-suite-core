// Layer 2 (Domain/Services): Google Drive Clinical Taxonomy & Folder Tree Management
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface TaxonomyFolderResult {
  rootFolderId: string;
  yearFolderId: string;
  monthFolderId: string;
  modalityFolderId: string;
}

/**
 * Searches for an active (non-trashed) folder with a specific name under a given parent folder.
 */
export async function findDriveFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string | null> {
  const parentQuery = parentId ? `'${parentId}' in parents` : `'root' in parents`;
  const safeName = folderName.replace(/'/g, "\\'");
  const q = `${parentQuery} and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const url = `${DRIVE_FILES_ENDPOINT}?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.warn('[GOOGLE_DRIVE_FIND_FOLDER_FAILED]', res.status, errorText);
    return null;
  }

  const data = await res.json();
  return data.files?.[0]?.id || null;
}

/**
 * Creates a new folder in Google Drive with the specified parent.
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  const body: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    body.parents = [parentId];
  }

  const res = await fetch(DRIVE_FILES_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[GOOGLE_DRIVE_CREATE_FOLDER_FAILED]', res.status, errorText);
    throw new Error(`Failed to create Google Drive folder "${folderName}": HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Idempotently finds or creates a subfolder under a parent.
 */
export async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  const existingId = await findDriveFolder(accessToken, folderName, parentId);
  if (existingId) return existingId;
  return createDriveFolder(accessToken, folderName, parentId);
}

/**
 * Resolves or creates the clinical report taxonomy folder path:
 * Root ("Rad Suite Reports") -> Year (e.g. "2026") -> Month (e.g. "10 - October") -> Modality (e.g. "CT")
 */
export async function ensureClinicalTaxonomyFolders(
  accessToken: string,
  params: {
    modality: string;
    studyDate?: string | Date;
    rootFolderName?: string;
  }
): Promise<TaxonomyFolderResult> {
  const rootName = params.rootFolderName || 'Rad Suite Reports';
  const date = params.studyDate ? new Date(params.studyDate) : new Date();
  const yearStr = String(isNaN(date.getFullYear()) ? new Date().getFullYear() : date.getFullYear());
  const monthNum = isNaN(date.getMonth()) ? new Date().getMonth() : date.getMonth();
  const monthStr = `${String(monthNum + 1).padStart(2, '0')} - ${MONTH_NAMES[monthNum]}`;
  const modalityStr = (params.modality || 'General').toUpperCase();

  // 1. Ensure Root Folder
  const rootFolderId = await findOrCreateFolder(accessToken, rootName);

  // 2. Ensure Year Folder
  const yearFolderId = await findOrCreateFolder(accessToken, yearStr, rootFolderId);

  // 3. Ensure Month Folder
  const monthFolderId = await findOrCreateFolder(accessToken, monthStr, yearFolderId);

  // 4. Ensure Modality Folder
  const modalityFolderId = await findOrCreateFolder(accessToken, modalityStr, monthFolderId);

  return {
    rootFolderId,
    yearFolderId,
    monthFolderId,
    modalityFolderId,
  };
}
