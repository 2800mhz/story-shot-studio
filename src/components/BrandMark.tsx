import React from 'react';
import { cn } from '@/lib/utils';

interface BrandIconProps {
  className?: string;
}

interface BrandLockupProps {
  className?: string;
  titleClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
  iconClassName?: string;
}

export function BrandIcon({ className }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Story Shot Video"
      className={cn('h-10 w-10', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sss-icon-frame" x1="8" y1="6" x2="41" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="sss-icon-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(28 21) rotate(127) scale(22)">
          <stop stopColor="#f59e0b" stopOpacity="0.35" />
          <stop offset="1" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="2.5" y="2.5" width="43" height="43" rx="12" fill="#0b0f19" />
      <rect x="2.5" y="2.5" width="43" height="43" rx="12" fill="url(#sss-icon-glow)" />
      <rect x="4" y="4" width="40" height="40" rx="10.5" stroke="url(#sss-icon-frame)" strokeWidth="2" />
      <path d="M12 13.5h20.5c3.6 0 6.5 2.9 6.5 6.5v14.5H18.2c-3.7 0-6.7-3-6.7-6.7V13.5Z" fill="#111827" stroke="#f8fafc" strokeOpacity="0.13" />
      <path d="M13.5 15.5h6.2v17.2h-6.2" stroke="#f59e0b" strokeOpacity="0.8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M35.5 17.5h-8.8c-4.6 0-8.4 3.7-8.4 8.4s3.8 8.4 8.4 8.4h9.2" stroke="#22d3ee" strokeOpacity="0.78" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M25 18.5c-3.5 1.1-6.1 4.4-6.1 8.3 0 1.3.3 2.5.8 3.6" stroke="#f59e0b" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="27.3" cy="26.2" r="5.5" stroke="#f8fafc" strokeOpacity="0.72" strokeWidth="1.5" />
      <circle cx="27.3" cy="26.2" r="2.1" fill="#f59e0b" />
      <path d="M14 19.5h4M14 24h4M14 28.5h4" stroke="#f8fafc" strokeOpacity="0.32" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M31.8 13.5l4.9-4.1M36.5 34.5l4.2 3.9" stroke="#22d3ee" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLockup({
  className,
  titleClassName,
  subtitle = 'Episode workspace',
  subtitleClassName,
  iconClassName,
}: BrandLockupProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandIcon className={iconClassName} />
      <div>
        <div className={cn('font-semibold text-foreground', titleClassName)}>Story Shot Video</div>
        {subtitle ? <div className={cn('text-xs text-muted-foreground', subtitleClassName)}>{subtitle}</div> : null}
      </div>
    </div>
  );
}
