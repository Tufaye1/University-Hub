import fs from 'node:fs';
import vm from 'node:vm';

const sourcePath = process.argv[2] || '/tmp/tnf-global-index.js';
const shouldWrite = process.argv.includes('--write');
const shouldPlan = process.argv.includes('--plan');
const shouldSync = process.argv.includes('--sync');
const syncStartArgument = process.argv.find((argument) => argument.startsWith('--sync-start='));
const syncStart = syncStartArgument ? Number(syncStartArgument.split('=')[1]) : 0;
const source = fs.readFileSync(sourcePath, 'utf8');

function closingBracket(start) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '[') depth += 1;
    if (character === ']' && --depth === 0) return index;
  }
  return -1;
}

const records = [];
const assignment = /(?:(?:const |let |var |,)([A-Za-z_$][\w$]*)=|programDetails:)\[\{/g;
for (const match of source.matchAll(assignment)) {
  const start = match.index + match[0].lastIndexOf('[');
  const end = closingBracket(start);
  if (end < 0) continue;
  const literal = source.slice(start, end + 1);
  if (!literal.includes('programName:') || !literal.includes('institution:')) continue;
  try {
    const value = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 10_000 });
    records.push(...value.filter((item) => item && item.institution && item.programName));
  } catch (error) {
    console.error(`Could not parse ${match[1] || 'programDetails'}: ${error.message}`);
  }
}

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
const unique = [...new Map(records.map((item) => [item.id || `${normalize(item.institution)}|${normalize(item.campus)}|${normalize(item.programName)}`, item])).values()];
const countries = Object.fromEntries([...new Set(unique.map((item) => item.country))].sort().map((country) => [country, unique.filter((item) => item.country === country).length]));
console.log(JSON.stringify({ extracted: records.length, unique: unique.length, countries }, null, 2));

if (!shouldWrite && !shouldPlan && !shouldSync) process.exit(0);

const token = process.env.AIRTABLE_TOKEN;
if (!token) throw new Error('AIRTABLE_TOKEN is required.');
const baseId = 'appcJ8edCMgO0OBl7';
const tableName = 'Imported table';
const apiUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const existing = [];
let offset;
do {
  const url = new URL(apiUrl);
  url.searchParams.set('pageSize', '100');
  if (offset) url.searchParams.set('offset', offset);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Airtable read failed: ${response.status} ${await response.text()}`);
  const page = await response.json();
  existing.push(...page.records);
  offset = page.offset;
} while (offset);

const key = (university, campus, program) => `${normalize(university)}|${normalize(campus)}|${normalize(program)}`;
const existingKeys = new Set(existing.map(({ fields }) => key(fields.University, fields.Campus, fields.Program)));
const existingByKey = new Map(existing.map((record) => [key(record.fields.University, record.fields.Campus, record.fields.Program), record]));
const campusFor = (item) => [item.campus, item.city, item.region].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(', ');
const pending = unique.filter((item) => !existingKeys.has(key(item.institution, campusFor(item), item.programName)));
console.log(JSON.stringify({ existing: existing.length, pending: pending.length, duplicatesSkipped: unique.length - pending.length }, null, 2));

if (shouldPlan) process.exit(0);

const fieldsFor = (item) => ({
  University: item.institution,
  Country: item.country,
  Campus: campusFor(item),
  Program: item.programName,
  Level: item.studyLevel || 'Not provided in source',
  Field: item.subjectArea || item.subject || item.field || 'Not provided in source',
  Duration: item.duration || 'Not provided in source',
  'Total Fees (intl)': item.tuitionFirstYear ?? item.tuitionFirstYearNumeric ?? item.tuitionTotal ?? 'Not provided in source',
  Currency: item.currency || 'Not provided in source',
  Notes: [
    (item.applicationFee ?? item.applicationFeeTnf) != null ? `Application fee: ${item.currency || ''} ${item.applicationFee ?? item.applicationFeeTnf}`.trim() : '',
    Array.isArray(item.intakes) && item.intakes.length ? `Intakes: ${item.intakes.join(', ')}` : '',
    item.teachingLanguage ? `Teaching language: ${item.teachingLanguage}` : '',
    item.ielts ? `IELTS: ${item.ielts}` : '',
    item.pte ? `PTE: ${item.pte}` : '',
    item.toefl ? `TOEFL: ${item.toefl}` : '',
    item.duolingo ? `Duolingo: ${item.duolingo}` : '',
    item.academicRequirement ? `Academic requirement: ${item.academicRequirement}` : '',
    item.scholarshipInformation ? `Scholarship: ${item.scholarshipInformation}` : '',
    item.officialProgramUrl ? `Official programme: ${item.officialProgramUrl}` : '',
    item.officialInstitutionUrl ? `Official institution: ${item.officialInstitutionUrl}` : '',
    item.sourceType ? `TNF source type: ${item.sourceType}` : '',
  ].filter(Boolean).join(' | '),
  'Source PDF': item.sourceReference || item.officialProgramUrl || item.officialInstitutionUrl || 'TNF Global public university finder',
  'Last Verified': item.lastVerifiedDate || item.sourceType || 'TNF Global import',
});

if (shouldSync) {
  const allUpdates = unique.map((item) => ({ id: existingByKey.get(key(item.institution, campusFor(item), item.programName))?.id, fields: fieldsFor(item) })).filter((item) => item.id);
  const updates = [...new Map(allUpdates.slice(syncStart).map((item) => [item.id, item])).values()];
  let updated = syncStart;
  for (let index = 0; index < updates.length; index += 10) {
    const batch = updates.slice(index, index + 10);
    const response = await fetch(apiUrl, { method: 'PATCH', headers, body: JSON.stringify({ records: batch, typecast: true }) });
    if (!response.ok) throw new Error(`Airtable update failed after ${updated} records: ${response.status} ${await response.text()}`);
    updated += batch.length;
    if (updated % 100 === 0 || updated === allUpdates.length) console.log(`Updated ${updated}/${allUpdates.length}`);
    await new Promise((resolve) => setTimeout(resolve, 230));
  }
  console.log(JSON.stringify({ updated }, null, 2));
  process.exit(0);
}

let created = 0;
for (let index = 0; index < pending.length; index += 10) {
  const batch = pending.slice(index, index + 10).map((item) => ({ fields: fieldsFor(item) }));
  const response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify({ records: batch, typecast: true }) });
  if (!response.ok) throw new Error(`Airtable write failed after ${created} records: ${response.status} ${await response.text()}`);
  created += batch.length;
  if (created % 100 === 0 || created === pending.length) console.log(`Created ${created}/${pending.length}`);
  await new Promise((resolve) => setTimeout(resolve, 230));
}

console.log(JSON.stringify({ created, finalEstimatedTotal: existing.length + created }, null, 2));
