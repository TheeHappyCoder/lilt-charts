import { SkylineCard } from '@lilt-ui/charts';
import { LiltLogo } from '../../../apps/showcase/components/shell/logo';
import { yearContributions } from '../films/cool-data';
import './open-source.css';

const contributions = yearContributions.slice(-91);

/** A still composition, exported with the film renderer's --stills option. */
export function OpenSourceAnnouncement() {
  return (
    <main className="lilt-announcement" data-theme="dark">
      <LiltLogo className="lilt-announcement__logo" />
      <div className="lilt-announcement__copy">
        <h1>
          We’re going
          <br />
          <span>open source.</span>
        </h1>
        <p>React chart cards with feeling.</p>
      </div>
      <div className="lilt-announcement__skyline" aria-hidden="true">
        <SkylineCard
          data={contributions}
          date="date"
          value="commits"
          from={contributions[0]!.date}
          to="2026-10-07"
          today="2026-10-07"
          height={400}
          rise={5}
          header={false}
          surface="ghost"
          color="#9d81ff"
          motion="none"
          aria-label="Illustrative contribution skyline"
        />
      </div>
      <footer className="lilt-announcement__footer">
        <span>The next chapter of Lilt Charts.</span>
        <span>liltui.vercel.app</span>
      </footer>
    </main>
  );
}
