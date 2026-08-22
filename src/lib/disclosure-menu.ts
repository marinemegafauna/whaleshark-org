export function initDisclosureMenu(trigger: HTMLElement, menu: HTMLElement) {
  const setOpen = (open: boolean) => {
    trigger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  };

  const close = () => setOpen(false);

  trigger.addEventListener('click', () => {
    setOpen(trigger.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', close);
  close();

  return { close };
}
