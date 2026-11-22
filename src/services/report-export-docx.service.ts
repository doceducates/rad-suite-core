// Layer 2 (Domain/Services): Clinical Word (.docx) Document Generator
// Institutional Standard: Post Graduate Medical Institute / Lahore General Hospital
// File Size Invariant: Target < 250 lines, Max 350 lines

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
  HeadingLevel,
} from 'docx';
import { htmlToClinicalText } from '@/lib/clinical-format';
import { FACULTY_CONSULTANTS, resolveDoctorDesignation } from '@/lib/consultants';
import type { ClinicalExportData } from './report-export-types';

const BORDER_LIGHT = { style: BorderStyle.SINGLE, size: 1, color: '0F172A' };
const CELL_BORDERS = { top: BORDER_LIGHT, bottom: BORDER_LIGHT, left: BORDER_LIGHT, right: BORDER_LIGHT };
const TOP_BORDER_ONLY = {
  top: BORDER_LIGHT,
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
};
const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

function createCell(label: string, value: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 18, font: 'Arial', color: '334155' }),
          new TextRun({ text: value || 'N/A', size: 18, font: 'Arial', color: '0F172A' }),
        ],
      }),
    ],
  });
}

function createSectionHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 60 },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 20,
        font: 'Arial',
        color: '0F172A',
      }),
    ],
  });
}

function parseTextToParagraphs(rawText: string, italic = false): Paragraph[] {
  const plain = htmlToClinicalText(rawText);
  if (!plain) {
    return [new Paragraph({ children: [new TextRun({ text: 'None documented.', italics: true, size: 19, font: 'Arial', color: '64748B' })] })];
  }

  const lines = plain.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const cleanText = isBullet ? trimmed.replace(/^[•\-\*]\s*/, '') : trimmed;

    const colonMatch = cleanText.match(/^([^:\n]{2,70}:)([\s\S]*)$/);
    if (colonMatch) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 30, after: 50 },
          bullet: isBullet ? { level: 0 } : undefined,
          children: [
            new TextRun({
              text: colonMatch[1],
              bold: true,
              size: 19,
              font: 'Arial',
              color: '0F172A',
            }),
            new TextRun({
              text: colonMatch[2],
              size: 19,
              font: 'Arial',
              italics: italic,
              color: '0F172A',
            }),
          ],
        })
      );
      continue;
    }

    paragraphs.push(
      new Paragraph({
        spacing: { before: 30, after: 50 },
        bullet: isBullet ? { level: 0 } : undefined,
        children: [
          new TextRun({
            text: cleanText,
            size: 19,
            font: 'Arial',
            italics: italic,
            color: '0F172A',
          }),
        ],
      })
    );
  }

  return paragraphs.length > 0
    ? paragraphs
    : [new Paragraph({ children: [new TextRun({ text: plain, size: 19, font: 'Arial' })] })];
}

export async function buildDocxReport(data: ClinicalExportData): Promise<Buffer> {
  const dateStr = data.studyDate
    ? new Date(data.studyDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // 1. Institutional Header Banner
  const headerElements = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'POST GRADUATE MEDICAL INSTITUTE', bold: true, size: 24, font: 'Arial', color: '0F172A' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'LAHORE GENERAL HOSPITAL', bold: true, size: 24, font: 'Arial', color: '0F172A' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Ameer-Ud-Din Medical College', italics: true, size: 19, font: 'Arial', color: '475569' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({ text: 'DEPARTMENT OF DIAGNOSTIC & INTERVENTIONAL RADIOLOGY', bold: true, size: 18, font: 'Arial', color: '0F172A' }),
      ],
    }),
  ];

  // 2. Patient Demographics Grid Table
  const demographicsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell('Patient Name', data.patientName, 40),
          createCell('MRN / Reg No.', data.patientMrn, 30),
          createCell('Age / Sex', `${data.patientAge ?? 'N/A'}Y / ${data.patientGender ?? 'N/A'}`, 30),
        ],
      }),
      new TableRow({
        children: [
          createCell('Examination', data.procedureName || data.studyDescription || 'CT SCAN', 40),
          createCell('Department', data.department || 'EMERGENCY / OPD', 30),
          createCell('Scan Date', dateStr, 30),
        ],
      }),
    ],
  });

  // 3. Body Sections
  const bodyElements: Paragraph[] = [];

  if (data.clinicalHistory) {
    bodyElements.push(createSectionHeading('Clinical Indication / History'));
    bodyElements.push(...parseTextToParagraphs(data.clinicalHistory, true));
  }

  if (data.technique) {
    bodyElements.push(createSectionHeading('Technique & Protocol'));
    bodyElements.push(...parseTextToParagraphs(data.technique));
  }

  if (data.comparison) {
    bodyElements.push(createSectionHeading('Comparison'));
    bodyElements.push(...parseTextToParagraphs(data.comparison));
  }

  bodyElements.push(createSectionHeading('Findings'));
  bodyElements.push(...parseTextToParagraphs(data.findings));

  bodyElements.push(createSectionHeading('IMPRESSION'));
  bodyElements.push(...parseTextToParagraphs(data.impression));

  if (data.recommendations) {
    bodyElements.push(createSectionHeading('Recommendations'));
    bodyElements.push(...parseTextToParagraphs(data.recommendations));
  }

  // 4. Signatures Attribution Box (4 lines: Name, Designation, Dept, Hospital)
  const leftName = data.pgrName || (data.consultantName ? '' : 'Resident Radiologist');
  const rightName = data.consultantName || (!leftName ? 'Resident Radiologist' : '');
  const leftDesig = data.pgrDesignation || resolveDoctorDesignation(leftName, 'pgr');
  const rightDesig = data.consultantDesignation || resolveDoctorDesignation(rightName, 'consultant');

  const createSignerCell = (
    name: string,
    desig: string,
    align: (typeof AlignmentType)[keyof typeof AlignmentType]
  ) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: TOP_BORDER_ONLY,
      margins: CELL_MARGINS,
      children: [
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({ text: `${name}\n`, bold: true, size: 20, font: 'Arial', color: '0F172A' }),
            new TextRun({ text: `${desig}\n`, bold: true, size: 16, font: 'Arial', color: '334155' }),
            new TextRun({ text: 'Department of Diagnostic & Interventional Radiology\n', size: 15, font: 'Arial', color: '64748B' }),
            new TextRun({ text: 'Lahore General Hospital / PGMI, Lahore', size: 14, font: 'Arial', color: '94A3B8' }),
          ],
        }),
      ],
    });

  const signaturesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createSignerCell(leftName || 'Resident Radiologist', leftDesig, AlignmentType.LEFT),
          createSignerCell(rightName || 'Consultant Radiologist', rightDesig, AlignmentType.RIGHT),
        ],
      }),
    ],
  });

  // 5. Official 18-Faculty Footer Table (6 Columns x 3 Doctors)
  const facultyCells: TableCell[] = [];
  for (let c = 0; c < 6; c++) {
    const docs = FACULTY_CONSULTANTS.slice(c * 3, (c * 3) + 3);
    const cellParagraphs: Paragraph[] = docs.flatMap((d, idx) => [
      new Paragraph({
        spacing: { before: idx > 0 ? 40 : 0, after: 10 },
        children: [
          new TextRun({ text: d.name, bold: true, size: 14, font: 'Arial', color: '0F172A' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 10 },
        children: [
          new TextRun({ text: d.qualifications, size: 12, font: 'Arial', color: '64748B' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 30 },
        children: [
          new TextRun({ text: d.designation, bold: d.rank === 'hod', size: 12, font: 'Arial', color: '334155' }),
        ],
      }),
    ]);

    facultyCells.push(
      new TableCell({
        width: { size: 100 / 6, type: WidthType.PERCENTAGE },
        borders: {
          top: BORDER_LIGHT,
          bottom: BORDER_LIGHT,
          left: c > 0 ? BORDER_LIGHT : { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        children: cellParagraphs,
      })
    );
  }

  const facultyTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: facultyCells })],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          ...headerElements,
          demographicsTable,
          new Paragraph({ spacing: { after: 100 } }),
          ...bodyElements,
          new Paragraph({ spacing: { after: 160 } }),
          signaturesTable,
          new Paragraph({ spacing: { after: 140 } }),
          facultyTable,
          new Paragraph({
            spacing: { before: 100 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Lahore General Hospital • Department of Diagnostic & Interventional Radiology • NOT VALID FOR COURT OF LAW',
                size: 14,
                font: 'Arial',
                color: '94A3B8',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
