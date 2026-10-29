import { getProgramPage } from '@/lib/airtable';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
  'Cloudflare-CDN-Cache-Control': 'public, max-age=3600',
  'CDN-Cache-Control': 'public, max-age=3600',
};

export async function GET(request: Request) {
  try {
    const offset = new URL(request.url).searchParams.get('offset') || undefined;
    return Response.json(await getProgramPage(offset), { headers: CACHE_HEADERS });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load programmes.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
