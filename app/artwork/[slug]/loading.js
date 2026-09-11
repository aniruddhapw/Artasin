import { Nav } from "@/components/Nav";
import { LoadingAnnouncement, SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

export default function ArtworkLoading() {
  return (
    <>
      <Nav active="exhibitions" />
      <main className="page artwork-page">
        <LoadingAnnouncement label="Loading artwork" />
        <section className="artwork-layout">
          <SkeletonBlock height={620} />
          <aside className="artwork-panel skeleton-stack">
            <SkeletonLine height={44} width="80%" />
            <SkeletonLine width="45%" />
            <SkeletonLine height={28} width="30%" />
            <SkeletonBlock height={220} />
            <SkeletonLine height={48} />
            <SkeletonLine height={48} />
          </aside>
        </section>
      </main>
    </>
  );
}
