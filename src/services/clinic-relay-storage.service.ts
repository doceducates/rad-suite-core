/**
 * Layer 2: Clinic Relay Storage & Effective Configuration Service
 *
 * Enables standalone desktop clients (Tauri) and local dev environments
 * without .env to persist custom Cloud Relay URL and secret tokens.
 *
 * Resolution Priority:
 * 1. Custom persistent config (config/clinic-relay.json or in-memory)
 * 2. Environment variables (process.env.CLINIC_RELAY_URL, config.clinicRelayUrl)
 * 3. None (unconfigured)
 */

import fs from 'fs';
import path from 'path';
import { config } from '@/lib/config';

export interface StoredRelayConfig {
  relayUrl: string;
  secret: string;
  updatedAt?: string;
}

export interface EffectiveRelayConfig {
  relayUrl: string;
  secret: string;
  source: 'custom' | 'env' | 'none';
  isConfigured: boolean;
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'clinic-relay.json');

let inMemoryCustomConfig: StoredRelayConfig | null = null;

export function getStoredRelayConfig(): StoredRelayConfig | null {
  if (inMemoryCustomConfig) {
    return inMemoryCustomConfig;
  }
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.relayUrl === 'string' && parsed.relayUrl.trim()) {
        inMemoryCustomConfig = {
          relayUrl: parsed.relayUrl.trim(),
          secret: typeof parsed.secret === 'string' ? parsed.secret.trim() : '',
          updatedAt: parsed.updatedAt,
        };
        return inMemoryCustomConfig;
      }
    }
  } catch {
    // Fall back to in-memory
  }
  return null;
}

export function saveStoredRelayConfig(data: { relayUrl: string; secret?: string }): StoredRelayConfig {
  const cleanUrl = (data.relayUrl || '').trim().replace(/\/+$/, '');
  const cleanSecret = (data.secret || '').trim();

  const stored: StoredRelayConfig = {
    relayUrl: cleanUrl,
    secret: cleanSecret,
    updatedAt: new Date().toISOString(),
  };

  inMemoryCustomConfig = stored;

  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(stored, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[CLINIC_RELAY_STORAGE] Could not write config/clinic-relay.json:', err);
  }

  return stored;
}

export function clearStoredRelayConfig(): void {
  inMemoryCustomConfig = null;
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
    }
  } catch (err) {
    console.warn('[CLINIC_RELAY_STORAGE] Could not remove config/clinic-relay.json:', err);
  }
}

export function getEffectiveRelayConfig(): EffectiveRelayConfig {
  const custom = getStoredRelayConfig();
  if (custom && custom.relayUrl) {
    return {
      relayUrl: custom.relayUrl,
      secret: custom.secret || config.clinicNodeSecret || '',
      source: 'custom',
      isConfigured: true,
    };
  }

  const envUrl = (config.clinicRelayUrl || '').trim().replace(/\/+$/, '');
  if (envUrl) {
    return {
      relayUrl: envUrl,
      secret: (config.clinicNodeSecret || '').trim(),
      source: 'env',
      isConfigured: true,
    };
  }

  return {
    relayUrl: '',
    secret: '',
    source: 'none',
    isConfigured: false,
  };
}
