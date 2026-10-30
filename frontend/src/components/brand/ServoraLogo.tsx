import React from 'react';

// Exact vector geometry per Master Prompt Section 17 & ADR-005
const UPPER_HALF_PATH = 'M 88 16 L 44 16 A 26 26 0 0 0 18 42 L 18 45 A 8 8 0 0 0 26 53 L 66 53 A 4 4 0 0 0 70 49 L 70 45 A 4 4 0 0 0 66 41 L 44 41 A 10 10 0 0 1 34 31 L 34 30 A 10 10 0 0 1 44 20 L 88 20 Z';
const LOWER_HALF_PATH = 'M 12 84 L 56 84 A 26 26 0 0 0 82 58 L 82 55 A 8 8 0 0 0 74 47 L 34 47 A 4 4 0 0 0 30 51 L 30 55 A 4 4 0 0 0 34 59 L 56 59 A 10 10 0 0 1 66 69 L 66 70 A 10 10 0 0 1 56 80 L 12 80 Z';

export interface ServoraLogoProps {
  size?: number | string;
  variant?: 'color' | 'monochrome-dark' | 'monochrome-light' | 'lockup';
  className?: string;
  idSuffix?: string;
}

export const ServoraLogo: React.FC<ServoraLogoProps> = ({
  size = 48,
  variant = 'color',
  className = '',
  idSuffix = 'react',
}) => {
  const blueGradId = `servora-blue-grad-${idSuffix}`;
  const violetGradId = `servora-violet-grad-${idSuffix}`;

  if (variant === 'lockup') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          width={size}
          height={size}
          role="img"
          aria-label="Servora Intelligence logo mark"
          className="shrink-0 transition-transform duration-300 hover:scale-105"
        >
          <defs>
            <linearGradient id={blueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4DB8FF" />
              <stop offset="100%" stopColor="#2F8CFF" />
            </linearGradient>
            <linearGradient id={violetGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5B3CF0" />
              <stop offset="100%" stopColor="#7C5CFF" />
            </linearGradient>
          </defs>
          <path d={UPPER_HALF_PATH} fill={`url(#${blueGradId})`} />
          <path d={LOWER_HALF_PATH} fill={`url(#${violetGradId})`} />
        </svg>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold tracking-tight text-slate-900 dark:text-white text-xl">
              Servora
            </span>
            <span className="font-normal tracking-tight text-slate-600 dark:text-slate-300 text-xl">
              Intelligence
            </span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 mt-0.5">
            AI Operations &amp; Support
          </span>
        </div>
      </div>
    );
  }

  let upperFill = `url(#${blueGradId})`;
  let lowerFill = `url(#${violetGradId})`;

  if (variant === 'monochrome-dark') {
    upperFill = '#0F172A';
    lowerFill = '#0F172A';
  } else if (variant === 'monochrome-light') {
    upperFill = '#F8FAFC';
    lowerFill = '#F8FAFC';
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Servora Intelligence logo"
    >
      <defs>
        <linearGradient id={blueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4DB8FF" />
          <stop offset="100%" stopColor="#2F8CFF" />
        </linearGradient>
        <linearGradient id={violetGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B3CF0" />
          <stop offset="100%" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      <path d={UPPER_HALF_PATH} fill={upperFill} />
      <path d={LOWER_HALF_PATH} fill={lowerFill} />
    </svg>
  );
};

