type CylinderColor = "red" | "yellow" | "green" | "blue" | "orange";

const COLOR_MAP: Record<CylinderColor, { body: string; bodyDark: string; cap: string }> = {
  red: { body: "#E5484D", bodyDark: "#B91C25", cap: "#7A1015" },
  yellow: { body: "#F5B912", bodyDark: "#C98D00", cap: "#8A5A00" },
  green: { body: "#2FA84F", bodyDark: "#1E7A38", cap: "#124F23" },
  blue: { body: "#2F7DE1", bodyDark: "#1E56A8", cap: "#123564" },
  orange: { body: "#F7931E", bodyDark: "#C96E0A", cap: "#7A4406" },
};

/**
 * Size → color mapping, used only as a last-resort placeholder (SVG icon)
 * when a cylinder has no photo at all. Real photos (see cylinderPhoto below)
 * are preferred wherever available.
 */
export function sizeToColor(sizeKg: number): CylinderColor {
  if (sizeKg <= 6) return "red";
  if (sizeKg <= 13) return "yellow";
  return "green";
}

export function GasCylinderIcon({ color = "yellow", className }: { color?: CylinderColor; className?: string }) {
  const c = COLOR_MAP[color];
  return (
    <svg viewBox="0 0 120 160" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${color} gas cylinder`}>
      {/* base ring */}
      <ellipse cx="60" cy="150" rx="34" ry="7" fill="#00000022" />
      <rect x="28" y="138" width="64" height="12" rx="4" fill="#3A3A3A" />
      {/* body */}
      <rect x="24" y="52" width="72" height="94" rx="16" fill={c.body} />
      <rect x="24" y="52" width="72" height="94" rx="16" fill="url(#shine)" />
      {/* shoulder */}
      <path d="M32 52 Q32 30 60 30 Q88 30 88 52 Z" fill={c.body} />
      {/* neck ring */}
      <rect x="46" y="20" width="28" height="14" rx="4" fill={c.bodyDark} />
      {/* valve */}
      <rect x="52" y="6" width="16" height="16" rx="3" fill={c.cap} />
      <rect x="56" y="0" width="8" height="8" rx="2" fill="#4A4A4A" />
      {/* carry handle */}
      <path d="M40 34 Q60 20 80 34" stroke={c.bodyDark} strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* label band */}
      <rect x="24" y="92" width="72" height="18" fill="#FFFFFF" opacity="0.9" />
      <defs>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
