/**
 * The site scrolls inside the shell's ScrollArea, not the window, so its scrollbar is the kit's
 * own. Anything that follows the page's scroll listens to this element.
 */
export const PAGE_SCROLL_ID = 'lilt-page-scroll';

export const pageScroller = () => document.getElementById(PAGE_SCROLL_ID);
