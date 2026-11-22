'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VoiceLabHeader, VoiceLabTab } from '@/components/voice-lab/voice-lab-header';
import { VoiceLabMicSandbox } from '@/components/voice-lab/voice-lab-mic-sandbox';
import { VoiceLabRecordingsVault } from '@/components/voice-lab/voice-lab-recordings-vault';
import { VoiceLabVocabularyManager } from '@/components/voice-lab/voice-lab-vocabulary-manager';
import type { VoiceRecordingMeta } from '@/services/voice-vault.service';
import type { VocabularyTerm } from '@/services/clinical-vocabulary.service';
import { notify } from '@/services/notification.service';

export default function VoiceLabPage() {
  const [activeTab, setActiveTab] = useState<VoiceLabTab>('sandbox');
  const [voiceStudioStatus, setVoiceStudioStatus] = useState<{
    isRunning: boolean;
    device?: string;
    version?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Vault state
  const [recordings, setRecordings] = useState<VoiceRecordingMeta[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [isCleaning, setIsCleaning] = useState(false);

  // Vocabulary state
  const [terms, setTerms] = useState<VocabularyTerm[]>([]);
  const [isProcessingVocab, setIsProcessingVocab] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/ai/voicestudio');
      const data = await res.json();
      if (data.success && data.isRunning) {
        setVoiceStudioStatus({
          isRunning: true,
          device: data.device,
          version: data.version,
        });
      } else {
        setVoiceStudioStatus({ isRunning: false });
      }
    } catch {
      setVoiceStudioStatus({ isRunning: false });
    } finally {
      setIsTesting(false);
    }
  }, []);

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch('/api/voice/recordings');
      const data = await res.json();
      if (data.success && Array.isArray(data.recordings)) {
        setRecordings(data.recordings);
        setTotalBytes(data.totalBytes || 0);
      }
    } catch (err) {
      console.warn('Failed loading recordings:', err);
    }
  }, []);

  const fetchVocabulary = useCallback(async () => {
    try {
      const res = await fetch('/api/voice/vocabulary');
      const data = await res.json();
      if (data.success && Array.isArray(data.terms)) {
        setTerms(data.terms);
      }
    } catch (err) {
      console.warn('Failed loading vocabulary:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchRecordings();
    fetchVocabulary();
  }, [fetchStatus, fetchRecordings, fetchVocabulary]);

  const handleDeleteRecording = async (id: string) => {
    try {
      const res = await fetch(`/api/voice/recordings?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        notify.success('Recording deleted from vault');
        fetchRecordings();
      } else {
        notify.error(data.error || 'Failed to delete');
      }
    } catch (err: any) {
      notify.error(err.message || 'Network error');
    }
  };

  const handleCleanExpired = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch('/api/voice/recordings/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: 5 }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(data.message || 'Expired audio files purged');
        fetchRecordings();
      } else {
        notify.error(data.error || 'Cleanup failed');
      }
    } catch (err: any) {
      notify.error(err.message || 'Cleanup error');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleAddTerm = async (term: { term: string; category: any; modality: any; phoneticHint?: string }) => {
    try {
      const res = await fetch('/api/voice/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(term),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Learned term: "${term.term}"`);
        fetchVocabulary();
      } else {
        notify.error(data.error || 'Failed adding term');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error saving term');
    }
  };

  const handleDeleteTerm = async (id: string) => {
    try {
      const res = await fetch(`/api/voice/vocabulary?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        notify.success('Vocabulary term removed');
        fetchVocabulary();
      } else {
        notify.error(data.error || 'Failed removing term');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error deleting term');
    }
  };

  const handleAutoDetect = async (text: string) => {
    setIsProcessingVocab(true);
    try {
      const res = await fetch('/api/voice/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_detect', text }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Extracted & registered ${data.count} medical terms`);
        fetchVocabulary();
      }
    } catch (err: any) {
      notify.error(err.message || 'Extraction error');
    } finally {
      setIsProcessingVocab(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 sm:p-4">
      <VoiceLabHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        voiceStudioStatus={voiceStudioStatus}
        onRefreshStatus={fetchStatus}
        isTesting={isTesting}
        recordingsCount={recordings.length}
        vocabCount={terms.length}
      />

      {activeTab === 'sandbox' && (
        <VoiceLabMicSandbox
          onLearnTerm={(term) => handleAddTerm({ term, category: 'general', modality: 'ALL' })}
        />
      )}

      {activeTab === 'vault' && (
        <VoiceLabRecordingsVault
          recordings={recordings}
          totalBytes={totalBytes}
          onRefresh={fetchRecordings}
          onDelete={handleDeleteRecording}
          onCleanExpired={handleCleanExpired}
          isCleaning={isCleaning}
        />
      )}

      {activeTab === 'vocabulary' && (
        <VoiceLabVocabularyManager
          terms={terms}
          onAddTerm={handleAddTerm}
          onDeleteTerm={handleDeleteTerm}
          onAutoDetect={handleAutoDetect}
          isProcessing={isProcessingVocab}
        />
      )}
    </div>
  );
}
