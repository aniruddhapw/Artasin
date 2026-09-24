import { StudioTourProvider } from "@/components/studio/StudioTour";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Wraps every studio route so the walkthrough survives the navigations it makes
 * between the dashboard, the listing form and the portfolio — a tour mounted
 * per page would unmount itself on its own first step.
 */
export default async function StudioLayout({ children }) {
  const user = await getAuthUser();
  const artistId = user?.artistProfile?.id;

  // An artist with nothing listed and no past work has just arrived; anyone
  // else gets the tour only when they ask for it.
  const [artworks, pieces] = artistId
    ? await Promise.all([
        prisma.artwork.count({ where: { artistId } }),
        prisma.portfolioPiece.count({ where: { artistId } })
      ])
    : [1, 1];

  return <StudioTourProvider autoStart={artworks === 0 && pieces === 0}>{children}</StudioTourProvider>;
}
