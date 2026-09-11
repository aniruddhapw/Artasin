import { Nav } from "@/components/Nav";
import { LoadingAnnouncement, SkeletonCardGrid, SkeletonHeader } from "@/components/Skeleton";

export default function GalleryLoading() {
  return (
    <>
      <Nav active="exhibitions" />
      <main className="page request-page">
        <LoadingAnnouncement label="Loading the gallery" />
        <SkeletonHeader />
        <SkeletonCardGrid count={6} />
      </main>
    </>
  );
}
