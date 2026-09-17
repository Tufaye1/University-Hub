'use client';

import { useMemo, useState } from 'react';
import { Download, FileText, GraduationCap, Printer, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { Program } from '@/lib/airtable';

const MYR_TO_BDT = 31;
const number = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 });

function cityFor(program: Program) {
  const campus = program.campus.trim();
  if (!campus) return '—';
  if (program.country.toLowerCase() === 'malaysia') return campus.replace(/\s+campus$/i, '').trim() || campus;
  const parts = campus.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return campus.replace(/\s+campus$/i, '').trim();
  return /\d|street|road|avenue|campus|university/i.test(parts[0]) ? parts[1] : parts[0];
}

function feeFor(program: Program) {
  if (program.fee === null) return program.feeText || 'Not specified';
  if (program.currency.toUpperCase() === 'MYR') return `BDT ${number.format(program.fee * MYR_TO_BDT)}`;
  return `${program.currency || 'Fee'} ${number.format(program.fee)}`;
}

export function FinderClient({ programs }: { programs: Program[] }) {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('All countries');
  const [level, setLevel] = useState('All levels');
  const [maximumFee, setMaximumFee] = useState('');
  const countries = [...new Set(programs.map((item) => item.country).filter(Boolean))].sort();
  const levels = [...new Set(programs.map((item) => item.level).filter(Boolean))].sort();
  const results = useMemo(() => programs.filter((program) => {
    const matchesQuery = `${program.university} ${program.program} ${program.campus} ${program.country}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCountry = country === 'All countries' || program.country === country;
    const matchesLevel = level === 'All levels' || program.level === level;
    const bdtFee = program.currency.toUpperCase() === 'MYR' && program.fee !== null ? program.fee * MYR_TO_BDT : null;
    const matchesFee = !maximumFee || (bdtFee !== null && bdtFee <= Number(maximumFee));
    return matchesQuery && matchesCountry && matchesLevel && matchesFee;
  }), [programs, query, country, level, maximumFee]);
  const reset = () => { setQuery(''); setCountry('All countries'); setLevel('All levels'); setMaximumFee(''); };
  const active = Boolean(query || country !== 'All countries' || level !== 'All levels' || maximumFee);

  const downloadWord = () => {
    const rtf = (value: string) => value.replace(/[\\{}]/g, '\\$&').replace(/[^\x00-\x7F]/g, (character) => `\\u${character.charCodeAt(0)}?`);
    const row = (values: string[], bold = false) => `{${bold ? '\\b ' : ''}${values.map((value) => rtf(value)).join('\\tab ')}${bold ? '\\b0' : ''}\\par}`;
    const headers = row(['No.', 'University', 'Course name', 'City', 'Country', 'Duration', 'Level', 'Fee'], true);
    const rows = results.map((program, index) => row([String(index + 1), program.university || '—', program.program || '—', cityFor(program), program.country || '—', program.duration || '—', program.level || '—', feeFor(program)])).join('');
    const content = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\fs20{\\b\\fs30 University Programme List}\\par ${results.length} programme result(s). Fees are displayed in BDT where available.\\par\\par ${headers}${rows}}`;
    const blob = new Blob([content], { type: 'application/rtf' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'university-programmes.rtf';
    link.click();
    URL.revokeObjectURL(url);
  };

  return <main className="min-h-screen bg-[#f5f7f4] text-[#16251f]">
    <header className="no-print overflow-hidden border-b border-[#164f40] bg-[#083f32] text-white"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-6 sm:px-8"><div className="flex items-center gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/20"><GraduationCap className="size-6" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a9d5c4]">RizeUp Global</p><p className="mt-1 text-xl font-semibold tracking-tight">University Hub</p></div></div><div className="hidden items-center gap-3 border-l border-white/20 pl-6 text-right sm:flex"><div><p className="text-sm font-medium">Explore global programmes</p><p className="mt-0.5 text-xs text-[#a9d5c4]">Compare courses, locations and fees</p></div></div></div></header>
    <section className="mx-auto max-w-[1500px] px-5 pb-14 pt-9 sm:px-8">
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-semibold text-[#0b6b4f]">University programme database</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find the right programme.</h1></div><p className="text-sm text-[#66736d]"><strong className="text-[#16251f]">{results.length}</strong> of {programs.length} programmes</p></div>
      <div className="no-print mb-6 rounded-2xl border border-[#dce5de] bg-white p-4 shadow-[0_14px_35px_rgba(22,37,31,0.06)]"><div className="grid gap-3 xl:grid-cols-[minmax(260px,2fr)_1fr_1fr_1fr_auto]">
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#66736d]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search university, course or city" className="h-11 pl-10" /></label>
        <NativeSelect aria-label="Country" value={country} onChange={(event) => setCountry(event.target.value)} className="h-11 w-full"><NativeSelectOption>All countries</NativeSelectOption>{countries.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect>
        <NativeSelect aria-label="Level" value={level} onChange={(event) => setLevel(event.target.value)} className="h-11 w-full"><NativeSelectOption>All levels</NativeSelectOption>{levels.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect>
        <Input aria-label="Maximum fee in BDT" type="number" min="0" value={maximumFee} onChange={(event) => setMaximumFee(event.target.value)} placeholder="Maximum fee (BDT)" className="h-11" />
        <button onClick={reset} disabled={!active} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#dce5de] px-4 text-sm font-medium hover:bg-[#eff3ef] disabled:opacity-40"><X className="size-4" />Clear</button>
      </div><div className="mt-4 flex flex-wrap gap-2"><button onClick={downloadWord} className="inline-flex items-center gap-2 rounded-lg bg-[#0b6b4f] px-4 py-2 text-sm font-semibold text-white"><Download className="size-4" />Download Word</button><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-[#b9c9bd] bg-white px-4 py-2 text-sm font-semibold"><Printer className="size-4" />Save as PDF</button><span className="inline-flex items-center gap-2 px-2 text-xs text-[#66736d]"><FileText className="size-4" />Downloads include the current filtered results.</span></div></div>
      <div className="overflow-x-auto rounded-2xl border border-[#dce5de] bg-white shadow-[0_14px_35px_rgba(22,37,31,0.05)]"><table className="w-full min-w-[1000px] border-collapse text-left text-sm"><thead className="bg-[#e7efe9] text-xs uppercase tracking-wide text-[#335247]"><tr><th className="px-4 py-3">No.</th><th className="px-4 py-3">University</th><th className="px-4 py-3">Course name</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Country</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Fee</th></tr></thead><tbody>{results.map((program, index) => <tr key={program.id} className="border-t border-[#e7efe9] align-top hover:bg-[#f8faf8]"><td className="px-4 py-3 text-[#66736d]">{index + 1}</td><td className="px-4 py-3 font-semibold">{program.university || '—'}</td><td className="px-4 py-3">{program.program || '—'}</td><td className="px-4 py-3">{cityFor(program)}</td><td className="px-4 py-3">{program.country || '—'}</td><td className="px-4 py-3">{program.duration || '—'}</td><td className="px-4 py-3">{program.level || '—'}</td><td className="whitespace-nowrap px-4 py-3 font-semibold text-[#0b6b4f]">{feeFor(program)}</td></tr>)}</tbody></table>{results.length === 0 && <div className="p-12 text-center"><p className="font-semibold">No programmes match these filters.</p><button onClick={reset} className="no-print mt-4 text-sm font-semibold text-[#0b6b4f] underline">Reset filters</button></div>}</div>
      <p className="mt-5 text-xs leading-5 text-[#66736d]">Fees and programme details should be confirmed against their source documents before advising a student.</p>
    </section>
  </main>;
}
