'use client';

import {
  AsciiAurora,
  AsciiFireworks,
  AsciiGalaxy,
  AsciiGlobe,
  AsciiJellyfish,
  AsciiKoi,
  AsciiLava,
} from '@lilt-ui/registry';
import { HomeTile } from './home-tile';

/** A gallery of live scenes, each a doorway to its page. Off screen they rest. */
export function HomeScenes() {
  return (
    <div className="lilt-bento" data-layout="scenes">
      <HomeTile area="globe" href="/ascii/globe" name="Globe" hint="Lean it with the pointer">
        <AsciiGlobe cellSize={11} />
      </HomeTile>
      <HomeTile area="koi" href="/ascii/koi" name="Koi pond" hint="Hold still and they drift over">
        <AsciiKoi />
      </HomeTile>
      <HomeTile
        area="jelly"
        href="/ascii/jellyfish"
        name="Jellyfish"
        hint="Your pointer is a current"
      >
        <AsciiJellyfish count={2} />
      </HomeTile>
      <HomeTile area="lava" href="/ascii/lava-lamp" name="Lava lamp" hint="Warm the wax">
        <AsciiLava />
      </HomeTile>
      <HomeTile area="galaxy" href="/ascii/galaxy" name="Galaxy" hint="Tilt it toward you">
        <AsciiGalaxy />
      </HomeTile>
      <HomeTile area="aurora" href="/ascii/aurora" name="Aurora" hint="Lift the curtain of light">
        <AsciiAurora />
      </HomeTile>
      <HomeTile
        area="fireworks"
        href="/ascii/fireworks"
        name="Fireworks"
        hint="Sparks glitter near you"
      >
        <AsciiFireworks />
      </HomeTile>
    </div>
  );
}
