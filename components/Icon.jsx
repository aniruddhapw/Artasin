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
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
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
  )
};

export function Icon({ name, className = "", size = 24 }) {
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
