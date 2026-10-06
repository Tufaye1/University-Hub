export type Program = { id: string; university: string; country: string; campus: string; program: string; level: string; field: string; duration: string; fee: number | null; feeText: string; publishedFee: number | null; publishedFeeText: string; feeBasis: string; totalFee: number | null; totalFeeText: string; additionalFees: string; academicYear: string; currency: string; notes: string; source: string; sourceUrl: string; verified: string };
type AirtableRecord = { id: string; fields: Record<string, unknown> };
const baseId = 'appcJ8edCMgO0OBl7';
const tableName = 'Imported table';
const asText = (value: unknown) => Array.isArray(value) ? value.join(', ') : typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const feeForFilter = (value: string) => {
  const amounts = value.match(/\d[\d,]*(?:\.\d+)?/g)?.map((amount) => Number(amount.replace(/,/g, ''))).filter(Number.isFinite) ?? [];
  return amounts.length ? Math.max(...amounts) : null;
};

export function toProgram(record: AirtableRecord): Program {
  const fields = record.fields;
  const legacyFee = asText(fields['Total Fees (intl)']);
  const publishedFeeText = asText(fields['Published Tuition Fee']) || legacyFee;
  const totalFeeText = asText(fields['Total Programme Tuition']);
  const totalFee = feeForFilter(totalFeeText);
  return { id: record.id, university: asText(fields.University), country: asText(fields.Country) || 'Malaysia', campus: asText(fields.Campus), program: asText(fields.Program), level: asText(fields.Level), field: asText(fields.Field), duration: asText(fields.Duration), fee: totalFee, feeText: totalFeeText, publishedFee: feeForFilter(publishedFeeText), publishedFeeText, feeBasis: asText(fields['Fee Basis']) || 'Unknown', totalFee, totalFeeText, additionalFees: asText(fields['Mandatory Additional Fees']), academicYear: asText(fields['Academic Year']), currency: asText(fields.Currency) || 'MYR', notes: asText(fields.Notes), source: asText(fields['Source PDF']), sourceUrl: asText(fields['Source URL']), verified: asText(fields['Last Verified']) };
}

const isProgrammeRecord = (program: Program) => !/^institution directory listing\b/i.test(program.program);

export async function getProgramPage(offset?: string): Promise<{ programs: Program[]; offset?: string }> {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error('The Airtable connection is not configured.');
  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);
  url.searchParams.set('pageSize', '100');
  if (offset) url.searchParams.set('offset', offset);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('Airtable could not load the programme catalogue.');
  const page = await response.json() as { records: AirtableRecord[]; offset?: string };
  return { programs: page.records.map(toProgram).filter(isProgrammeRecord), offset: page.offset };
}

export async function getPrograms(): Promise<Program[]> {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error('The Airtable connection is not configured.');
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } });
    if (!response.ok) throw new Error('Airtable could not load the programme catalogue.');
    const page = await response.json() as { records: AirtableRecord[]; offset?: string };
    records.push(...page.records); offset = page.offset;
  } while (offset);
  return records.map(toProgram).filter(isProgrammeRecord);
}
