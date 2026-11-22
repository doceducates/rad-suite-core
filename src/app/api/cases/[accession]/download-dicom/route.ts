import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'stream';
import { getLocalCaseById } from '@/services/local-cases.service';
import { createS3StudyZipBuffer } from '@/services/s3-retrieval.service';
import { HOT_CASES_DIR } from '@/services/hot-case-staging.service';
import { db } from '@/db';
import { hotStagedStudies, hospitalPacsStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth<{ accession: string }>(
  async (_req: NextRequest, { params }) => {
    try {
      const accession = params?.accession;
      if (!accession) {
        return NextResponse.json({ success: false, error: 'Missing accession number' }, { status: 400 });
      }

    // 1. Check VPS Hot Staging storage first (/storage/hot-cases/<accession>)
    const hotCaseDir = path.join(HOT_CASES_DIR, accession);
    if (fs.existsSync(hotCaseDir)) {
      const seriesDirs = (await fs.promises.readdir(hotCaseDir)).filter((d) => d.startsWith('series-'));
      let totalFiles = 0;
      for (const dirName of seriesDirs) {
        const sPath = path.join(hotCaseDir, dirName);
        const files = (await fs.promises.readdir(sPath)).filter((f) => f.endsWith('.dcm'));
        totalFiles += files.length;
      }

      if (seriesDirs.length > 0 && totalFiles > 0) {
        const archive = new ZipArchive({ zlib: { level: 4 } });
        const passThrough = new PassThrough();
        archive.pipe(passThrough);

        const chunks: Uint8Array[] = [];
        passThrough.on('data', (c) => chunks.push(c));

        for (const dirName of seriesDirs) {
          const sPath = path.join(hotCaseDir, dirName);
          const files = (await fs.promises.readdir(sPath)).filter((f) => f.endsWith('.dcm')).sort();
          for (const f of files) {
            archive.file(path.join(sPath, f), { name: `${dirName}/${f}` });
          }
        }

        archive.finalize();
        await new Promise((resolve, reject) => {
          passThrough.on('end', resolve);
          passThrough.on('error', reject);
          archive.on('error', reject);
        });

        const zipBuf = Buffer.concat(chunks);
        return new Response(new Uint8Array(zipBuf), {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${accession}_dicom.zip"`,
            'Content-Length': String(zipBuf.length),
            'X-RadSuite-Source': 'hot-staging',
          },
        });
      }
    }

    // 2. Check if study exists locally on disk (E:\Cases)
    const localCase = getLocalCaseById(accession);
    if (localCase && localCase.series && localCase.series.length > 0) {
      const archive = new ZipArchive({ zlib: { level: 6 } });
      const passThrough = new PassThrough();
      archive.pipe(passThrough);

      const chunks: Uint8Array[] = [];
      passThrough.on('data', (c) => chunks.push(c));

      for (const s of localCase.series) {
        for (const file of s.files) {
          if (fs.existsSync(file)) {
            const fname = path.basename(file);
            archive.file(file, { name: fname.endsWith('.dcm') ? fname : `${fname}.dcm` });
          }
        }
      }

      archive.finalize();

      await new Promise((resolve, reject) => {
        passThrough.on('end', resolve);
        passThrough.on('error', reject);
        archive.on('error', reject);
      });

      const zipBuf = Buffer.concat(chunks);
      return new Response(new Uint8Array(zipBuf), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${accession}_dicom.zip"`,
          'Content-Length': String(zipBuf.length),
        },
      });
    }

    // 2. Fetch from S3 Storage
    const s3ZipBuf = await createS3StudyZipBuffer(accession);
    if (s3ZipBuf && s3ZipBuf.length > 0) {
      return new Response(new Uint8Array(s3ZipBuf), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${accession}_dicom.zip"`,
          'Content-Length': String(s3ZipBuf.length),
        },
      });
    }

    // 3. Check Personal Google Drive Study Vault
    const [hotStudy] = await db
      .select({
        gdriveFileId: hotStagedStudies.gdriveFileId,
        storageTargetUserId: hotStagedStudies.storageTargetUserId,
      })
      .from(hotStagedStudies)
      .where(eq(hotStagedStudies.accessionNumber, accession))
      .limit(1);

    let gdriveFileId = hotStudy?.gdriveFileId;
    let targetUserId = hotStudy?.storageTargetUserId;

    if (!gdriveFileId || !targetUserId) {
      const [pacsStudy] = await db
        .select({
          gdriveFileId: hospitalPacsStudies.gdriveFileId,
          storageTargetUserId: hospitalPacsStudies.storageTargetUserId,
        })
        .from(hospitalPacsStudies)
        .where(eq(hospitalPacsStudies.accessionNumber, accession))
        .limit(1);
      if (pacsStudy?.gdriveFileId && pacsStudy?.storageTargetUserId) {
        gdriveFileId = pacsStudy.gdriveFileId;
        targetUserId = pacsStudy.storageTargetUserId;
      }
    }

    if (gdriveFileId && targetUserId) {
      try {
        const { downloadStudyFromUserGoogleDrive } = await import('@/services/gdrive-study-upload.service');
        const driveRes = await downloadStudyFromUserGoogleDrive(targetUserId, gdriveFileId);
        if (driveRes.ok && driveRes.body) {
          return new Response(driveRes.body as any, {
            status: 200,
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${accession}_dicom.zip"`,
              'X-RadSuite-Source': 'google-drive',
            },
          });
        }
      } catch (gdErr) {
        console.warn('[DOWNLOAD_DICOM_GDRIVE_STREAM_WARN]', gdErr);
      }
    }

    return NextResponse.json({ success: false, error: `Study ${accession} not found on local disk or S3 storage` }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Download failed' }, { status: 500 });
  }
},
{
  audit: {
    action: 'download_dicom_study',
    entityType: 'Study',
    details: 'Downloaded full DICOM study archive',
  },
}
);
