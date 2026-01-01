import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
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
        <rect x="2" y="2" width="36" height="36" rx="10" fill="currentColor" fillOpacity="0.15" />
        <rect x="2" y="2" width="36" height="36" rx="10" stroke="currentColor" strokeWidth="2" />

        {/* Corely "C" lettermark */}
        <path
          d="M 26 12 C 22 10 16 10 12 14 C 8 18 8 24 12 28 C 16 32 22 32 26 30"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="28" cy="12" r="2" fill="currentColor" />
        <circle cx="28" cy="30" r="2" fill="currentColor" />
      </svg>

      {showText && (
        <span className="font-bold text-foreground" style={{ fontSize: text }}>
          Corely
        </span>
      )}
    </div>
  );
}
