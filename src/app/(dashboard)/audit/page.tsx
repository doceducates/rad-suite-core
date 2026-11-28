import Link from 'next/link';
import { db } from '@/db';
import { auditLog } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getCurrentUser } from '@/services/auth.service';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { ShieldCheck, UserCheck, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Administrator Access Required</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          The HIPAA Security Audit Trail is protected and accessible only to System Administrators.
        </p>
        <Link href="/hmis">
          <Button size="sm" className="mt-2">Return to HMIS</Button>
        </Link>
      </div>
    );
  }

  const logs = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(50);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Security & Compliance Audit Trail</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Immutable HIPAA/Regulatory action log of all user activities</p>
        </div>
        <Badge variant="info" className="gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Active Protection
        </Badge>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/40 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Clinician</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 text-zinc-500">{formatDate(log.createdAt)}</td>
                  <td className="py-3 px-4 font-sans font-medium text-zinc-900 dark:text-zinc-100">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-primary" />
                      <span>{log.userName || 'System'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={log.action === 'login' ? 'info' : log.action === 'sign_report' ? 'success' : 'outline'} className="font-mono text-[10px]">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">{log.entityType}</td>
                  <td className="py-3 px-4 text-zinc-500 font-sans truncate max-w-xs">{log.details || '-'}</td>
                  <td className="py-3 px-4 text-zinc-400">{log.ipAddress || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
