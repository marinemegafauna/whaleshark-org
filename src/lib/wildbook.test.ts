import { describe, expect, test, vi } from 'vitest';
import { login, resolveMedia, searchEncounters } from './wildbook';

describe('Wildbook client', () => {
  test('parses flat encounter hits and total from the response header', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ hits: [{ id: '2fca3548' }] }), {
        headers: { 'Content-Type': 'application/json', 'X-Wildbook-Total-Hits': '63' },
      }),
    );

    const result = await searchEncounters(
      'JSESSIONID=session',
      { locationIds: ['Tofo'], taxonomy: 'Rhincodon typus', from: 0, size: 20 },
      fetcher,
    );

    expect(result).toEqual({ hits: [{ id: '2fca3548' }], total: 63 });
    const init = fetcher.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toMatchObject({ from: 0, size: 20 });
  });

  test('keeps media status branches intact and only identified items need images', async () => {
    const media = [
      { annotationId: 'a1', status: 'identified', imageUrl: '/image/1.jpg' },
      { annotationId: 'a2', status: 'unidentified', imageUrl: '/image/2.jpg' },
      { annotationId: 'a3', status: 'no_image' },
      { annotationId: 'a4', status: 'unavailable' },
      { annotationId: 'a5', status: 'error' },
    ];
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(media));

    await expect(resolveMedia('JSESSIONID=session', media.map((item) => item.annotationId), fetcher)).resolves.toEqual(media);
  });

  test('rejects an identified media entry without an image URL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([{ annotationId: 'a1', status: 'identified' }]));

    await expect(resolveMedia('JSESSIONID=session', ['a1'], fetcher)).rejects.toThrow(/imageUrl/i);
  });

  test('extracts JSESSIONID from login Set-Cookie', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ username: 'clare', displayName: 'Clare Prebble' }), {
        headers: { 'Set-Cookie': 'JSESSIONID=abc123; Path=/; HttpOnly; SameSite=Lax' },
      }),
    );

    await expect(login('clare', 'secret', fetcher)).resolves.toEqual({
      cookie: 'JSESSIONID=abc123',
      user: { username: 'clare', displayName: 'Clare Prebble' },
    });
  });
});
