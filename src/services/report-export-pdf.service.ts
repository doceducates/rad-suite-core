// Layer 2 (Domain/Services): Clinical PDF Document Generator using pdf-lib
// Institutional Standard: Post Graduate Medical Institute / Lahore General Hospital
// File Size Invariant: Target < 250 lines, Max 350 lines

import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { htmlToClinicalText } from '@/lib/clinical-format';
import { FACULTY_CONSULTANTS, resolveDoctorDesignation } from '@/lib/consultants';
import type { ClinicalExportData } from './report-export-types';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 36;
const MARGIN_RIGHT = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // ~523 pt
const BOTTOM_MARGIN = 95; // reserved for faculty footer

const COLOR_DARK = rgb(0.06, 0.09, 0.16); // #0f172a
const COLOR_SECONDARY = rgb(0.28, 0.33, 0.41); // #475569
const COLOR_MUTED = rgb(0.58, 0.64, 0.72); // #94a3b8
const COLOR_BORDER = rgb(0.8, 0.84, 0.88); // #cbd5e1
const COLOR_BG_LIGHT = rgb(0.97, 0.98, 0.99); // #f8fafc

function sanitizePdfText(str: string): string {
  if (!str) return '';
  return str.replace(/[^\x00-\x7F\xA0-\xFF\u2022\u2013\u2014\u2018\u2019\u201C\u201D]/g, ' ');
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const rawParagraphs = text.split('\n');

  for (const rawPara of rawParagraphs) {
    const trimmed = rawPara.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(sanitizePdfText(candidate), fontSize);
      if (width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

export async function buildPdfReport(data: ClinicalExportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Try embedding institutional emblems
  let pgmiImg: any = null;
  let lghImg: any = null;
  try {
    const pgmiPath = path.join(process.cwd(), 'public', 'PGMI.jpg');
    if (fs.existsSync(pgmiPath)) pgmiImg = await doc.embedJpg(fs.readFileSync(pgmiPath));
  } catch {}
  try {
    const lghPath = path.join(process.cwd(), 'public', 'LGH.jpg');
    if (fs.existsSync(lghPath)) lghImg = await doc.embedJpg(fs.readFileSync(lghPath));
  } catch {}

  let currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 32;

  const ensureSpace = (neededHeight: number): PDFPage => {
    if (y - neededHeight < BOTTOM_MARGIN) {
      currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 38;
    }
    return currentPage;
  };

  const dateStr = data.studyDate
    ? new Date(data.studyDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // 1. Dual Institutional Header
  const logoSize = 48;
  const headerTopY = y;

  if (pgmiImg) {
    currentPage.drawImage(pgmiImg, { x: MARGIN_LEFT, y: headerTopY - logoSize, width: logoSize, height: logoSize });
  }
  if (lghImg) {
    currentPage.drawImage(lghImg, { x: PAGE_WIDTH - MARGIN_RIGHT - logoSize, y: headerTopY - logoSize, width: logoSize, height: logoSize });
  }

  // Central Institutional Text
  const centerText = (text: string, size: number, font: PDFFont, textY: number, color = COLOR_DARK) => {
    const width = font.widthOfTextAtSize(text, size);
    currentPage.drawText(text, { x: (PAGE_WIDTH - width) / 2, y: textY, size, font, color });
  };

  centerText('POST GRADUATE MEDICAL INSTITUTE', 11.5, fontBold, y - 4);
  centerText('LAHORE GENERAL HOSPITAL', 11.5, fontBold, y - 17);
  centerText('Ameer-Ud-Din Medical College', 9.5, fontItalic, y - 29, COLOR_SECONDARY);
  centerText('DEPARTMENT OF DIAGNOSTIC & INTERVENTIONAL RADIOLOGY', 8, fontBold, y - 41, COLOR_DARK);

  y -= (logoSize + 8);
  currentPage.drawRectangle({ x: MARGIN_LEFT, y, width: CONTENT_WIDTH, height: 1.5, color: COLOR_DARK });
  y -= 10;

  // 2. Patient Demographics Box (6-field grid)
  const boxHeight = 52;
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: y - boxHeight,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: COLOR_BG_LIGHT,
    borderColor: COLOR_DARK,
    borderWidth: 0.75,
  });

  const row1Y = y - 13;
  const row2Y = y - 28;
  const row3Y = y - 43;
  const col1X = MARGIN_LEFT + 8;
  const col2X = MARGIN_LEFT + 195;
  const col3X = MARGIN_LEFT + 370;

  // Row 1: Patient Name | Age/Sex
  currentPage.drawText('Patient Name:', { x: col1X, y: row1Y, size: 8.5, font: fontBold, color: COLOR_SECONDARY });
  currentPage.drawText(sanitizePdfText(data.patientName || 'N/A').toUpperCase(), { x: col1X + 62, y: row1Y, size: 8.5, font: fontBold, color: COLOR_DARK });
  currentPage.drawText('Age / Sex:', { x: col3X, y: row1Y, size: 8.5, font: fontBold, color: COLOR_SECONDARY });
  currentPage.drawText(`${data.patientAge ?? 'N/A'}Y / ${data.patientGender ?? 'N/A'}`, { x: col3X + 46, y: row1Y, size: 8.5, font: fontRegular, color: COLOR_DARK });

  // Row 2: MRN | Department
  currentPage.drawText('MRN / Reg No.:', { x: col1X, y: row2Y, size: 8.5, font: fontBold, color: COLOR_SECONDARY });
  currentPage.drawText(sanitizePdfText(data.patientMrn || 'N/A'), { x: col1X + 66, y: row2Y, size: 8.5, font: fontBold, color: COLOR_DARK });
  currentPage.drawText('Department:', { x: col2X, y: row2Y, size: 8.5, font: fontBold, color: COLOR_SECONDARY });
  currentPage.drawText(sanitizePdfText(data.department || 'EMERGENCY / OPD').toUpperCase(), { x: col2X + 54, y: row2Y, size: 8, font: fontRegular, color: COLOR_DARK });

  // Row 3: Examination | Scan Date
  currentPage.drawText('Examination:', { x: col1X, y: row3Y, size: 8.5, font: fontBold, color: COLOR_SECONDARY });
  currentPage.drawText(sanitizePdfText(data.procedureName || data.studyDescription || 'CT SCAN').toUpperCase(), { x: col1X + 60, y: row3Y, size: 8, font: fontBold, color: COLOR_DARK });
  currentPage.drawText('Scan Date:', { x: col3X, y: row3Y, size: 8.5, font: fontBold, color: COLOR_SECONDARY });
  currentPage.drawText(sanitizePdfText(dateStr), { x: col3X + 46, y: row3Y, size: 8.5, font: fontRegular, color: COLOR_DARK });

  y -= (boxHeight + 12);

  // 3. Clinical Sections
  const renderSection = (title: string, rawContent: string, isImpression = false, isItalic = false) => {
    const plain = htmlToClinicalText(rawContent);
    if (!plain) return;

    ensureSpace(32);
    currentPage.drawText(sanitizePdfText(title.toUpperCase()), {
      x: MARGIN_LEFT,
      y,
      size: isImpression ? 10.5 : 9.5,
      font: fontBold,
      color: COLOR_DARK,
    });
    y -= 4;

    currentPage.drawRectangle({ x: MARGIN_LEFT, y, width: CONTENT_WIDTH, height: 0.5, color: COLOR_BORDER });
    y -= 11;

    const font = isItalic ? fontItalic : (isImpression ? fontBold : fontRegular);
    const fontSize = 9.5;
    const lineHeight = 13;
    const lines = wrapText(plain, font, fontSize, CONTENT_WIDTH - (isImpression ? 10 : 0));

    for (const line of lines) {
      if (!line) {
        y -= 5;
        continue;
      }
      ensureSpace(lineHeight + 4);
      currentPage.drawText(sanitizePdfText(line), {
        x: MARGIN_LEFT + (isImpression ? 4 : 0),
        y,
        size: fontSize,
        font,
        color: COLOR_DARK,
      });
      y -= lineHeight;
    }
    y -= 7;
  };

  if (data.clinicalHistory) renderSection('Clinical Indication / History', data.clinicalHistory, false, true);
  if (data.technique) renderSection('Technique & Protocol', data.technique);
  if (data.comparison) renderSection('Comparison', data.comparison);
  renderSection('Findings', data.findings);
  renderSection('IMPRESSION', data.impression, true);
  if (data.recommendations) renderSection('Recommendations', data.recommendations);

  // 4. Reporting Doctors Sign-off Block (4 lines: Name, Designation, Dept, Hospital)
  ensureSpace(56);
  y -= 4;
  const signerRightX = MARGIN_LEFT + 280;

  const leftName = data.pgrName || (data.consultantName ? '' : 'Resident Radiologist');
  const rightName = data.consultantName || (!leftName ? 'Resident Radiologist' : '');

  const leftDesig = data.pgrDesignation || resolveDoctorDesignation(leftName, 'pgr');
  const rightDesig = data.consultantDesignation || resolveDoctorDesignation(rightName, 'consultant');

  if (leftName) {
    currentPage.drawText(sanitizePdfText(leftName), { x: MARGIN_LEFT, y, size: 9.5, font: fontBold, color: COLOR_DARK });
  }
  if (rightName) {
    currentPage.drawText(sanitizePdfText(rightName), { x: signerRightX, y, size: 9.5, font: fontBold, color: COLOR_DARK });
  }
  y -= 11;

  if (leftName) {
    currentPage.drawText(sanitizePdfText(leftDesig), { x: MARGIN_LEFT, y, size: 8, font: fontBold, color: COLOR_SECONDARY });
  }
  if (rightName) {
    currentPage.drawText(sanitizePdfText(rightDesig), { x: signerRightX, y, size: 8, font: fontBold, color: COLOR_SECONDARY });
  }
  y -= 9.5;

  if (leftName) {
    currentPage.drawText('Department of Diagnostic & Interventional Radiology', { x: MARGIN_LEFT, y, size: 7.2, font: fontRegular, color: COLOR_SECONDARY });
  }
  if (rightName) {
    currentPage.drawText('Department of Diagnostic & Interventional Radiology', { x: signerRightX, y, size: 7.2, font: fontRegular, color: COLOR_SECONDARY });
  }
  y -= 9;

  if (leftName) {
    currentPage.drawText('Lahore General Hospital / PGMI, Lahore', { x: MARGIN_LEFT, y, size: 7.2, font: fontRegular, color: COLOR_MUTED });
  }
  if (rightName) {
    currentPage.drawText('Lahore General Hospital / PGMI, Lahore', { x: signerRightX, y, size: 7.2, font: fontRegular, color: COLOR_MUTED });
  }
  y -= 10;

  // 5. Official 18-Faculty Footer (Rendered on each page)
  const totalPages = doc.getPageCount();
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const page = doc.getPage(pIdx);
    const footerTopY = 82;

    // Divider line
    page.drawRectangle({ x: MARGIN_LEFT, y: footerTopY, width: CONTENT_WIDTH, height: 1, color: COLOR_DARK });

    // 6 Columns x 3 Doctors
    const colWidth = CONTENT_WIDTH / 6;
    for (let c = 0; c < 6; c++) {
      const colX = MARGIN_LEFT + (c * colWidth);
      const docsInCol = FACULTY_CONSULTANTS.slice(c * 3, (c * 3) + 3);

      docsInCol.forEach((docEntry, r) => {
        const itemY = footerTopY - 10 - (r * 18);
        page.drawText(sanitizePdfText(docEntry.name), { x: colX + 1, y: itemY, size: 6.8, font: fontBold, color: COLOR_DARK });
        page.drawText(sanitizePdfText(`${docEntry.designation}`), { x: colX + 1, y: itemY - 6.5, size: 5.8, font: fontRegular, color: COLOR_SECONDARY });
      });

      if (c < 5) {
        page.drawLine({
          start: { x: colX + colWidth - 2, y: footerTopY - 2 },
          end: { x: colX + colWidth - 2, y: footerTopY - 56 },
          thickness: 0.5,
          color: COLOR_BORDER,
        });
      }
    }

    // Disclaimer & Page Index Line
    const bottomY = 16;
    page.drawRectangle({ x: MARGIN_LEFT, y: 24, width: CONTENT_WIDTH, height: 0.5, color: COLOR_BORDER });
    page.drawText('Lahore General Hospital • Department of Diagnostic & Interventional Radiology', {
      x: MARGIN_LEFT,
      y: bottomY,
      size: 6.5,
      font: fontRegular,
      color: COLOR_MUTED,
    });
    page.drawText(`Page ${pIdx + 1} of ${totalPages}`, {
      x: (PAGE_WIDTH - 40) / 2,
      y: bottomY,
      size: 6.5,
      font: fontBold,
      color: COLOR_SECONDARY,
    });
    page.drawText('NOT VALID FOR COURT OF LAW', {
      x: PAGE_WIDTH - MARGIN_RIGHT - 110,
      y: bottomY,
      size: 6.5,
      font: fontBold,
      color: COLOR_DARK,
    });
  }

  return await doc.save();
}
