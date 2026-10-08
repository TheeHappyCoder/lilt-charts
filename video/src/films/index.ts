import type { ComponentType } from 'react';
import { CoolFilm } from './cool';
import { Cool2Film } from './cool2';
import { DepthFilm } from './depth';
import { LooksFilm } from './looks';
import { OpenSourceAnnouncement } from '../stills/open-source';

/** Every film, by the name `render.mjs --film=<name>` and `?film=<name>` use. */
export const films: Record<string, ComponentType> = {
  cool: CoolFilm,
  cool2: Cool2Film,
  depth: DepthFilm,
  looks: LooksFilm,
  'open-source': OpenSourceAnnouncement,
};
