/**
 * Next.js Server Lifecycle Instrumentation Hook
 * Executes once when the Next.js server boots before processing requests.
 */

export async function register() {
  if (typeof Date !== 'undefined' && typeof Date.prototype.toISOString === 'function') {
    const origToISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = function () {
      if (isNaN(this.getTime())) {
        return new Date().toISOString();
      }
      return origToISOString.call(this);
    };
  }

  // Start VPS background daemons: archiver & hot storage quota cleaner
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startArchiverDaemon } = await import('@/services/hot-case-archiver.service');
      startArchiverDaemon(25);
    } catch (e) {
      console.warn('[INSTRUMENTATION_ARCHIVER_WARN]', e);
    }

    try {
      const { startHotStoragePruneDaemon, enforceHotStorageQuota } = await import('@/services/hot-case-staging.service');
      enforceHotStorageQuota().catch(() => {});
      startHotStoragePruneDaemon(15);
    } catch (e) {
      console.warn('[INSTRUMENTATION_PRUNE_WARN]', e);
    }
  }
}
