/**
 * HMIS Published Reports Gateway HTTP Client (<60 lines).
 */
import { HmisPublishedReport, HmisAuthCredentials } from './hmis-models';
import { getGatewayBase, getGatewayHeaders, parseGatewayJson } from './hmis-gateway-transport';

export async function fetchHmisPublishedReports(
  params: {
    accession?: string;
    mrn?: string;
    contact?: string;
    cnic?: string;
  },
  credentials?: HmisAuthCredentials
): Promise<{
  success: boolean;
  data?: { count: number; records: HmisPublishedReport[] };
  error?: string;
}> {
  try {
    const q = new URLSearchParams();
    if (params.accession) q.set('accession', params.accession);
    if (params.mrn) q.set('mrn', params.mrn);
    if (params.contact) q.set('contact', params.contact);
    if (params.cnic) q.set('cnic', params.cnic);

    const res = await fetch(`${getGatewayBase()}/api/radiology/published?${q.toString()}`, {
      headers: getGatewayHeaders(credentials),
      signal: AbortSignal.timeout(25000),
    });
    return await parseGatewayJson<{ count: number; records: HmisPublishedReport[] }>(
      res,
      'Failed to fetch published reports'
    );
  } catch (err: any) {
    return { success: false, error: `HMIS Gateway unreachable (${err.message})` };
  }
}

export async function fetchHmisPublishedPdfStream(encodedId: string): Promise<Response> {
  return fetch(`${getGatewayBase()}/api/radiology/published/pdf/${encodeURIComponent(encodedId)}`, {
    headers: getGatewayHeaders(),
    signal: AbortSignal.timeout(30000),
  });
}
