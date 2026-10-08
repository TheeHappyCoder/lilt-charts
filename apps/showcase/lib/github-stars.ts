export const GITHUB_REPOSITORY = 'TheeHappyCoder/lilt-charts';
export const GITHUB_URL = `https://github.com/${GITHUB_REPOSITORY}`;
const REVALIDATE = 21_600;

export interface GitHubStars {
  total: number;
}

/** Public repository metadata only. An unavailable count is never reported as zero. */
export async function getGitHubStars(): Promise<GitHubStars | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('private' in body) ||
      body.private !== false ||
      !('full_name' in body) ||
      typeof body.full_name !== 'string' ||
      body.full_name.toLowerCase() !== GITHUB_REPOSITORY.toLowerCase() ||
      !('stargazers_count' in body) ||
      typeof body.stargazers_count !== 'number' ||
      !Number.isSafeInteger(body.stargazers_count) ||
      body.stargazers_count < 0
    ) {
      return null;
    }
    return { total: body.stargazers_count };
  } catch {
    return null;
  }
}
