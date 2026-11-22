import { z } from 'zod';

export const HeartbeatSchema = z.object({
  nodeId: z.string().optional(),
  name: z.string().optional(),
  hostname: z.string().optional(),
  lanIp: z.string().optional(),
  token: z.string().optional(),
  status: z.enum(['running', 'stopped', 'starting', 'stopping', 'unknown']).optional(),
  scriptVersion: z.string().optional(),
  disk: z
    .object({
      totalGb: z.number().optional(),
      usedGb: z.number().optional(),
      freeGb: z.number().optional(),
      usedPercent: z.number().optional(),
      maxStorageSizeGb: z.number().optional(),
    })
    .passthrough()
    .optional(),
  casesToday: z.number().optional(),
  instancesToday: z.number().optional(),
  syncedStudies: z.array(z.any()).optional(),
  localStudies: z.array(z.any()).optional(),
  inventorySummary: z.any().optional(),
  heartbeatIntervalMs: z.number().optional(),
  autoRetention: z
    .object({
      enabled: z.boolean(),
      ageDays: z.number(),
    })
    .optional(),
  harvestSchedule: z.any().optional(),
  activeDownload: z
    .object({
      accession: z.string(),
      patientName: z.string(),
      modality: z.string(),
      studyDescription: z.string().optional(),
      downloadedSlices: z.number(),
      totalSlices: z.number(),
      progressPercent: z.number(),
      startedAt: z.string().optional(),
    })
    .nullable()
    .optional(),
  downloadQueue: z.array(z.any()).optional(),
  activeUpload: z
    .object({
      accession: z.string(),
      patientName: z.string(),
      modality: z.string(),
      seriesDescription: z.string().optional(),
      completedSlices: z.number(),
      totalSlices: z.number(),
      progressPercent: z.number(),
      speedKbs: z.number().optional(),
    })
    .nullable()
    .optional(),
  uploadQueue: z.array(z.any()).optional(),
  googleDrive: z
    .object({
      configured: z.boolean(),
      folderId: z.string().optional(),
      totalSynced: z.number().optional(),
      lastTestMessage: z.string().nullable().optional(),
      lastTestSuccess: z.boolean().nullable().optional(),
    })
    .optional(),
  pacsStatus: z
    .object({
      connected: z.boolean(),
      latencyMs: z.number().optional(),
      message: z.string().optional(),
      targetHost: z.string().optional(),
      targetPort: z.number().optional(),
      lastChecked: z.string().optional(),
    })
    .optional(),
  s3Status: z
    .object({
      connected: z.boolean(),
      endpoint: z.string().optional(),
      bucket: z.string().optional(),
      lastTestMessage: z.string().nullable().optional(),
      lastTestSuccess: z.boolean().nullable().optional(),
    })
    .optional(),
  syncRules: z
    .object({
      allowedModalities: z.array(z.string()).optional(),
      descriptionKeywords: z.array(z.string()).optional(),
      bypassKeywords: z.boolean().optional(),
      syncMode: z.string().optional(),
    })
    .passthrough()
    .optional(),
  lastCommandOutput: z
    .object({
      command: z.string(),
      stdout: z.string(),
      stderr: z.string(),
      exitCode: z.union([z.number(), z.string()]).optional(),
      timestamp: z.string(),
    })
    .nullable()
    .optional(),
  syncPaused: z.boolean().optional(),
  schedule: z
    .object({
      enabled: z.boolean(),
      startHour: z.number(),
      endHour: z.number(),
      allowWeekends: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  diagnostics: z
    .object({
      timestamp: z.string(),
      orthancHttp: z.object({
        status: z.enum(['pass', 'fail']),
        latencyMs: z.number().optional(),
        version: z.string().optional(),
        error: z.string().optional(),
      }),
      orthancDicom: z.object({
        status: z.enum(['pass', 'fail']),
        port: z.number().optional(),
        error: z.string().optional(),
      }),
      s3Write: z.object({
        status: z.enum(['pass', 'fail']),
        latencyMs: z.number().optional(),
        bucket: z.string().optional(),
        error: z.string().optional(),
      }),
      hospitalPacs: z.object({
        status: z.enum(['pass', 'fail', 'skipped']),
        host: z.string().optional(),
        port: z.number().optional(),
        latencyMs: z.number().optional(),
        error: z.string().optional(),
      }),
      disk: z.object({
        status: z.enum(['pass', 'warn', 'fail']),
        freeGb: z.number(),
        usedPercent: z.number(),
      }),
    })
    .nullable()
    .optional(),
  compression: z
    .object({
      enabled: z.boolean(),
      method: z.string(),
    })
    .optional(),
  stallWatchdog: z
    .object({
      enabled: z.boolean(),
      softRestartMinutes: z.number(),
      autoRebootMinutes: z.number(),
      maxRebootsPerDay: z.number().optional(),
      requireNetworkProbe: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  peerCooperation: z
    .object({
      enabled: z.boolean(),
      leaseTtlMinutes: z.number().optional(),
    })
    .nullable()
    .optional(),
  knownNetworks: z
    .array(
      z.object({
        ssid: z.string(),
        password: z.string().optional(),
      })
    )
    .optional(),
});

export type HeartbeatInput = z.infer<typeof HeartbeatSchema>;
