import { describe, it, expect, beforeEach } from 'vitest';
import {
  getVocabulary,
  addVocabularyTerm,
  removeVocabularyTerm,
  buildAcousticVocabularyPrompt,
  autoDetectVocabularyFromText,
} from '../clinical-vocabulary.service';
import {
  saveVoiceRecording,
  listVoiceRecordings,
  deleteVoiceRecording,
  cleanExpiredRecordings,
} from '../voice-vault.service';

describe('Clinical Vocabulary & Acoustic Prompt Biasing', () => {
  it('loads default vocabulary and filters by modality', () => {
    const vocab = getVocabulary({ modality: 'MRI' });
    expect(vocab.total).toBeGreaterThan(0);
    expect(vocab.terms.some((t) => t.term === 'ligamentum flavum')).toBe(true);
  });

  it('adds and removes a custom vocabulary term', () => {
    const added = addVocabularyTerm({
      term: 'TestSyringobulbia',
      category: 'spine',
      modality: 'MRI',
      phoneticHint: 'si-ring-o-bul-bee-a',
    });
    expect(added.term).toBe('TestSyringobulbia');

    const search = getVocabulary({ search: 'TestSyringobulbia' });
    expect(search.total).toBe(1);

    const removed = removeVocabularyTerm(added.id);
    expect(removed).toBe(true);
  });

  it('builds an acoustic condition prompt with high-yield medical hints', () => {
    const prompt = buildAcousticVocabularyPrompt('MRI', 'MRI Brain with Contrast');
    expect(prompt).toContain('Radiology medical dictation');
    expect(prompt).toContain('MRI');
    expect(prompt).toContain('Vocabulary hints:');
  });

  it('auto-detects potential anatomical candidates from text', () => {
    const text = 'There is severe neural foraminal stenosis with annular tear at L4-L5.';
    const detected = autoDetectVocabularyFromText(text, 'MRI');
    expect(Array.isArray(detected)).toBe(true);
  });
});

describe('Voice Vault & Retention Manager', () => {
  const dummyBuffer = Buffer.from('RIFF....WAVEfmt ');

  it('saves and lists voice recordings with patient metadata', () => {
    const record = saveVoiceRecording(dummyBuffer, {
      patientName: 'Ahmad Khan',
      patientMrn: '192600000001',
      accessionNumber: 'ACC-TEST-001',
      modality: 'MRI',
      source: 'reporting_canvas',
      authorName: 'Dr. Mudassir',
      authorRole: 'pgr',
      duration: 12,
      mimeType: 'audio/webm',
      rawTranscript: 'L4-L5 disc protrusion.',
    });

    expect(record.id).toBeTruthy();
    expect(record.patientName).toBe('Ahmad Khan');

    const list = listVoiceRecordings({ search: 'Ahmad Khan' });
    expect(list.recordings.length).toBeGreaterThan(0);

    const deleted = deleteVoiceRecording(record.id);
    expect(deleted).toBe(true);
  });

  it('purges recordings past their retention expiration', () => {
    // Save recording with 0 days retention (immediately expired)
    const record = saveVoiceRecording(dummyBuffer, {
      patientName: 'Expired Test Patient',
      patientMrn: '192600000099',
      modality: 'CT',
      source: 'comment',
      authorName: 'Dr. Test',
      authorRole: 'resident',
      duration: 5,
      mimeType: 'audio/webm',
      retentionDays: -1, // Expired yesterday
    });

    const cleanup = cleanExpiredRecordings();
    expect(cleanup.purgedCount).toBeGreaterThanOrEqual(1);
  });
});
