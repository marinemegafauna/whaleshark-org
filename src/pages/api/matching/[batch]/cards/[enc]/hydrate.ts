import type { APIRoute } from 'astro';
import { matchingStore } from '../../../../../../lib/runtime';
import { loadMatchingCard } from '../../../../../../lib/match-service';
import { isWildbookUnauthorized } from '../../../../../../lib/wildbook';
export const POST: APIRoute = async ({params,locals,url,cookies}) => {
  const store = matchingStore(locals), card = await store.getCard(params.batch!,params.enc!);
  if (!card) return Response.json({ok:false,error:'not_found'},{status:404});
  try {
    const {data,unavailable} = await loadMatchingCard(store,params.batch!,card,locals.session?.wildbook_cookie ?? '',url.searchParams.has('refresh'));
    const photos = data.query.photos.length + Object.values(data.candidates).reduce((n,c)=>n+('sightings' in c ? c.sightings.reduce((m,s)=>m+s.photos.length,0) : 0),0);
    return Response.json({ok:!unavailable,photos,...(unavailable ? {error:'unavailable'} : {})},{status:unavailable ? 502 : 200});
  } catch (error) {
    if (!isWildbookUnauthorized(error)) throw error;
    cookies.delete('whaleshark_session',{path:'/'});
    return Response.json({ok:false,error:'expired'},{status:401});
  }
};
