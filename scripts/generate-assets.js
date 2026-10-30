const fs = require('fs');
const path = require('path');

const brandDir = path.join(__dirname, '..', 'frontend', 'public', 'brand');
if (!fs.existsSync(brandDir)) {
  fs.mkdirSync(brandDir, { recursive: true });
}

// Brand Tokens
const blueFrom = '#4DB8FF';
const blueTo = '#2F8CFF';
const violetFrom = '#5B3CF0';
const violetTo = '#7C5CFF';
const slate900 = '#0F172A';
const slate50 = '#F8FAFC';

// Interlocking S Geometry
const UPPER_HALF_PATH = 'M 88 16 L 44 16 A 26 26 0 0 0 18 42 L 18 45 A 8 8 0 0 0 26 53 L 66 53 A 4 4 0 0 0 70 49 L 70 45 A 4 4 0 0 0 66 41 L 44 41 A 10 10 0 0 1 34 31 L 34 30 A 10 10 0 0 1 44 20 L 88 20 Z';
const LOWER_HALF_PATH = 'M 12 84 L 56 84 A 26 26 0 0 0 82 58 L 82 55 A 8 8 0 0 0 74 47 L 34 47 A 4 4 0 0 0 30 51 L 30 55 A 4 4 0 0 0 34 59 L 56 59 A 10 10 0 0 1 66 69 L 66 70 A 10 10 0 0 1 56 80 L 12 80 Z';

// 1. Full-Color Logo (Light background)
const logoLightSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Servora Intelligence logo">
  <defs>
    <linearGradient id="servora-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${blueFrom}" />
      <stop offset="100%" stop-color="${blueTo}" />
    </linearGradient>
    <linearGradient id="servora-violet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${violetFrom}" />
      <stop offset="100%" stop-color="${violetTo}" />
    </linearGradient>
  </defs>
  <path d="${UPPER_HALF_PATH}" fill="url(#servora-blue-grad)" />
  <path d="${LOWER_HALF_PATH}" fill="url(#servora-violet-grad)" />
</svg>`;

// 2. Full-Color Logo (Dark background)
const logoDarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Servora Intelligence logo">
  <defs>
    <linearGradient id="servora-blue-grad-dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${blueFrom}" />
      <stop offset="100%" stop-color="${blueTo}" />
    </linearGradient>
    <linearGradient id="servora-violet-grad-dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${violetFrom}" />
      <stop offset="100%" stop-color="${violetTo}" />
    </linearGradient>
  </defs>
  <path d="${UPPER_HALF_PATH}" fill="url(#servora-blue-grad-dark)" />
  <path d="${LOWER_HALF_PATH}" fill="url(#servora-violet-grad-dark)" />
</svg>`;

// 3. Monochrome Logo (Dark)
const logoMonochromeDarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Servora Intelligence logo">
  <path d="${UPPER_HALF_PATH}" fill="${slate900}" />
  <path d="${LOWER_HALF_PATH}" fill="${slate900}" />
</svg>`;

// 4. Monochrome Logo (Light)
const logoMonochromeLightSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Servora Intelligence logo">
  <path d="${UPPER_HALF_PATH}" fill="${slate50}" />
  <path d="${LOWER_HALF_PATH}" fill="${slate50}" />
</svg>`;

// 5. Horizontal Lockup (Light)
const lockupLightSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 90" width="420" height="90" role="img" aria-label="Servora Intelligence lockup logo">
  <defs>
    <linearGradient id="servora-lockup-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${blueFrom}" />
      <stop offset="100%" stop-color="${blueTo}" />
    </linearGradient>
    <linearGradient id="servora-lockup-violet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${violetFrom}" />
      <stop offset="100%" stop-color="${violetTo}" />
    </linearGradient>
  </defs>
  <g transform="translate(0, -5)">
    <path d="${UPPER_HALF_PATH}" fill="url(#servora-lockup-blue)" />
    <path d="${LOWER_HALF_PATH}" fill="url(#servora-lockup-violet)" />
  </g>
  <text x="105" y="46" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="700" font-size="28" letter-spacing="-0.03em" fill="${slate900}">Servora</text>
  <text x="215" y="46" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="400" font-size="28" letter-spacing="-0.02em" fill="${slate900}" opacity="0.85">Intelligence</text>
  <text x="107" y="66" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="500" font-size="10.5" letter-spacing="0.12em" fill="${slate900}" opacity="0.5">AI SUPPORT &amp; OPERATIONS PLATFORM</text>
</svg>`;

// 6. Horizontal Lockup (Dark)
const lockupDarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 90" width="420" height="90" role="img" aria-label="Servora Intelligence lockup logo">
  <defs>
    <linearGradient id="servora-lockup-blue-dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${blueFrom}" />
      <stop offset="100%" stop-color="${blueTo}" />
    </linearGradient>
    <linearGradient id="servora-lockup-violet-dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${violetFrom}" />
      <stop offset="100%" stop-color="${violetTo}" />
    </linearGradient>
  </defs>
  <g transform="translate(0, -5)">
    <path d="${UPPER_HALF_PATH}" fill="url(#servora-lockup-blue-dark)" />
    <path d="${LOWER_HALF_PATH}" fill="url(#servora-lockup-violet-dark)" />
  </g>
  <text x="105" y="46" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="700" font-size="28" letter-spacing="-0.03em" fill="#FFFFFF">Servora</text>
  <text x="215" y="46" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="400" font-size="28" letter-spacing="-0.02em" fill="#FFFFFF" opacity="0.85">Intelligence</text>
  <text x="107" y="66" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="500" font-size="10.5" letter-spacing="0.12em" fill="#CBD5E1">AI SUPPORT &amp; OPERATIONS PLATFORM</text>
</svg>`;

// Write all assets
fs.writeFileSync(path.join(brandDir, 'servora-logo.svg'), logoLightSvg);
fs.writeFileSync(path.join(brandDir, 'servora-logo-dark.svg'), logoDarkSvg);
fs.writeFileSync(path.join(brandDir, 'servora-logo-monochrome.svg'), logoMonochromeDarkSvg);
fs.writeFileSync(path.join(brandDir, 'servora-logo-monochrome-light.svg'), logoMonochromeLightSvg);
fs.writeFileSync(path.join(brandDir, 'servora-lockup.svg'), lockupLightSvg);
fs.writeFileSync(path.join(brandDir, 'servora-lockup-dark.svg'), lockupDarkSvg);

// Favicon SVG in public/
const publicDir = path.join(__dirname, '..', 'frontend', 'public');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), logoLightSvg);

console.log('Brand SVG assets generated successfully in frontend/public/brand/ and frontend/public/favicon.svg');

