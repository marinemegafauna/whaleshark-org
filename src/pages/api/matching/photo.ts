import type { APIRoute } from 'astro';
import { safeMatchingPhotoUrl } from '../../../lib/match-service';
export const GET: APIRoute = async ({url}) => {
  const target = safeMatchingPhotoUrl(url.searchParams.get('u') ?? '');
  if (!target) return Response.json({error:'invalid_photo_url'},{status:400});
  try {
    const upstream = await fetch(target,{redirect:'manual'});
    const type = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !type.toLowerCase().startsWith('image/')) return Response.json({error:'photo_unavailable'},{status:502});
    return new Response(upstream.body,{headers:{'Content-Type':type,'Cache-Control':'private, max-age=604800','X-Content-Type-Options':'nosniff'}});
  } catch { return Response.json({error:'photo_unavailable'},{status:502}); }
};
