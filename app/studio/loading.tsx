import { Nav } from "@/components/Nav";
import { LoadingAnnouncement, SkeletonBlock, SkeletonHeader, SkeletonRows } from "@/components/Skeleton";

export default function StudioLoading() {
  return (
    <>
      <Nav active="requests" />
      <main className="page studio-page">
        <LoadingAnnouncement label="Loading your studio" />
        <SkeletonHeader />
        <SkeletonBlock height={120} />
        <div className="skeleton-gap" />
        <SkeletonRows count={3} />
      </main>
    </>
  );
}
