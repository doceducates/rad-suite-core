// Layer 1: Sync Health & Latency Probe Endpoint
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Rad Suite Case Sync Gateway',
    serverTime: new Date().toISOString(),
  });
}
