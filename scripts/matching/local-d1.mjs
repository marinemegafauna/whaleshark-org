import { spawnSync } from 'node:child_process';
export function wrangler(args, json = false) {
  const result = spawnSync('npx',['--no-install','wrangler','d1',...args],{encoding:'utf8',env:{...process.env,CI:'true'},stdio:json ? 'pipe' : 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Local D1 command failed (${result.status})${json ? `: ${result.stderr}` : ''}`);
  return json ? JSON.parse(result.stdout) : undefined;
}
export function query(sql) {
  const output = wrangler(['execute','whaleshark-org','--local','--json','--command',sql],true);
  return output.flatMap(r=>r.results ?? []);
}
