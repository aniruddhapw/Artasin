import { Nav } from "@/components/Nav";
import { LoadingAnnouncement, SkeletonHeader, SkeletonRows } from "@/components/Skeleton";

export default function SegmentLoading() {
  return (
    <>
      <Nav active="requests" />
      <main className="page request-page">
        <LoadingAnnouncement label="Loading your portfolio" />
        <SkeletonHeader />
        <SkeletonRows count={3} />
      </main>
    </>
  );
}
