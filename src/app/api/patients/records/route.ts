import { db } from "@/db";
import { patients, studies, reports } from "@/db/schema";
import { eq, desc, and, gte, lte, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const modality = searchParams.get("modality");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const priority = searchParams.get("priority");

    // Pagination controls with safe bounds
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const filters = [];

    if (dateFrom) filters.push(gte(studies.scheduledAt, new Date(dateFrom)));
    if (dateTo) filters.push(lte(studies.scheduledAt, new Date(dateTo)));
    if (modality) filters.push(eq(studies.modality, modality));
    if (status) filters.push(eq(reports.status, status));
    if (priority) filters.push(eq(studies.priority, priority));

    if (search) {
      const p = `%${search.toLowerCase()}%`;
      filters.push(
        or(
          sql`lower(${patients.fullName}) like ${p}`,
          sql`lower(${patients.mrNumber}) like ${p}`,
          sql`lower(${studies.accessionNumber}) like ${p}`,
          sql`lower(${studies.scanType}) like ${p}`
        )
      );
    }

    const rows = await db
      .select({ study: studies, patient: patients, report: reports })
      .from(studies)
      .innerJoin(patients, eq(patients.id, studies.patientId))
      .leftJoin(reports, eq(reports.studyId, studies.id))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(studies.scheduledAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      rows,
      limit,
      offset,
      count: rows.length,
    });
  },
  {
    roles: ["admin", "radiologist", "resident", "technologist"],
    audit: {
      action: "read_patient_records",
      entityType: "Patient",
    },
  }
);
