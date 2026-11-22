import { NextResponse } from 'next/server';
import {
  listDiscoveredLocalModels,
  checkLocalServerStatus,
  startLocalModel,
  stopLocalModel,
} from '@/services/local-model-runner.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async () => {
    const models = await listDiscoveredLocalModels();
    const status = await checkLocalServerStatus();
    return NextResponse.json({ success: true, models, status });
  },
  { roles: ['admin', 'radiologist', 'consultant', 'resident', 'pgr', 'service'] }
);

export const POST = withAuth(
  async (req) => {
    try {
      const body = await req.json();
      const { action, modelPath, model } = body;
      const targetModel = model || modelPath;

      if (action === 'start') {
        const result = await startLocalModel(targetModel);
        return NextResponse.json(result);
      }

      if (action === 'stop') {
        const result = await stopLocalModel(targetModel);
        return NextResponse.json(result);
      }

      return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
      console.error('[LOCAL_MODEL_ROUTE_ERROR]', err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    roles: ['admin', 'radiologist', 'consultant', 'resident', 'pgr', 'service'],
  }
);
