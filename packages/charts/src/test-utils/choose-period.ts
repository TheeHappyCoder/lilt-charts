import { act } from 'react';

/** Opens a card's period select and picks a period by id, the way a reader would. */
export async function choosePeriod(host: HTMLElement, id: string) {
  const trigger = host.querySelector<HTMLButtonElement>('.lilt-range-select__trigger');
  if (!trigger) throw new Error('No period select in this card.');
  await act(async () => trigger.click());
  const option = host.querySelector<HTMLElement>(`[role="option"][data-value="${id}"]`);
  if (!option) throw new Error(`No period "${id}" in this card's select.`);
  await act(async () => option.click());
}

/** The id of the period a card's select currently shows. */
export function chosenPeriod(host: HTMLElement) {
  return host.querySelector('.lilt-card__range--select')?.getAttribute('data-value');
}
