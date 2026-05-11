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
        <linearGradient id="sss-target-ring" x1="8" y1="7" x2="40" y2="41" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="sss-target-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 24) scale(22)">
          <stop stopColor="#f59e0b" stopOpacity="0.35" />
          <stop offset="1" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="2.5" y="2.5" width="43" height="43" rx="12" fill="#0b0f19" />
      <rect x="2.5" y="2.5" width="43" height="43" rx="12" fill="url(#sss-target-glow)" />
      <circle cx="24" cy="24" r="16.5" stroke="url(#sss-target-ring)" strokeWidth="3.2" />
      <circle cx="24" cy="24" r="10.2" stroke="#22d3ee" strokeOpacity="0.88" strokeWidth="2.8" />
      <circle cx="24" cy="24" r="4.6" stroke="#f8fafc" strokeOpacity="0.75" strokeWidth="2.1" />
      <circle cx="24" cy="24" r="2" fill="#f59e0b" />
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
