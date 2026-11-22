import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { rbacService } from '@/services/rbac.service';
import { withAuth } from '@/lib/api-handler';

const ALLOWED_MODELS = new Set([
  'skeletal',
  'muscular',
  'circulatory',
  'nervous',
  'respiratory',
  'digestive',
  'urinary',
  'reproductive',
  'endocrine',
  'lymphatic',
  'integumentary',
  'skull',
  'visceral',
]);

const MODEL_SEARCH_PATHS = [
  path.join(process.cwd(), 'plugins/anatomy-atlas/models'),
  path.resolve(process.cwd(), '../rad-suite-core/plugins/anatomy-atlas/models'),
  path.resolve(__dirname, '../../../../../../plugins/anatomy-atlas/models'),
];

function resolveModelPath(name: string): string | null {
  for (const dir of MODEL_SEARCH_PATHS) {
    const candidate = path.join(dir, `${name}.glb`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export const GET = withAuth<{ name: string }>(
  async (_req: NextRequest, { user, params }) => {
    if (!rbacService.canAccessScreen(user, 'atlas')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Atlas access required' },
        { status: 403 }
      );
    }

    const rawName = params?.name?.replace(/\.glb$/, '');
    const safeName = rawName?.replace(/[^a-zA-Z0-9_-]/g, '') || '';

    if (!safeName || !ALLOWED_MODELS.has(safeName)) {
      return NextResponse.json(
        { success: false, error: `Invalid or unsupported model: ${safeName}` },
        { status: 400 }
      );
    }

    const filePath = resolveModelPath(safeName);
    if (!filePath) {
      return NextResponse.json(
        { success: false, error: `Model "${safeName}" not found in plugin repository` },
        { status: 404 }
      );
    }

    const stat = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'private, no-transform, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
);
