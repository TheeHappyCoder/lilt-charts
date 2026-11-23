'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { ProfilePhoto, type ProfilePhotoHandle } from '../profile-photo';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The docs stage's profile photo: no photo yet, a sample to try when you have none to hand, and a
 * save that takes a moment, like a real upload. `open` starts it in the cropper on the sample, for
 * places that show it rather than hand it over, such as the wall's featured panel.
 */
export function ProfilePhotoDemo({
  name = 'Nora Vance',
  sample = '/samples/portrait.jpg',
  open = false,
  style,
}: {
  name?: string;
  sample?: string;
  open?: boolean;
  style?: CSSProperties;
}) {
  const photo = useRef<ProfilePhotoHandle>(null);

  useEffect(() => {
    if (open) photo.current?.edit(sample);
  }, [open, sample]);

  return (
    <div
      style={{
        display: 'grid',
        justifyItems: 'center',
        gap: 14,
        width: 'min(560px, 100%)',
        ...style,
      }}
    >
      <ProfilePhoto ref={photo} name={name} onSave={() => wait(1100)} onRemove={() => undefined} />
      {open ? null : (
        <button
          type="button"
          onClick={() => photo.current?.edit(sample)}
          style={{
            padding: '4px 6px',
            border: 0,
            background: 'none',
            color: 'color-mix(in srgb, currentColor 62%, transparent)',
            font: 'inherit',
            fontSize: 13,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: 'pointer',
          }}
        >
          No photo to hand? Try a sample
        </button>
      )}
    </div>
  );
}
