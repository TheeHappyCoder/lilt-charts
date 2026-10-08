import GithubIcon from '@hugeicons/core-free-icons/GithubIcon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { ChartCard } from '@lilt-ui/charts';
import { GITHUB_URL, type GitHubStars as Stars } from '@/lib/github-stars';
import './github-stars.css';

const count = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** One repository link in the frame and beside the home page's download card. */
export function GitHubStars({
  stars,
  variant = 'compact',
}: {
  stars: Stars | null;
  variant?: 'compact' | 'card';
}) {
  const label = stars
    ? `${count.format(stars.total)} GitHub ${stars.total === 1 ? 'star' : 'stars'}. View Lilt Charts on GitHub`
    : 'View Lilt Charts on GitHub';
  const link = (
    <a
      className="lilt-github-stars"
      data-variant={variant}
      href={GITHUB_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
    >
      <span className="lilt-github-stars__heading">
        <Icon icon={GithubIcon} size={variant === 'card' ? 20 : 16} aria-hidden="true" />
        {variant === 'card' ? <span>GitHub stars</span> : null}
      </span>
      {stars || variant === 'card' ? (
        <span className="lilt-github-stars__total">
          {stars ? (variant === 'card' ? count : compact).format(stars.total) : '—'}
        </span>
      ) : null}
      <span className="lilt-github-stars__caption">
        {variant === 'card' ? 'View on GitHub ↗' : stars ? 'stars' : 'GitHub'}
      </span>
    </a>
  );
  return variant === 'card' ? <ChartCard className="lilt-github-card">{link}</ChartCard> : link;
}
