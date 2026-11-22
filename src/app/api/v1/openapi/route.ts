import { NextResponse } from 'next/server';

export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Rad Suite RIS & PACS Management REST API',
      version: '1.0.0',
      description: 'Hospital-Grade Radiology Information System, PACS Integration, and AI Clinical Reporting API.',
    },
    servers: [{ url: '/api', description: 'Current Workstation API Base' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        BearerAuth: { type: 'http', scheme: 'bearer' },
      },
    },
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    paths: {
      '/v1/health': {
        get: {
          summary: 'System & PACS Health Status',
          responses: { 200: { description: 'System health diagnostic and status' } },
        },
      },
      '/pacs/query': {
        post: {
          summary: 'Query Hospital PACS Archive (C-FIND)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessionNumber: { type: 'string' },
                    patientMrn: { type: 'string' },
                    patientName: { type: 'string' },
                    modality: { type: 'string', enum: ['CT', 'MRI', 'CR', 'US', 'all'] },
                    dateRange: { type: 'string', enum: ['today', 'yesterday', 'week', 'all', 'custom'] },
                    dateFrom: { type: 'string', format: 'date' },
                    dateTo: { type: 'string', format: 'date' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Matching studies from PACS archive' } },
        },
      },
      '/pacs/import': {
        post: {
          summary: 'Import Study from PACS into Rad Suite Worklist',
          responses: { 200: { description: 'Import status and assigned study ID' } },
        },
      },
      '/pacs/ping': {
        post: {
          summary: 'Trigger TCP C-ECHO Ping to PACS node',
          responses: { 200: { description: 'Reachable status and latency in ms' } },
        },
      },
      '/system/jobs': {
        get: {
          summary: 'List active background workers (Watchdog, Poller, HMIS)',
          responses: { 200: { description: 'Job statuses' } },
        },
        post: {
          summary: 'Trigger execution of a background service job',
          responses: { 200: { description: 'Execution result' } },
        },
      },
    },
  };

  return NextResponse.json(spec);
}
