function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function ArtistAvatar({ name }: { name: string }) {
  return (
    <div className="artist-avatar artist-avatar-monogram">
      <span>{getInitials(name)}</span>
    </div>
  );
}
