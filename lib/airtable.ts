export type Program = { id: string; university: string; country: string; campus: string; program: string; level: string; field: string; duration: string; fee: number | null; feeText: string; semesterFee: number | null; semesterFeeText: string; totalFee: number | null; totalFeeText: string; additionalFees: string; academicYear: string; currency: string; notes: string; source: string; sourceUrl: string; verified: string };

type ProgrammeRow = {
  airtable_record_id: string;
  university: string | null;
  country: string | null;
  campus: string | null;
  program: string | null;
  level: string | null;
  field: string | null;
  duration: string | null;
  published_tuition_fee: string | null;
  semester_tuition_fee: string | null;
  total_programme_tuition: string | null;
  mandatory_additional_fees: string | null;
  academic_year: string | null;
  currency: string | null;
  notes: string | null;
  source_pdf: string | null;
  source_url: string | null;
  last_verified: string | null;
};

const supabaseUrl = 'https://iewqeaphlutslbcnkgdk.supabase.co';
const publishableKey = 'sb_publishable_SfCRM_9LztRnmMTHX--XQQ_JgXgf7-A';
const asText = (value: string | null) => value ?? '';
const feeForFilter = (value: string) => {
  const amounts = value.match(/\d[\d,]*(?:\.\d+)?/g)?.map((amount) => Number(amount.replace(/,/g, ''))).filter(Number.isFinite) ?? [];
  return amounts.length ? Math.max(...amounts) : null;
};
const isProgrammeRecord = (program: Program) => !/^institution directory listing\b/i.test(program.program);

function toProgram(row: ProgrammeRow): Program {
  const semesterFeeText = asText(row.semester_tuition_fee);
  const totalFeeText = asText(row.total_programme_tuition);
  const totalFee = feeForFilter(totalFeeText);
  return {
    id: row.airtable_record_id,
    university: asText(row.university),
    country: asText(row.country),
    campus: asText(row.campus),
    program: asText(row.program),
    level: asText(row.level),
    field: asText(row.field),
    duration: asText(row.duration),
    fee: totalFee,
    feeText: totalFeeText,
    semesterFee: feeForFilter(semesterFeeText),
    semesterFeeText,
    totalFee,
    totalFeeText,
    additionalFees: asText(row.mandatory_additional_fees),
    academicYear: asText(row.academic_year),
    currency: asText(row.currency),
    notes: asText(row.notes),
    source: asText(row.source_pdf),
    sourceUrl: asText(row.source_url),
    verified: asText(row.last_verified),
  };
}

async function fetchPage(start: number, pageSize: number) {
  const url = new URL('/rest/v1/university_programs', supabaseUrl);
  url.searchParams.set('select', '*');
  url.searchParams.set('order', 'university.asc,program.asc,airtable_record_id.asc');
  url.searchParams.set('offset', String(start));
  url.searchParams.set('limit', String(pageSize));
  const response = await fetch(url, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Supabase could not load the programme catalogue.');
  return response.json() as Promise<ProgrammeRow[]>;
}

export async function getProgramPage(offset?: string): Promise<{ programs: Program[]; offset?: string }> {
  const start = Number(offset ?? 0);
  const pageSize = 1000;
  const rows = await fetchPage(start, pageSize);
  return {
    programs: rows.slice(0, pageSize).map(toProgram).filter(isProgrammeRecord),
    offset: rows.length === pageSize ? String(start + pageSize) : undefined,
  };
}

export async function getPrograms(): Promise<Program[]> {
  const programs: Program[] = [];
  let start = 0;
  const pageSize = 1000;
  while (true) {
    const rows = await fetchPage(start, pageSize);
    programs.push(...rows.slice(0, pageSize).map(toProgram).filter(isProgrammeRecord));
    if (rows.length < pageSize) break;
    start += pageSize;
  }
  return programs;
}
