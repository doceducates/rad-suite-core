import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface MedASRResult {
  success: boolean;
  text?: string;
  raw?: string;
  device?: string;
  error?: string;
}

const PYTHON_BIN = process.platform === 'win32' ? 'python' : 'python3';
const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'transcribe_audio.py');

/**
 * Executes local MedASR inference via CUDA/CPU using the verified Python bridge.
 */
export async function transcribeWithMedASR(audioFilePath: string): Promise<MedASRResult> {
  if (!fs.existsSync(audioFilePath)) {
    return { success: false, error: `Audio file not found: ${audioFilePath}` };
  }

  return new Promise((resolve) => {
    execFile(
      PYTHON_BIN,
      [SCRIPT_PATH, audioFilePath],
      { timeout: 45000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          return resolve({ success: false, error: error.message || stderr });
        }

        try {
          // Find first JSON block in stdout
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return resolve(parsed);
          }
          return resolve({ success: false, error: 'Failed to parse MedASR JSON output' });
        } catch (err: any) {
          return resolve({ success: false, error: `JSON Parse error: ${err.message}` });
        }
      }
    );
  });
}

/**
 * Transcribes an audio base64 or buffer payload using MedASR.
 */
export async function transcribeAudioBufferWithMedASR(buffer: Buffer): Promise<MedASRResult> {
  const tmpFile = path.join(os.tmpdir(), `medasr_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`);
  try {
    fs.writeFileSync(tmpFile, buffer);
    const result = await transcribeWithMedASR(tmpFile);
    return result;
  } finally {
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch {
      // Ignore cleanup error
    }
  }
}
