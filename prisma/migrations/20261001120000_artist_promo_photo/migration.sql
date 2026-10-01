-- CreateTable
CREATE TABLE "ArtistPromoPhoto" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistPromoPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistPromoPhoto_artistId_key" ON "ArtistPromoPhoto"("artistId");

-- AddForeignKey
ALTER TABLE "ArtistPromoPhoto" ADD CONSTRAINT "ArtistPromoPhoto_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
