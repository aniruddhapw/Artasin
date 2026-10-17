import type { EmailContent } from "@/lib/email";
import { galleryLaunchEmail } from "@/lib/emails";

/**
 * One-off announcements an admin sends to newsletter subscribers from /admin.
 * Each has a fixed Broadcast name, which is how a second send is refused
 * (see findSentBroadcast in lib/broadcasts.ts).
 */
export const GALLERY_ANNOUNCEMENT = {
  name: "Announcement: 3D gallery launch",
  content: galleryLaunchEmail
} as const satisfies { name: string; content: () => EmailContent };

/**
 * A Broadcast's HTML with Resend's merge tags filled in, for a test send to
 * one person or a preview. Resend fills them itself only when it sends a
 * Broadcast; in an ordinary email they would show up as raw braces.
 */
export function fillMergeTags(html: string, { firstName, unsubscribeUrl }: { firstName: string; unsubscribeUrl: string }): string {
  return html
    .replace(/\{\{\{contact\.first_name\|([^}]*)\}\}\}/g, (_, fallback: string) => escapeHtml(firstName.trim() || fallback))
    .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, unsubscribeUrl);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}
