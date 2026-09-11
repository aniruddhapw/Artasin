import { Nav } from "@/components/Nav";
import { LoadingAnnouncement, SkeletonCardGrid, SkeletonHeader } from "@/components/Skeleton";

export default function ArtistLoading() {
  return (
    <>
      <Nav active="artists" />
      <main className="page request-page">
        <LoadingAnnouncement label="Loading artist profile" />
        <SkeletonHeader lines={3} />
        <SkeletonCardGrid count={3} />
      </main>
    </>
  );
}
