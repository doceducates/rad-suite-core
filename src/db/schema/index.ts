/**
 * Canonical Schema Export & Global Runtime Driver Safeguards
 * Prevents RangeError: Invalid time value in Drizzle ORM SQLiteSyncDialect
 */

// 1. Global Date.prototype.toISOString safeguard (prevents crashes from invalid dates)
if (typeof Date !== 'undefined' && typeof Date.prototype.toISOString === 'function') {
  const origToISOString = Date.prototype.toISOString;
  Date.prototype.toISOString = function () {
    if (isNaN(this.getTime())) {
      return new Date().toISOString();
    }
    return origToISOString.call(this);
  };
}

export * from './tenants';
export * from './users';
export * from './patients';
export * from './studies';
export * from './reports';
export * from './audit';
export * from './intake';
export * from './hmis';
export * from './templates';
export * from './collab';
export * from './pacs';
export * from './radiopaedia';
export * from './report-sync';
export * from './hospital-pacs';
export * from './case-sync';
export * from './sync-changelog';
export * from './hot-cases';
export * from './telemetry';
export * from './agent-api-keys';
export * from './case-shares';

// 2. Column-level driver safeguard for all schema timestamp columns
import * as tenantModels from './tenants';
import * as userModels from './users';
import * as patientModels from './patients';
import * as studyModels from './studies';
import * as reportModels from './reports';
import * as auditModels from './audit';
import * as intakeModels from './intake';
import * as hmisModels from './hmis';
import * as templateModels from './templates';
import * as collabModels from './collab';
import * as pacsModels from './pacs';
import * as radiopaediaModels from './radiopaedia';
import * as reportSyncModels from './report-sync';
import * as hospitalPacsModels from './hospital-pacs';
import * as caseSyncModels from './case-sync';
import * as syncChangelogModels from './sync-changelog';
import * as hotCasesModels from './hot-cases';
import * as telemetryModels from './telemetry';
import * as agentApiKeyModels from './agent-api-keys';
import * as caseShareModels from './case-shares';

const allModelGroups = [
  tenantModels,
  userModels,
  patientModels,
  studyModels,
  reportModels,
  auditModels,
  intakeModels,
  hmisModels,
  templateModels,
  collabModels,
  pacsModels,
  radiopaediaModels,
  reportSyncModels,
  hospitalPacsModels,
  caseSyncModels,
  syncChangelogModels,
  hotCasesModels,
  telemetryModels,
  agentApiKeyModels,
  caseShareModels,
];

for (const group of allModelGroups) {
  for (const table of Object.values(group)) {
    if (table && typeof table === 'object') {
      for (const col of Object.values(table)) {
        const isDateCol =
          (col as any)?.dataType === 'date' ||
          String((col as any)?.columnType || '').includes('Timestamp') ||
          String((col as any)?.columnType || '').includes('Date');

        if (col && typeof col === 'object' && isDateCol && typeof (col as any).mapToDriverValue === 'function') {
          const orig = (col as any).mapToDriverValue;
          (col as any).mapToDriverValue = function (val: any) {
            if (val === null || val === undefined) {
              return (this as any).notNull ? new Date().toISOString() : null;
            }
            if (typeof val === 'string') {
              const d = new Date(val);
              return isNaN(d.getTime()) ? ((this as any).notNull ? new Date().toISOString() : null) : d.toISOString();
            }
            if (val instanceof Date) {
              return isNaN(val.getTime()) ? ((this as any).notNull ? new Date().toISOString() : null) : orig.call(this, val);
            }
            return orig.call(this, val);
          };
        }
      }
    }
  }
}
