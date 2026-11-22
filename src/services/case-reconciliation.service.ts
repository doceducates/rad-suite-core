// Layer 2 (Domain/Services): Multi-System Case Reconciliation & Discrepancy Matrix
import { getLocalCaseById } from './local-cases.service';
import { db } from '@/db';
import { studies, hmisDraftVault } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { SystemPresenceMap, PacsStudyResult } from '@/types/pacs';

export type DiscrepancyType = 'MISSING_IN_HMIS' | 'MISSING_ON_PACS' | 'VITREA_PACS_GAP' | 'NONE';

export interface DiscrepancyAnalysis {
  hasDiscrepancy: boolean;
  type: DiscrepancyType;
  message: string;
  presence: SystemPresenceMap;
}

/**
 * Reconciles study presence across PACS, Vitrea, Local Disk, Cloud, and HMIS.
 */
export async function reconcileCasePresence(
  accessionNumber: string,
  context?: {
    pacsAvailable?: boolean;
    vitreaAvailable?: boolean;
    cloudAvailable?: boolean;
  }
): Promise<SystemPresenceMap> {
  const cleanAcc = accessionNumber.trim();

  // 1. Check Local Archive (E:\Cases)
  const localStudy = getLocalCaseById(cleanAcc);
  const localPresent = Boolean(localStudy);

  // 2. Check Database Record
  const dbRows = await db
    .select()
    .from(studies)
    .where(eq(sql`lower(${studies.accessionNumber})`, cleanAcc.toLowerCase()))
    .limit(1);

  const dbStudy = dbRows[0];

  // 3. Check Local HMIS Vault / HMIS Tracking
  const vaultRows = await db
    .select()
    .from(hmisDraftVault)
    .where(eq(sql`lower(${hmisDraftVault.accession})`, cleanAcc.toLowerCase()))
    .limit(1);

  const hmisPresent = Boolean(
    vaultRows.length > 0 ||
    (dbStudy?.hmisStatus && dbStudy.hmisStatus !== 'unknown' && dbStudy.hmisStatus !== 'not_found')
  );

  // 4. Presence matrix (defaulting to true if known in PACS/Vitrea or inferred)
  const pacs = context?.pacsAvailable ?? (localPresent || Boolean(dbStudy));
  const vitrea = context?.vitreaAvailable ?? (localPresent || Boolean(dbStudy));
  const cloud = context?.cloudAvailable ?? false;

  return {
    pacs,
    vitrea,
    local: localPresent,
    cloud,
    hmis: hmisPresent,
    discrepancyNote: !hmisPresent && pacs ? 'Present on PACS/Local but not found in HMIS' : undefined,
  };
}

/**
 * Analyzes discrepancy type and generates clinical warning.
 */
export function analyzeDiscrepancy(presence: SystemPresenceMap): DiscrepancyAnalysis {
  if (presence.pacs && !presence.hmis) {
    return {
      hasDiscrepancy: true,
      type: 'MISSING_IN_HMIS',
      message: 'Study available on PACS/Workstation but missing on Punjab HMIS portal.',
      presence,
    };
  }

  if (presence.hmis && !presence.pacs && !presence.local) {
    return {
      hasDiscrepancy: true,
      type: 'MISSING_ON_PACS',
      message: 'Investigation scheduled in HMIS but DICOM imaging has not reached PACS.',
      presence,
    };
  }

  if (presence.pacs !== presence.vitrea) {
    return {
      hasDiscrepancy: true,
      type: 'VITREA_PACS_GAP',
      message: presence.pacs
        ? 'Present on PACS archive but missing on Vitrea 3D workstation.'
        : 'Present on Vitrea workstation but missing on central PACS archive.',
      presence,
    };
  }

  return {
    hasDiscrepancy: false,
    type: 'NONE',
    message: 'Synchronized across clinical systems.',
    presence,
  };
}

/**
 * Annotates a worklist study array with presence matrices and discrepancy notes.
 */
export async function annotateWorklistPresence(
  cases: PacsStudyResult[]
): Promise<PacsStudyResult[]> {
  const annotated: PacsStudyResult[] = [];

  for (const c of cases) {
    const presence = await reconcileCasePresence(c.accessionNumber, {
      pacsAvailable: c.source === 'hospital_pacs' || c.pacsServerAe !== 'NONE',
      vitreaAvailable: true,
      cloudAvailable: c.source === 'gdrive' || c.source === 's3',
    });

    const analysis = analyzeDiscrepancy(presence);
    annotated.push({
      ...c,
      presence: {
        ...presence,
        discrepancyNote: analysis.hasDiscrepancy ? analysis.message : undefined,
      },
    });
  }

  return annotated;
}
