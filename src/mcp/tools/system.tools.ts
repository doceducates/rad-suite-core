/**
 * MCP Tools: System Diagnostics & Workstation Telemetry
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { z } from 'zod';
import { db, IS_SQLITE } from '@/db';
import { studies, reports } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { config } from '@/lib/config';
import type { McpToolDefinition, McpRequestContext } from '../types';

export const systemHealthTool: McpToolDefinition = {
  name: 'radsuite_system_health',
  description: 'Check workstation/server health, database engine status, and study volume for current tenant.',
  category: 'system',
  requiredScope: 'system:read',
  isMutating: false,
  parameters: z.object({}),
  handler: async (_args, ctx: McpRequestContext) => {
    let dbStatus = 'ok';
    let studyCount = 0;
    let reportCount = 0;

    try {
      const [studyRes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(studies)
        .where(eq(studies.tenantId, ctx.tenantId));

      const [reportRes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(reports)
        .where(eq(reports.tenantId, ctx.tenantId));

      studyCount = Number(studyRes?.count || 0);
      reportCount = Number(reportRes?.count || 0);
    } catch (err: any) {
      dbStatus = `error: ${err?.message || 'DB query failed'}`;
    }

    return {
      status: 'operational',
      environment: process.env.NODE_ENV || 'development',
      database: {
        dialect: IS_SQLITE ? 'sqlite' : 'postgres',
        status: dbStatus,
      },
      tenant: {
        id: ctx.tenantId,
        code: ctx.tenantCode || 'DEFAULT',
      },
      telemetry: {
        totalTenantStudies: studyCount,
        totalTenantReports: reportCount,
        serverTime: new Date().toISOString(),
      },
      appUrl: config.appUrl,
    };
  },
};
