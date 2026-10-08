import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGitHubStars, GITHUB_REPOSITORY } from './github-stars';

const repository = { full_name: GITHUB_REPOSITORY, private: false, stargazers_count: 42 };

afterEach(() => vi.unstubAllGlobals());

describe('GitHub star counts', () => {
  it.each([0, 1, 12345])(
    'keeps a real count of %i, including the new repository’s zero',
    async (total) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(Response.json({ ...repository, stargazers_count: total })),
      );
      expect(await getGitHubStars()).toEqual({ total });
    },
  );

  it.each([403, 404, 429, 500])(
    'does not turn an HTTP %i response into zero stars',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
      expect(await getGitHubStars()).toBeNull();
    },
  );

  it('leaves a network failure unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));
    expect(await getGitHubStars()).toBeNull();
  });

  it.each([
    null,
    {},
    { ...repository, private: true },
    { ...repository, full_name: 'TheeHappyCoder/lilt-charts-private-archive' },
    { ...repository, stargazers_count: '42' },
    { ...repository, stargazers_count: -1 },
    { ...repository, stargazers_count: 1.5 },
  ])('rejects malformed, private, or redirected archive metadata: %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));
    expect(await getGitHubStars()).toBeNull();
  });
});
