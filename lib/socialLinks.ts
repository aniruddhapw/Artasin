import type { IconName } from "@/components/Icon";

export interface SocialLink {
  name: string;
  href: string;
  icon: IconName;
}

/**
 * ARTASIN's social profiles: linked from the footer, and listed as the
 * organisation's sameAs in the structured data (app/layout.tsx).
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  { name: "Instagram", href: "https://www.instagram.com/artasin.in/", icon: "instagram" },
  { name: "Facebook", href: "https://www.facebook.com/people/Artasin/61594938931199/", icon: "facebook" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/artasin-1", icon: "linkedin" },
  { name: "Threads", href: "https://www.threads.com/@artasin.in", icon: "threads" }
];
