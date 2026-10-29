import { getProgramPage } from '@/lib/airtable';

type CloudflareCacheStorage = CacheStorage & { default: Cache };

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
  'Cloudflare-CDN-Cache-Control': 'public, max-age=86400',
  'CDN-Cache-Control': 'public, max-age=86400',
};

export async function GET(request: Request) {
  const edgeCache = (globalThis.caches as CloudflareCacheStorage | undefined)?.default;
  const cacheKey = new Request(request.url, { method: 'GET' });

  try {
    const cached = await edgeCache?.match(cacheKey);
    if (cached) return cached;

    const offset = new URL(request.url).searchParams.get('offset') || undefined;
    const response = Response.json(await getProgramPage(offset), { headers: CACHE_HEADERS });
    await edgeCache?.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load programmes.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
