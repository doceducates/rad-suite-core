import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/worklist/sync-summary/route';
import * as authGuard from '@/lib/auth-guard';
import { db } from '@/db';

vi.mock('@/services/audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('Worklist Sync-Summary API Route (POST /api/worklist/sync-summary)', () => {
  const mockUser = {
    id: 'user-pgr-01',
    name: 'Dr. Radiologist',
    email: 'rad@hospital.org',
    role: 'radiologist' as const,
    title: 'Consultant Radiologist',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValueOnce({
      errorResponse: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) as any,
    });

    const req = new NextRequest('http://localhost:3000/api/worklist/sync-summary', {
      method: 'POST',
      body: JSON.stringify({ accessions: ['ACC-1001'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns empty cases when accessions array is empty or invalid', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValue({ user: mockUser });

    const req = new NextRequest('http://localhost:3000/api/worklist/sync-summary', {
      method: 'POST',
      body: JSON.stringify({ accessions: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.cases).toEqual([]);
  });

  it('fetches dynamic case status and existing diagnosis highlight from db', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValue({ user: mockUser });

    const mockDbRow = {
      studyId: 'study-1',
      accessionNumber: 'ACC-2001',
      studyStatus: 'in_progress',
      hmisStatus: 'draft_saved',
      priority: 'urgent',
      reportId: 'rep-1',
      reportStatus: 'reported',
      impression: '<p>1. Acute infarct in MCA territory.</p>',
      findings: 'Dense MCA sign seen.',
      diagnosisHighlight: 'Acute infarct in MCA territory',
    };

    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        leftJoin: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockDbRow]),
        }),
      }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/worklist/sync-summary', {
      method: 'POST',
      body: JSON.stringify({ accessions: ['ACC-2001'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.cases.length).toBe(1);
    expect(data.cases[0]).toEqual({
      accessionNumber: 'ACC-2001',
      status: 'reported',
      hmisStatus: 'draft_saved',
      priority: 'urgent',
      impression: '<p>1. Acute infarct in MCA territory.</p>',
      diagnosisHighlight: 'Acute infarct in MCA territory',
    });
  });

  it('dynamically synthesizes highlight from impression when database column is null', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValue({ user: mockUser });

    const mockDbRow = {
      studyId: 'study-2',
      accessionNumber: 'ACC-3001',
      studyStatus: 'completed',
      hmisStatus: 'draft_saved',
      priority: 'routine',
      reportId: 'rep-2',
      reportStatus: 'preliminary',
      impression: '<p>1. Subacute subdural hematoma along right convexity with midline shift.</p>',
      findings: 'Crescentic extra-axial collection.',
      diagnosisHighlight: null, // Highlight not yet cached in db
    };

    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        leftJoin: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockDbRow]),
        }),
      }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/worklist/sync-summary', {
      method: 'POST',
      body: JSON.stringify({ accessions: ['ACC-3001'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.cases[0].status).toBe('preliminary');
    // Primary clause extracted, subordinate clause 'with midline shift' trimmed
    expect(data.cases[0].diagnosisHighlight).toBe('Subacute subdural hematoma along right convexity');
  });

  it('provides default fallback for accessions missing from the database', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValue({ user: mockUser });

    // Empty DB query result
    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        leftJoin: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/worklist/sync-summary', {
      method: 'POST',
      body: JSON.stringify({ accessions: ['UNKNOWN-ACC'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.cases.length).toBe(1);
    expect(data.cases[0]).toEqual({
      accessionNumber: 'UNKNOWN-ACC',
      status: 'scheduled',
      hmisStatus: 'awaiting_report',
    });
  });

  it('returns pendingReason and pendingNotes when a report is pending', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValue({ user: mockUser });

    const mockPendingRow = {
      studyId: 'study-pending-1',
      accessionNumber: 'ACC-PENDING-01',
      studyStatus: 'pending',
      hmisStatus: 'draft_saved',
      priority: 'urgent',
      reportId: 'rep-pending-1',
      reportStatus: 'pending',
      impression: '<p>Awaiting creatinine lab.</p>',
      findings: 'Findings held.',
      diagnosisHighlight: 'Awaiting lab markers',
      pendingReason: 'awaiting_lab_creatinine',
      pendingNotes: 'Serum creatinine pending from lab',
      pendingAt: '2026-10-19T10:00:00Z',
      pendingBy: 'Dr. Radiologist',
    };

    vi.spyOn(db, 'select').mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        leftJoin: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockPendingRow]),
        }),
      }),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/worklist/sync-summary', {
      method: 'POST',
      body: JSON.stringify({ accessions: ['ACC-PENDING-01'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.cases[0].pendingReason).toBe('awaiting_lab_creatinine');
    expect(data.cases[0].pendingNotes).toBe('Serum creatinine pending from lab');
    expect(data.cases[0].status).toBe('pending');
  });
});
