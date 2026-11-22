// Layer 1 (Transport): Medical Vocabulary API Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import {
  getVocabulary,
  addVocabularyTerm,
  removeVocabularyTerm,
  autoDetectVocabularyFromText,
} from '@/services/clinical-vocabulary.service';

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const modality = searchParams.get('modality') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const data = getVocabulary({ modality, category, search });
    return NextResponse.json({ success: true, ...data });
  },
  { roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'] }
);

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Action: Auto-detect from text
      if (body.action === 'auto_detect') {
        const text = body.text || '';
        const modality = body.modality || 'ALL';
        const detected = autoDetectVocabularyFromText(text, modality);
        return NextResponse.json({ success: true, detected, count: detected.length });
      }

      // Action: Add single vocabulary term
      const { term, category, modality, phoneticHint } = body;
      if (!term || typeof term !== 'string' || !term.trim()) {
        return NextResponse.json({ success: false, error: 'Valid term is required' }, { status: 400 });
      }

      const item = addVocabularyTerm({
        term,
        category,
        modality,
        phoneticHint,
      });

      return NextResponse.json({ success: true, item });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed saving vocabulary term' }, { status: 500 });
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'],
    audit: { action: 'voice_vocabulary_update', entityType: 'Vocabulary' },
  }
);

export const DELETE = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Term ID is required' }, { status: 400 });
    }

    const removed = removeVocabularyTerm(id);
    if (!removed) {
      return NextResponse.json({ success: false, error: 'Term not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Term removed' });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'],
    audit: { action: 'voice_vocabulary_delete', entityType: 'Vocabulary' },
  }
);
