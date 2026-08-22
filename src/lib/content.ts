import { getEntry } from 'astro:content';
import type { PageCopyFor, PageId, SiteContent } from './content-schema';
export { fillTemplate } from './content-utils';

export async function getPageCopy<T extends PageId>(id: T): Promise<PageCopyFor<T>> {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`Missing page content: ${id}`);
  if (entry.data.page !== id) throw new Error(`Page content id mismatch: requested ${id}, received ${entry.data.page}`);
  return entry.data as PageCopyFor<T>;
}

export async function getSiteCopy(): Promise<SiteContent> {
  const entry = await getEntry('site', 'site');
  if (!entry) throw new Error('Missing site content: site');
  return entry.data;
}
