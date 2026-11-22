/**
 * HMIS Local Gateway Process Manager
 * Manages the local Express microservice background lifecycle on-demand.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { checkGatewayHealth } from './hmis-gateway-client.service';

interface ProcessState {
  pid: number | null;
  starting: boolean;
  startedAt: string | null;
  lastError: string | null;
}

const state: ProcessState = {
  pid: null,
  starting: false,
  startedAt: null,
  lastError: null,
};

let activeChild: ChildProcess | null = null;

function getGatewayDirectory(): string {
  if (process.env.HMIS_GATEWAY_DIR && fs.existsSync(path.join(process.env.HMIS_GATEWAY_DIR, 'src', 'server.js'))) {
    return process.env.HMIS_GATEWAY_DIR;
  }
  const localGateway = path.join(process.cwd(), 'hmis-gateway');
  if (fs.existsSync(path.join(localGateway, 'src', 'server.js'))) {
    return localGateway;
  }
  const pluginGateway = path.join(process.cwd(), 'plugins', 'hmis-gateway');
  if (fs.existsSync(path.join(pluginGateway, 'src', 'server.js'))) {
    return pluginGateway;
  }
  const siblingGateway = path.resolve(process.cwd(), '..', 'rad-suite', 'hmis-gateway');
  if (fs.existsSync(path.join(siblingGateway, 'src', 'server.js'))) {
    return siblingGateway;
  }
  return '';
}

export async function getGatewayStatus(): Promise<{
  online: boolean;
  starting: boolean;
  pid: number | null;
  startedAt: string | null;
  safetyMode?: string;
  activeSessions?: number;
  error?: string | null;
}> {
  const health = await checkGatewayHealth();
  if (health.online) {
    state.starting = false;
    return {
      online: true,
      starting: false,
      pid: state.pid,
      startedAt: state.startedAt,
      safetyMode: health.safetyMode,
      activeSessions: health.activeSessions,
      error: null,
    };
  }

  return {
    online: false,
    starting: state.starting,
    pid: state.pid,
    startedAt: state.startedAt,
    error: state.lastError,
  };
}

export async function startGatewayProcess(force = false): Promise<{
  success: boolean;
  message: string;
  pid?: number;
}> {
  // Check if already online unless forced
  if (!force) {
    const health = await checkGatewayHealth();
    if (health.online) {
      return { success: true, message: 'HMIS Gateway is already running and operational.' };
    }
  }

  if (state.starting) {
    return { success: true, message: 'HMIS Gateway launch in progress. Please wait.' };
  }

  state.starting = true;
  state.lastError = null;

  const gatewayDir = getGatewayDirectory();
  const serverScript = path.join(gatewayDir, 'src', 'server.js');

  if (!fs.existsSync(serverScript)) {
    state.starting = false;
    state.lastError = `Gateway entrypoint not found at ${serverScript}`;
    return { success: false, message: state.lastError };
  }

  try {
    const child = spawn(process.execPath, [serverScript], {
      cwd: gatewayDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        PORT: '3788',
        NODE_ENV: 'production',
        NODE_PATH: [
          path.join(gatewayDir, 'node_modules'),
          path.join(process.cwd(), 'hmis-gateway', 'node_modules'),
          path.join(process.cwd(), 'node_modules'),
        ].join(path.delimiter),
      },
    });

    child.unref();
    activeChild = child;
    state.pid = child.pid || null;
    state.startedAt = new Date().toISOString();

    // Poll up to 6 seconds for gateway startup
    for (let i = 0; i < 12; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const verified = await checkGatewayHealth();
      if (verified.online) {
        state.starting = false;
        return {
          success: true,
          message: 'HMIS Gateway started successfully on port 3788.',
          pid: child.pid,
        };
      }
    }

    state.starting = false;
    return {
      success: true,
      message: 'HMIS Gateway process launched; waiting for browser pool initialization.',
      pid: child.pid,
    };
  } catch (err: any) {
    state.starting = false;
    state.lastError = err.message;
    return { success: false, message: `Failed to spawn HMIS Gateway: ${err.message}` };
  }
}

function findPortPid(port: number): number | null {
  try {
    const { execSync } = require('child_process');
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[1]?.endsWith(`:${port}`) && parts[3] === 'LISTENING') {
        const pid = parseInt(parts[4], 10);
        if (!isNaN(pid) && pid > 0) return pid;
      }
    }
  } catch {}
  return null;
}

export async function stopGatewayProcess(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Graceful remote logout of all HMIS sessions before process termination
    try {
      const health = await checkGatewayHealth();
      if (health.online) {
        await fetch('http://127.0.0.1:3788/api/system/shutdown', {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
        // Wait up to 1.5 seconds for browser contexts to submit logout forms
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch {}

    // 2. Terminate background process if still lingering
    const targetPid = activeChild?.pid || state.pid || (process.platform === 'win32' ? findPortPid(3788) : null);
    if (targetPid) {
      if (process.platform === 'win32') {
        try {
          const { execSync } = require('child_process');
          execSync(`taskkill /F /PID ${targetPid} /T`, { stdio: 'ignore' });
        } catch {}
      } else {
        try {
          process.kill(targetPid);
        } catch {}
      }
    }

    activeChild = null;
    state.pid = null;
    state.starting = false;
    state.startedAt = null;
    return { success: true, message: 'HMIS Gateway sessions logged out and service stopped.' };
  } catch (err: any) {
    return { success: false, message: `Failed to stop gateway: ${err.message}` };
  }
}

export async function restartGatewayProcess(): Promise<{
  success: boolean;
  message: string;
  pid?: number;
}> {
  await stopGatewayProcess();
  await new Promise((r) => setTimeout(r, 1000));
  return await startGatewayProcess(true);
}

