import { Nav } from "@/components/Nav";
import { LoadingAnnouncement, SkeletonHeader, SkeletonRows } from "@/components/Skeleton";

export default function ArtistsLoading() {
  return (
    <>
      <Nav active="artists" />
      <main className="page request-page">
        <LoadingAnnouncement label="Loading artists" />
        <SkeletonHeader />
        <SkeletonRows count={4} />
      </main>
    </>
  );
}
