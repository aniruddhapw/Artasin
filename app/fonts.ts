import { Inter, Noto_Sans_Devanagari, Playfair_Display } from "next/font/google";

/**
 * The site's fonts, downloaded at build time and served from our own domain
 * by next/font. Loading them from Google Fonts with a CSS @import made every
 * page wait on a chain of requests to another site before it could paint,
 * the main cost on a phone. next/font preloads the files and gives each a
 * fallback sized to match, so swapping in the real font moves nothing.
 *
 * CSS uses them through the variables (var(--font-serif) and so on); canvas
 * text in the 3D gallery reads the same variables (components/gallery3d/canvasFonts.ts).
 */
export const sans = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-serif"
});

// Only Hindi and Marathi pages use it, so it is not preloaded: a browser
// fetches it only when Devanagari text needs it.
export const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-devanagari"
});

export const fontVariables = `${sans.variable} ${serif.variable} ${devanagari.variable}`;
