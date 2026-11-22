import { describe, it, expect, vi } from 'vitest';
import { getGatewayHeaders, fetchHmisWorklist } from '../hmis-gateway-client.service';

describe('HMIS Gateway Client Authentication Headers', () => {
  it('should include Authorization Bearer and x-api-key when API_SECRET_KEY is defined', () => {
    const headers = getGatewayHeaders({
      username: 'Dr.Test',
      hospitalId: '19',
      password: 'secretPassword',
    });

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['x-hmis-username']).toBe('Dr.Test');
    expect(headers['x-hmis-hospital-id']).toBe('19');
    expect(headers['x-hmis-password']).toBe('secretPassword');

    if (process.env.API_SECRET_KEY) {
      expect(headers['Authorization']).toBe(`Bearer ${process.env.API_SECRET_KEY.trim()}`);
      expect(headers['x-api-key']).toBe(process.env.API_SECRET_KEY.trim());
    }
  });

  it('should pass Authorization header when calling fetchHmisWorklist', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any, opts: any) => {
      capturedHeaders = opts?.headers;
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await fetchHmisWorklist();
    expect(result.success).toBe(true);
    expect(capturedHeaders).toBeDefined();
    if (process.env.API_SECRET_KEY) {
      expect(capturedHeaders?.['Authorization']).toBe(`Bearer ${process.env.API_SECRET_KEY.trim()}`);
      expect(capturedHeaders?.['x-api-key']).toBe(process.env.API_SECRET_KEY.trim());
    }

    fetchSpy.mockRestore();
  });
});
