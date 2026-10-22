// Vector "lilt" wordmark. Colors come from the --lilt-logo-* tokens in studio.css.
const WORDMARK =
  'M31 65.5A39.5 39.5 0 0 1 110 65.5L110 255C110 278 130 294 148 294C172 294 214 262 214 222L214 184A35.5 35.5 0 0 1 285 184L285 292Q285 302 277 303L268 305C260 306.5 255 309 250 314L236 331C210 358 180 370.5 143 370.5A112 112 0 0 1 31 258.5ZM312.5 62.5Q312.5 58.5 316.5 58.5L374.5 58.5Q378.5 58.5 378.5 62.5L378.5 353Q378.5 357 374.5 357L316.5 357Q312.5 357 312.5 353ZM416 63Q416 59 420 59L478.5 59Q482.5 59 482.5 63L482.5 133.5L547.5 133.5Q551.5 133.5 551.5 137.5L551.5 185.5Q551.5 189.5 547.5 189.5L482.5 189.5L482.5 280C482.5 296 490 306.5 506 306.5L536 306.5Q543 306.5 546.5 312L564 341Q568 348 562 353.5C548 366 530 372 508 372C455 372 416 330 416 270Z';
const DOT = 'M285.3 94A35.3 35.3 0 1 1 214.7 94A35.3 35.3 0 1 1 285.3 94Z';

export function LiltLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Lilt UI"
      className={className}
      role="img"
      viewBox="26 20 545 356"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path className="lilt-logo__ink" d={WORDMARK} />
      <path className="lilt-logo__dot" d={DOT} />
    </svg>
  );
}
