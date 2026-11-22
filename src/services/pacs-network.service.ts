/**
 * PACS Network & TCP Probe Service
 *
 * Implements low-level DICOM port reachability checks and SSRF guardrails.
 */

import net from 'net';

export const ALLOWED_PACS_PORTS = new Set([104, 2762, 4242, 8040, 8042, 11112, 11115, 18042]);

export function isAllowedPacsHost(host: string): boolean {
  if (!host || typeof host !== 'string') return false;
  const h = host.trim().toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  if (h.startsWith('169.254.')) return false; // Block cloud metadata SSRF
  // Allow RFC 1918 private subnets and RFC 5737 test-net
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.0\.2\.\d{1,3}$/.test(h)) return true;
  return false;
}

export async function testPacsTcpConnection(
  host: string,
  port: number,
  timeoutMs: number = 3000
): Promise<{ reachable: boolean; latencyMs: number; error?: string }> {
  // SSRF Guardrails
  if (!isAllowedPacsHost(host)) {
    return { reachable: false, latencyMs: 0, error: 'Host address is not within authorized PACS subnets.' };
  }

  if (!ALLOWED_PACS_PORTS.has(port)) {
    return { reachable: false, latencyMs: 0, error: `Port ${port} is not an authorized PACS DICOM service port.` };
  }

  const safeTimeout = Math.min(3000, Math.max(50, timeoutMs));
  const start = Date.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(safeTimeout);

    socket.connect(port, host, () => {
      const latencyMs = Date.now() - start;
      socket.destroy();
      resolve({ reachable: true, latencyMs });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ reachable: false, latencyMs: Date.now() - start, error: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ reachable: false, latencyMs: Date.now() - start, error: 'Connection timed out' });
    });
  });
}
