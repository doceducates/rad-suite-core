// Layer 1 (Transport): VoiceStudio Local CUDA Transcription & Structuring Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import {
  checkVoiceStudioHealth,
  transcribeAudioWithVoiceStudio,
} from '@/services/voicestudio-stt.service';
import { processVoiceDictation } from '@/services/ai-dictation-pipeline.service';
import { autoDetectVocabularyFromText } from '@/services/clinical-vocabulary.service';
import { saveVoiceRecording } from '@/services/voice-vault.service';

export const GET = withAuth(
  async () => {
    const health = await checkVoiceStudioHealth();
    return NextResponse.json({ success: true, ...health });
  },
  { roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'] }
);

export const POST = withAuth(
  async (req: NextRequest, context) => {
    const contentType = req.headers.get('content-type') || '';
    let audioBuffer: Buffer | null = null;
    let audioUrl: string | undefined = undefined;
    let mimeType = 'audio/webm';
    let modality = 'CT';
    let studyDescription = '';
    let clinicalHistory = '';
    let patientAge = '';
    let patientGender = '';
    let patientName = '';
    let patientMrn = '';
    let accessionNumber = '';
    let studyId = '';
    let radiologistName = '';
    let source: 'reporting_canvas' | 'comment' | 'voice_lab' = 'reporting_canvas';
    let autoStructure = true;
    let saveToVault = true;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('audio') as File | null;
      if (file) {
        audioBuffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type || 'audio/webm';
      }
      audioUrl = (formData.get('audioUrl') as string) || undefined;
      modality = (formData.get('modality') as string) || 'CT';
      studyDescription = (formData.get('studyDescription') as string) || '';
      clinicalHistory = (formData.get('clinicalHistory') as string) || '';
      patientAge = (formData.get('patientAge') as string) || '';
      patientGender = (formData.get('patientGender') as string) || '';
      patientName = (formData.get('patientName') as string) || '';
      patientMrn = (formData.get('patientMrn') as string) || '';
      accessionNumber = (formData.get('accessionNumber') as string) || '';
      studyId = (formData.get('studyId') as string) || '';
      radiologistName = (formData.get('radiologistName') as string) || '';
      source = ((formData.get('source') as any) || 'reporting_canvas');
      const autoStrVal = formData.get('autoStructure');
      if (autoStrVal !== null) autoStructure = autoStrVal === 'true';
      const saveVal = formData.get('saveToVault');
      if (saveVal !== null) saveToVault = saveVal === 'true';
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      if (body.audioBase64) {
        const cleanBase64 = body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
        audioBuffer = Buffer.from(cleanBase64, 'base64');
      }
      audioUrl = body.audioUrl;
      mimeType = body.mimeType || 'audio/webm';
      modality = body.modality || 'CT';
      studyDescription = body.studyDescription || '';
      clinicalHistory = body.clinicalHistory || '';
      patientAge = body.patientAge || '';
      patientGender = body.patientGender || '';
      patientName = body.patientName || '';
      patientMrn = body.patientMrn || '';
      accessionNumber = body.accessionNumber || '';
      studyId = body.studyId || '';
      radiologistName = body.radiologistName || '';
      source = body.source || 'reporting_canvas';
      if (body.autoStructure !== undefined) autoStructure = Boolean(body.autoStructure);
      if (body.saveToVault !== undefined) saveToVault = Boolean(body.saveToVault);
    } else {
      const arrayBuffer = await req.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        audioBuffer = Buffer.from(arrayBuffer);
      }
    }

    if ((!audioBuffer || audioBuffer.length === 0) && !audioUrl) {
      return NextResponse.json({ success: false, error: 'Audio data or audioUrl is required' }, { status: 400 });
    }

    // 1. Dispatch to VoiceStudio CUDA ASR
    const asrResult = await transcribeAudioWithVoiceStudio({
      audioBuffer: audioBuffer || undefined,
      audioUrl,
      mimeType,
      modality,
      studyDescription,
      clinicalHistory,
    });

    if (!asrResult.success || !asrResult.text) {
      return NextResponse.json(
        { success: false, error: asrResult.error || 'Speech transcription failed' },
        { status: 502 }
      );
    }

    // 2. Auto-detect & learn new clinical vocabulary from transcript
    const learnedTerms = autoDetectVocabularyFromText(asrResult.text, modality);

    // 3. Clinical AI Hub Structuring (if requested)
    let structuredResult = null;
    if (autoStructure) {
      try {
        const clinician =
          radiologistName ||
          (context.user.name ? `${context.user.name} (Radiologist)` : 'Reporting Radiologist');

        structuredResult = await processVoiceDictation({
          rawTranscript: asrResult.text,
          modality,
          studyDescription,
          clinicalHistory,
          patientAge,
          patientGender,
          patientName,
          radiologistName: clinician,
        });
      } catch (err: any) {
        console.warn('[VoiceStudio API] MedGemma structuring failed, returning raw transcript:', err.message);
      }
    }

    // 4. Save to Voice Recordings Vault (for 5-day organized retention)
    let vaultRecord = null;
    if (saveToVault && audioBuffer && audioBuffer.length > 0) {
      try {
        vaultRecord = saveVoiceRecording(audioBuffer, {
          patientName: patientName || 'Dictation Case',
          patientMrn,
          accessionNumber,
          studyId,
          studyDescription,
          modality,
          source,
          authorName: radiologistName || context.user.name || 'Radiologist',
          authorRole: (context.user as any)?.role || 'resident',
          duration: asrResult.duration || 0,
          mimeType,
          rawTranscript: asrResult.text,
          hasStructuredReport: Boolean(structuredResult),
          retentionDays: 5,
        });
      } catch (err: any) {
        console.warn('[VoiceStudio API] Failed indexing to Voice Vault:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      rawTranscript: asrResult.text,
      transcript: asrResult.text,
      structured: structuredResult,
      device: asrResult.device || 'cuda',
      duration: asrResult.duration,
      learnedTerms,
      recording: vaultRecord,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'],
    audit: {
      action: 'voicestudio_audio_dictation',
      entityType: 'VoiceDictation',
    },
  }
);
