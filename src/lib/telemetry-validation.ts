import { z } from 'zod';

export const WorkstationHeartbeatSchema = z.object({
  machineId: z.string().min(1, 'Machine ID is required').max(128),
  hostname: z.string().max(256).optional(),
  platform: z.enum(['windows', 'macos', 'linux', 'web']).default('windows'),
  osVersion: z.string().max(256).optional(),
  appVersion: z.string().max(64).default('1.0.0'),
  specs: z
    .object({
      cpuCores: z.number().optional(),
      osName: z.string().optional(),
      arch: z.string().optional(),
      gpuAccelerated: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
});

export type WorkstationHeartbeatDTO = z.infer<typeof WorkstationHeartbeatSchema>;
