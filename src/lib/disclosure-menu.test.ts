import { describe, expect, it } from 'vitest';
import { initDisclosureMenu } from './disclosure-menu';

class FakeElement extends EventTarget {
  hidden = true;
  private attributes = new Map<string, string>();

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

describe('initDisclosureMenu', () => {
  it('opens and closes a menu while keeping aria-expanded in sync', () => {
    const trigger = new FakeElement();
    const menu = new FakeElement();
    trigger.setAttribute('aria-expanded', 'false');

    initDisclosureMenu(trigger as unknown as HTMLElement, menu as unknown as HTMLElement);
    trigger.dispatchEvent(new Event('click'));

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(menu.hidden).toBe(false);

    trigger.dispatchEvent(new Event('click'));

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(menu.hidden).toBe(true);
  });

  it('closes an open menu after one of its links is selected', () => {
    const trigger = new FakeElement();
    const menu = new FakeElement();
    trigger.setAttribute('aria-expanded', 'false');

    initDisclosureMenu(trigger as unknown as HTMLElement, menu as unknown as HTMLElement);
    trigger.dispatchEvent(new Event('click'));
    menu.dispatchEvent(new Event('click'));

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(menu.hidden).toBe(true);
  });
});
