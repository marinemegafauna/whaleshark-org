import type { APIRoute } from 'astro';
import { z } from 'zod';
import { matchingStore } from '../../../../lib/runtime';
import { isMockAppMode } from '../../../../lib/mode';
const inputSchema = z.object({query_enc:z.string().min(1),verdict:z.enum(['new','same','cant_tell','']),candidate_key:z.string().optional(),notes:z.string().max(20000).optional(),scar_notes:z.string().max(20000).optional()}).strict();
export const POST: APIRoute = async ({request,params,locals}) => {
  let json: unknown;
  try { json = await request.json(); } catch { return Response.json({error:'invalid_json'},{status:400}); }
  const parsed = inputSchema.safeParse(json);
  if (!parsed.success) return Response.json({error:'invalid_verdict'},{status:400});
  const input = parsed.data, store = matchingStore(locals), card = await store.getCard(params.batch!,input.query_enc);
  if (!card) return Response.json({error:'not_found'},{status:404});
  const candidate = input.verdict === 'same' ? card.candidates.find(c=>c.key===input.candidate_key) : null;
  if (input.verdict === 'same' && !candidate) return Response.json({error:'invalid_candidate'},{status:400});
  const reviewer = isMockAppMode() ? 'local' : locals.session!.username;
  const verdict = await store.setVerdict(params.batch!,input.query_enc,input.verdict ? {verdict:input.verdict,candidate_key:candidate?.key ?? null,candidate_label:candidate?.label ?? null,notes:input.notes ?? null,scar_notes:input.scar_notes ?? null,reviewer} : null,reviewer);
  return Response.json({ok:true,verdict});
};
