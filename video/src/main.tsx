import { createRoot } from 'react-dom/client';
import '@lilt-ui/charts/styles.css';
import './kit/film.css';
import { films } from './films';
import { film } from './kit/runtime';
import './kit/stage';

const params = new URLSearchParams(location.search);
const name = params.get('film') ?? 'depth';
const Film = films[name];
if (!Film) throw new Error(`No film named "${name}". Films: ${Object.keys(films).join(', ')}`);

createRoot(document.getElementById('root')!).render(<Film />);
film.ready = true;

// `?play` (optionally `?play=9000` to start there) runs the film in real time for a live preview.
const play = params.get('play');
if (play !== null) void document.fonts.ready.then(() => film.start(Number(play) || 0));
