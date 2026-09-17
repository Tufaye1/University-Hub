export type Program = { id: string; university: string; country: string; campus: string; program: string; level: string; field: string; duration: string; fee: number | null; feeText: string; currency: string; notes: string; source: string; verified: string };
type AirtableRecord = { id: string; fields: Record<string, unknown> };
const baseId = 'appcJ8edCMgO0OBl7';
const tableName = 'Imported table';
const asText = (value: unknown) => Array.isArray(value) ? value.join(', ') : typeof value === 'string' || typeof value === 'number' ? String(value) : '';

function toProgram(record: AirtableRecord): Program {
  const fields = record.fields;
  const rawFee = asText(fields['Total Fees (intl)']);
  const numericFee = rawFee.replace(/[^0-9.]/g, '');
  const parsedFee = numericFee ? Number(numericFee) : null;
  return { id: record.id, university: asText(fields.University), country: asText(fields.Country) || 'Malaysia', campus: asText(fields.Campus), program: asText(fields.Program), level: asText(fields.Level), field: asText(fields.Field), duration: asText(fields.Duration), fee: parsedFee !== null && Number.isFinite(parsedFee) ? parsedFee : null, feeText: rawFee, currency: asText(fields.Currency) || 'MYR', notes: asText(fields.Notes), source: asText(fields['Source PDF']), verified: asText(fields['Last Verified']) };
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
  return records.map(toProgram);
}
