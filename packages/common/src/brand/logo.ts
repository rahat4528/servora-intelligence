import { brandTokens } from './tokens';

/**
 * Geometric S Logo SVG Paths & Markup Generator
 * Complies with Servora Intelligence Master Prompt Section 17.
 *
 * S-Geometry:
 * Two offset geometric halves that interlock, separated by a thin gap.
 * Upper half: Blue gradient (#4DB8FF -> #2F8CFF)
 * Lower half: Violet gradient (#5B3CF0 -> #7C5CFF)
 * Thick, flat-ended horizontal bars joined by smooth quarter-circle curves.
 * Crisp, flat edges with no drop-shadows or 3D effects.
 */

// Upper half path (Starts top right, wraps counter-clockwise into the center hook)
export const UPPER_HALF_PATH = `
  M 88 16
  L 44 16
  A 26 26 0 0 0 18 42
  L 18 45
  A 8 8 0 0 0 26 53
  L 66 53
  A 4 4 0 0 0 70 49
  L 70 45
  A 4 4 0 0 0 66 41
  L 44 41
  A 10 10 0 0 1 34 31
  L 34 30
  A 10 10 0 0 1 44 20
  L 88 20
  Z
`.replace(/\s+/g, ' ').trim();

// Lower half path (Starts bottom left, wraps counter-clockwise into the center hook, rotational inverse)
export const LOWER_HALF_PATH = `
  M 12 84
  L 56 84
  A 26 26 0 0 0 82 58
  L 82 55
  A 8 8 0 0 0 74 47
  L 34 47
  A 4 4 0 0 0 30 51
  L 30 55
  A 4 4 0 0 0 34 59
  L 56 59
  A 10 10 0 0 1 66 69
  L 66 70
  A 10 10 0 0 1 56 80
  L 12 80
  Z
`.replace(/\s+/g, ' ').trim();

export interface LogoOptions {
  size?: number | string;
  variant?: 'color-light' | 'color-dark' | 'monochrome-dark' | 'monochrome-light';
  className?: string;
  idSuffix?: string;
}

export function generateLogoSvg(options: LogoOptions = {}): string {
  const {
    size = 100,
    variant = 'color-light',
    className = '',
    idSuffix = '1',
  } = options;

  const blueGradId = `servora-blue-grad-${idSuffix}`;
  const violetGradId = `servora-violet-grad-${idSuffix}`;

  let upperFill = `url(#${blueGradId})`;
  let lowerFill = `url(#${violetGradId})`;

  if (variant === 'monochrome-dark') {
    upperFill = brandTokens.colors.monochromeDark;
    lowerFill = brandTokens.colors.monochromeDark;
  } else if (variant === 'monochrome-light') {
    upperFill = brandTokens.colors.monochromeLight;
    lowerFill = brandTokens.colors.monochromeLight;
  }

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 100 100"
  width="${size}"
  height="${size}"
  class="${className}"
  role="img"
  aria-label="Servora Intelligence logo"
>
  <defs>
    <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${brandTokens.colors.blueGradient.from}" />
      <stop offset="100%" stop-color="${brandTokens.colors.blueGradient.to}" />
    </linearGradient>
    <linearGradient id="${violetGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${brandTokens.colors.violetGradient.from}" />
      <stop offset="100%" stop-color="${brandTokens.colors.violetGradient.to}" />
    </linearGradient>
  </defs>
  <!-- Upper Half (Interlocking Geometric Hook) -->
  <path d="${UPPER_HALF_PATH}" fill="${upperFill}" />
  <!-- Lower Half (Interlocking Geometric Hook) -->
  <path d="${LOWER_HALF_PATH}" fill="${lowerFill}" />
</svg>
`.trim();
}

export function generateLockupSvg(options: LogoOptions & { textColor?: string } = {}): string {
  const {
    size = 40,
    variant = 'color-light',
    className = '',
    idSuffix = 'lockup',
    textColor = variant === 'color-dark' || variant === 'monochrome-light' ? '#FFFFFF' : '#0F172A',
  } = options;

  const blueGradId = `servora-blue-grad-${idSuffix}`;
  const violetGradId = `servora-violet-grad-${idSuffix}`;

  let upperFill = `url(#${blueGradId})`;
  let lowerFill = `url(#${violetGradId})`;

  if (variant === 'monochrome-dark') {
    upperFill = brandTokens.colors.monochromeDark;
    lowerFill = brandTokens.colors.monochromeDark;
  } else if (variant === 'monochrome-light') {
    upperFill = brandTokens.colors.monochromeLight;
    lowerFill = brandTokens.colors.monochromeLight;
  }

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 380 90"
  height="${size}"
  class="${className}"
  role="img"
  aria-label="Servora Intelligence lockup logo"
>
  <defs>
    <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${brandTokens.colors.blueGradient.from}" />
      <stop offset="100%" stop-color="${brandTokens.colors.blueGradient.to}" />
    </linearGradient>
    <linearGradient id="${violetGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${brandTokens.colors.violetGradient.from}" />
      <stop offset="100%" stop-color="${brandTokens.colors.violetGradient.to}" />
    </linearGradient>
  </defs>
  <!-- Mark icon scaled inside lockup -->
  <g transform="translate(0, -5)">
    <path d="${UPPER_HALF_PATH}" fill="${upperFill}" />
    <path d="${LOWER_HALF_PATH}" fill="${lowerFill}" />
  </g>
  <!-- Wordmark -->
  <text
    x="105"
    y="46"
    font-family="Inter, system-ui, -apple-system, sans-serif"
    font-weight="700"
    font-size="28"
    letter-spacing="-0.03em"
    fill="${textColor}"
  >Servora</text>
  <text
    x="215"
    y="46"
    font-family="Inter, system-ui, -apple-system, sans-serif"
    font-weight="400"
    font-size="28"
    letter-spacing="-0.02em"
    fill="${textColor}"
    opacity="0.85"
  >Intelligence</text>
  <text
    x="107"
    y="66"
    font-family="Inter, system-ui, -apple-system, sans-serif"
    font-weight="500"
    font-size="11"
    letter-spacing="0.12em"
    fill="${textColor}"
    opacity="0.5"
  >AI SUPPORT &amp; OPERATIONS PLATFORM</text>
</svg>
`.trim();
}

