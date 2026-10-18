const paths = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  bag: (
    <>
      <path d="M7 8h10l1 13H6L7 8Z" />
      <path d="M9.5 8V6a2.5 2.5 0 0 1 5 0v2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  arrowRight: <path d="M5 12h14m-5-5 5 5-5 5" />,
  check: <path d="m5 13 4 4 10-10" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4" />
      <path d="M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </>
  ),
  mail: (
    <>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18h1.2a2.2 2.2 0 0 0 1.6-3.7 1.4 1.4 0 0 1 1-2.4H18a3.8 3.8 0 0 0 3.5-5.2A9.4 9.4 0 0 0 12 3Z" />
      <circle cx="8.5" cy="10" r=".8" />
      <circle cx="11.5" cy="7.8" r=".8" />
      <circle cx="15" cy="9.2" r=".8" />
    </>
  ),
  image: (
    <>
      <path d="M5 5h14v14H5z" />
      <path d="m7.5 16 4-4 2.5 2.5 1.5-1.5 2 3" />
      <circle cx="9" cy="9" r="1" />
    </>
  ),
  architecture: (
    <>
      <path d="M12 3v18" />
      <path d="m7 8 5-5 5 5" />
      <path d="M8 21h8" />
      <path d="M9 13h6" />
    </>
  ),
  uploadFile: (
    <>
      <path d="M7 21h10a2 2 0 0 0 2-2V9l-6-6H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
      <path d="M13 3v6h6" />
      <path d="M12 17v-6" />
      <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  // For the 3D gallery's top bar (outlines from Lucide, ISC).
  arrowLeft: <path d="M19 12H5m5-5-5 5 5 5" />,
  grid: (
    <>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m5.6 5.6 2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3z" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  returns: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  // Brand marks below are outline versions from Lucide (ISC licence), to
  // match the stroke style of the rest of the set.
  instagram: (
    <>
      <rect height="20" rx="5" width="20" x="2" y="2" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </>
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect height="12" width="4" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  // Threads' mark is a looped "@"; Lucide's at-sign is the closest outline.
  threads: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
    </>
  )
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "", size = 24 }: { name: IconName; className?: string; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[name]}
      </g>
    </svg>
  );
}
