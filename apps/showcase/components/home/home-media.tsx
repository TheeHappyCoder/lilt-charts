'use client';

import { AsciiImage, AsciiModel, AsciiTransition } from '@lilt-ui/registry';
import { useState } from 'react';
import { HomeTile } from './home-tile';

const SHAPES = [
  { value: 'torus', label: 'Torus', color: '#8b6cff' },
  { value: 'knot', label: 'Knot', color: '#e5489c' },
  { value: 'icosahedron', label: 'Icosahedron', color: '#3cc9a8' },
  { value: 'cube', label: 'Cube', color: '#f0a93a' },
  { value: 'sphere', label: 'Sphere', color: '#4f9cff' },
] as const;

type Shape = (typeof SHAPES)[number]['value'];

/**
 * Pictures from geometry and pixels: a lit solid that turns, leans toward the pointer and spins
 * when clicked, changing shape behind a curtain of type; and an image drawn in type beside it.
 */
export function HomeMedia() {
  const [shape, setShape] = useState<Shape>('torus');
  const current = SHAPES.find((item) => item.value === shape)!;
  const choices = (
    <span className="lilt-tile__choices" role="radiogroup" aria-label="Shape">
      {SHAPES.map((item) => (
        <button
          key={item.value}
          type="button"
          role="radio"
          aria-checked={item.value === shape}
          className="lilt-tile__choice"
          style={{ '--choice': item.color } as React.CSSProperties}
          onClick={() => setShape(item.value)}
        >
          <span aria-hidden="true" />
          {item.label}
        </button>
      ))}
    </span>
  );
  return (
    <div className="lilt-bento" data-layout="media">
      <HomeTile
        area="model"
        href="/ascii/model"
        name="3D model"
        hint="Lit, turning, and yours to spin"
        controls={choices}
      >
        <AsciiTransition
          id={shape}
          direction="radial"
          duration={0.8}
          color={current.color}
          style={{ position: 'absolute', inset: 0 }}
        >
          <AsciiModel
            shape={shape}
            color={current.color}
            size={0.86}
            cellSize={11}
            label={`A ${current.label.toLowerCase()} drawn in lit blocks of type, turning slowly`}
          />
        </AsciiTransition>
      </HomeTile>
      <HomeTile area="image" href="/ascii/image" name="Image" hint="Any picture, in type">
        <AsciiImage cellSize={7} />
      </HomeTile>
    </div>
  );
}
