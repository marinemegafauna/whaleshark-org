export function isMockMode(): boolean {
  const configured = import.meta.env.MOCK;
  return configured === '1' || (configured === undefined && import.meta.env.DEV);
}

export function publicWriteMode(): 'dry-run' | 'live' {
  return import.meta.env.PUBLIC_WRITE === 'live' ? 'live' : 'dry-run';
}
