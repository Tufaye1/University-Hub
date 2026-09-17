import { getProgramPage } from '@/lib/airtable';

export async function GET(request: Request) {
  try {
    const offset = new URL(request.url).searchParams.get('offset') || undefined;
    return Response.json(await getProgramPage(offset), { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to load programmes.' }, { status: 500 });
  }
}
