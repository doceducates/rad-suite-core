import type { PacsStudyResult } from '@/types/pacs';

/**
 * Hospital PACS Archive Data Source.
 * In production/workstation mode, this is empty so only real local studies (E:\Cases)
 * and connected PACS servers are queried.
 */
export const MOCK_LGH_ARCHIVE: PacsStudyResult[] = [];
