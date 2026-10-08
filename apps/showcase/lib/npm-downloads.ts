/** Downloads of the published package, from npm's public download counts. */
const PACKAGE = '@lilt-ui/charts';
/** How often the home page asks npm again, in seconds. */
export const DOWNLOADS_REVALIDATE = 21_600;

export interface DownloadDay {
  /** The day, as an ISO date (YYYY-MM-DD), so it crosses to the client as plain data. */
  day: string;
  downloads: number;
  /** Downloads in the fetched window up to and including this day. */
  total: number;
}

export interface Downloads {
  days: DownloadDay[];
  total: number;
  /** The first day with a download in npm's rolling one-year window. */
  since: string;
}

/**
 * The running total in npm's rolling one-year window, one row a day. npm reports behind, and days
 * before the first download in the window are left out. Any failure returns null
 * and the home page simply leaves the card out.
 */
export async function getDownloads(): Promise<Downloads | null> {
  try {
    const response = await fetch(`https://api.npmjs.org/downloads/range/last-year/${PACKAGE}`, {
      next: { revalidate: DOWNLOADS_REVALIDATE },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { downloads?: { day: string; downloads: number }[] };
    const all = body.downloads ?? [];
    const first = all.findIndex((entry) => entry.downloads > 0);
    if (first < 0) return null;
    let total = 0;
    const days = all.slice(first).map((entry) => {
      total += entry.downloads;
      return { day: entry.day, downloads: entry.downloads, total };
    });
    return { days, total, since: days[0]!.day };
  } catch {
    return null;
  }
}
