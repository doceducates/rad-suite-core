import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Private-Network': 'true',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  try {
    if ('run' in db && typeof (db as any).run === 'function') {
      (db as any).run(sql`SELECT 1`);
    } else {
      await db.execute(sql`SELECT 1`);
    }
    return NextResponse.json(
      {
        status: 'healthy',
        system: 'Rad Suite Workstation',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: 'connected',
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Health check failed:`, err);
    return NextResponse.json(
      { status: 'unhealthy', database: 'error', requestId },
      { status: 500, headers: corsHeaders }
    );
  }
}
