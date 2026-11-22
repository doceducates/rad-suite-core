import { hospitalPacsStudies } from '@/db/schema';
import { eq, or, and, sql, gte, lte, type SQL } from 'drizzle-orm';

export interface IndexedPacsQueryFilter {
  search?: string;
  searchField?: 'all' | 'accession' | 'mrn' | 'name' | 'description';
  modality?: string;
  region?: string;
  datePreset?: '48h' | 'today' | 'yesterday' | '7d' | '30d' | 'all' | 'custom';
  customFrom?: string; // YYYYMMDD or YYYY-MM-DD
  customTo?: string;
  s3Status?: string;
  location?: string;
  page?: number;
  limit?: number;
  allowedStorageSources?: string[];
  isAdmin?: boolean;
}

export function getLast48HoursDicomRange(): { startDicomDate: string; endDicomDate: string } {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const toDicom = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };

  return {
    startDicomDate: toDicom(yesterday),
    endDicomDate: toDicom(now),
  };
}

export function normalizeDicomDate(d?: string | null): string {
  if (!d) return '';
  return d.replace(/[^0-9]/g, '').slice(0, 8);
}

export function buildRegionConditions(region?: string): SQL | undefined {
  if (!region || region === 'all') return undefined;
  const reg = region.toLowerCase().trim();

  if (reg === 'brain' || reg === 'neuro') {
    return or(
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%brain%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%head%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%mrs%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%neuro%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%pituitary%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%stroke%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%cranium%'`
    );
  }

  if (reg === 'spine' || reg === 'ls_spine' || reg === 'cervical' || reg === 'thoracic' || reg === 'whole_spine') {
    if (reg === 'ls_spine') {
      return or(
        sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%ls%'`,
        sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%lss%'`,
        sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%lumbar%'`
      );
    }
    if (reg === 'cervical') {
      return or(
        sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%cs%'`,
        sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%cervical%'`
      );
    }
    if (reg === 'thoracic') {
      return or(
        sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%ds%'`,
        sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%dorsal%'`,
        sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%thoracic%'`
      );
    }
    return or(
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%spine%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%ls%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%lss%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%cs%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%ds%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%cervical%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%lumbar%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%dorsal%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%thoracic%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%vertebra%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%sacr%'`
    );
  }

  if (reg === 'msk') {
    return or(
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%knee%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%shoulder%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%hip%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%ankle%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%wrist%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%elbow%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%joint%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%bone%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%foot%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%extremity%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%femur%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%tibia%'`
    );
  }

  if (reg === 'abdomen' || reg === 'pelvis') {
    return or(
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%pelvi%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%mrcp%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%abdo%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%liver%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%kub%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%renal%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%kidney%'`
    );
  }

  if (reg === 'chest') {
    return or(
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%chest%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%thorax%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%lung%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%hrct%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%pulmonary%'`
    );
  }

  if (reg === 'neck') {
    return or(
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%neck%'`,
      sql`lower(${hospitalPacsStudies.studyDescription}) LIKE '%thyroid%'`
    );
  }

  return undefined;
}

export function buildLocationConditions(location?: string): SQL | undefined {
  if (!location || location === 'all') return undefined;

  if (location === 's3') {
    return or(
      eq(hospitalPacsStudies.s3Status, 'synced'),
      eq(hospitalPacsStudies.pacsSource, 'S3_CLOUD')
    );
  }

  if (location === 'clinic_pc') {
    return or(
      eq(hospitalPacsStudies.s3Status, 'in_sandbox'),
      eq(hospitalPacsStudies.s3Status, 'local_only'),
      eq(hospitalPacsStudies.s3Status, 'uploading'),
      eq(hospitalPacsStudies.s3Status, 'downloading'),
      eq(hospitalPacsStudies.pacsSource, 'CLINIC_ORTHANC'),
      eq(hospitalPacsStudies.pacsSource, 'ORTHANC_EDGE'),
      eq(hospitalPacsStudies.pacsSource, 'CLINIC_NODE'),
      eq(hospitalPacsStudies.pacsSource, 'clinic-pc-primary'),
      sql`lower(${hospitalPacsStudies.pacsSource}) LIKE '%clinic%'`
    );
  }

  if (location === 'hospital_pacs') {
    return or(
      eq(hospitalPacsStudies.pacsSource, 'HMIS_PACS'),
      eq(hospitalPacsStudies.pacsSource, 'HOSPITAL_HARVEST'),
      eq(hospitalPacsStudies.s3Status, 'not_uploaded'),
      sql`${hospitalPacsStudies.s3Status} IS NULL`,
      sql`${hospitalPacsStudies.pacsSource} IS NULL`
    );
  }

  return undefined;
}

export function buildStorageRbacConditions(
  allowedStorageSources?: string[],
  isAdmin = false,
  requestedLocation = 'all'
): SQL | undefined {
  if (isAdmin || allowedStorageSources === undefined) {
    return buildLocationConditions(requestedLocation);
  }

  // Parse allowed sources (default to ['local', 'gdrive'] if unspecified)
  let allowed: string[] = ['local', 'gdrive'];
  if (Array.isArray(allowedStorageSources)) {
    allowed = allowedStorageSources;
  } else if (typeof allowedStorageSources === 'string') {
    try {
      allowed = JSON.parse(allowedStorageSources);
    } catch {}
  }

  if (allowed.includes('*')) {
    return buildLocationConditions(requestedLocation);
  }

  const canS3 = allowed.includes('s3');
  const canClinic = allowed.includes('remote_node') || allowed.includes('clinic_pacs') || allowed.includes('clinic_node');
  const canPacs = allowed.includes('pacs') || allowed.includes('hospital_pacs');

  // If user requested a specific location filter:
  if (requestedLocation === 's3') {
    return canS3 ? buildLocationConditions('s3') : sql`1 = 0`;
  }
  if (requestedLocation === 'clinic_pc') {
    return canClinic ? buildLocationConditions('clinic_pc') : sql`1 = 0`;
  }
  if (requestedLocation === 'hospital_pacs') {
    return canPacs ? buildLocationConditions('hospital_pacs') : sql`1 = 0`;
  }

  // If requestedLocation is 'all' or empty:
  const allowedLocationClauses: SQL[] = [];
  if (canS3) {
    const cond = buildLocationConditions('s3');
    if (cond) allowedLocationClauses.push(cond);
  }
  if (canClinic) {
    const cond = buildLocationConditions('clinic_pc');
    if (cond) allowedLocationClauses.push(cond);
  }
  if (canPacs) {
    const cond = buildLocationConditions('hospital_pacs');
    if (cond) allowedLocationClauses.push(cond);
  }

  // If user has access to NONE of the remote storage sources:
  if (allowedLocationClauses.length === 0) {
    return sql`1 = 0`;
  }

  return allowedLocationClauses.length === 1 ? allowedLocationClauses[0] : or(...allowedLocationClauses);
}

export function buildTextSearchConditions(search?: string, searchField = 'all'): SQL | undefined {
  const q = (search || '').trim().toLowerCase();
  if (!q) return undefined;
  const term = `%${q}%`;

  if (searchField === 'accession') {
    return sql`lower(${hospitalPacsStudies.accessionNumber}) LIKE ${term}`;
  }
  if (searchField === 'mrn') {
    return or(
      sql`lower(${hospitalPacsStudies.patientMrn}) LIKE ${term}`,
      sql`lower(${hospitalPacsStudies.patientId}) LIKE ${term}`
    );
  }
  if (searchField === 'name') {
    return sql`lower(${hospitalPacsStudies.patientName}) LIKE ${term}`;
  }
  if (searchField === 'description') {
    return sql`lower(${hospitalPacsStudies.studyDescription}) LIKE ${term}`;
  }

  return or(
    sql`lower(${hospitalPacsStudies.accessionNumber}) LIKE ${term}`,
    sql`lower(${hospitalPacsStudies.patientMrn}) LIKE ${term}`,
    sql`lower(${hospitalPacsStudies.patientId}) LIKE ${term}`,
    sql`lower(${hospitalPacsStudies.patientName}) LIKE ${term}`,
    sql`lower(${hospitalPacsStudies.studyDescription}) LIKE ${term}`
  );
}

export function buildHospitalPacsQueryConditions(filters: IndexedPacsQueryFilter): SQL[] {
  const conditions: SQL[] = [];

  // Modality filter
  if (filters.modality && filters.modality !== 'all') {
    const mod = filters.modality.toUpperCase().trim();
    if (mod === 'MR' || mod === 'MRI') {
      const cond = and(
        or(eq(hospitalPacsStudies.modality, 'MR'), eq(hospitalPacsStudies.modality, 'MRI')),
        sql`NOT (lower(${hospitalPacsStudies.studyDescription}) LIKE 'ct %' OR lower(${hospitalPacsStudies.studyDescription}) = 'ct study')`
      );
      if (cond) conditions.push(cond);
    } else if (mod === 'CT') {
      const cond = or(
        eq(hospitalPacsStudies.modality, 'CT'),
        sql`lower(${hospitalPacsStudies.studyDescription}) LIKE 'ct %'`,
        sql`lower(${hospitalPacsStudies.studyDescription}) = 'ct study'`
      );
      if (cond) conditions.push(cond);
    } else if (mod === 'CR' || mod === 'DX' || mod === 'XR' || mod === 'X-RAY') {
      const cond = or(eq(hospitalPacsStudies.modality, 'CR'), eq(hospitalPacsStudies.modality, 'DX'), eq(hospitalPacsStudies.modality, 'XR'));
      if (cond) conditions.push(cond);
    } else {
      conditions.push(eq(hospitalPacsStudies.modality, mod));
    }
  }

  // S3 status filter
  if (filters.s3Status && filters.s3Status !== 'all') {
    conditions.push(eq(hospitalPacsStudies.s3Status, filters.s3Status.trim()));
  }

  // Location & Storage RBAC filter
  const locCond = buildStorageRbacConditions(filters.allowedStorageSources, filters.isAdmin, filters.location);
  if (locCond) conditions.push(locCond);

  // Region filter
  const regCond = buildRegionConditions(filters.region);
  if (regCond) conditions.push(regCond);

  // Text search
  const textCond = buildTextSearchConditions(filters.search, filters.searchField);
  if (textCond) conditions.push(textCond);

  // Date filters - always strictly enforce selected date window, even during active text search
  const datePreset = filters.datePreset;
  const now = new Date();
  const formatDicom = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  if (datePreset === '48h') {
    const range = getLast48HoursDicomRange();
    conditions.push(gte(hospitalPacsStudies.studyDate, range.startDicomDate));
  } else if (datePreset === 'today') {
    conditions.push(eq(hospitalPacsStudies.studyDate, formatDicom(now)));
  } else if (datePreset === 'yesterday') {
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    conditions.push(eq(hospitalPacsStudies.studyDate, formatDicom(yest)));
  } else if (datePreset === '7d') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    conditions.push(gte(hospitalPacsStudies.studyDate, formatDicom(weekAgo)));
  } else if (datePreset === '30d') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    conditions.push(gte(hospitalPacsStudies.studyDate, formatDicom(monthAgo)));
  } else if (datePreset === 'custom' && (filters.customFrom || filters.customTo)) {
    if (filters.customFrom) conditions.push(gte(hospitalPacsStudies.studyDate, normalizeDicomDate(filters.customFrom)));
    if (filters.customTo) conditions.push(lte(hospitalPacsStudies.studyDate, normalizeDicomDate(filters.customTo)));
  }

  return conditions;
}
