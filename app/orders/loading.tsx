import { Nav } from "@/components/Nav";
import { LoadingAnnouncement, SkeletonHeader, SkeletonRows } from "@/components/Skeleton";

export default function SegmentLoading() {
  return (
    <>
      <Nav />
      <main className="page request-page">
        <LoadingAnnouncement label="Loading your orders" />
        <SkeletonHeader />
        <SkeletonRows count={3} />
      </main>
    </>
  );
}
