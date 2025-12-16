import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 16 },
    md: { icon: 32, text: 20 },
    lg: { icon: 40, text: 24 },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-accent"
      >
        {/* Rounded square container */}
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="10"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="10"
          stroke="currentColor"
          strokeWidth="2"
        />

        {/* Flow nodes */}
        <circle cx="20" cy="10" r="3" fill="currentColor" />
        <circle cx="10" cy="24" r="3" fill="currentColor" />
        <circle cx="30" cy="24" r="3" fill="currentColor" />
        <circle cx="20" cy="32" r="3" fill="currentColor" />

        {/* Flowing connection paths */}
        <path
          d="M20 13 L20 17 C20 20 15 22 10 21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M20 13 L20 17 C20 20 25 22 30 21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M13 24 C16 26 17 29 20 29"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M27 24 C24 26 23 29 20 29"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {showText && (
        <span
          className="font-bold text-foreground"
          style={{ fontSize: text }}
        >
          Bizflow
        </span>
      )}
    </div>
  );
}
