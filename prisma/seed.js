import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/artisan_exchange?schema=public";

// This script creates a well-known demo admin account with a password
// documented in plain text in README.md. Seeding it into anything but a local
// database would publish a working admin login for that database. upsert()
// with update: {} below means this guard only has to catch the *first* run —
// after that the account already exists and re-running is a no-op anyway.
const looksLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);
if (!looksLocal && process.env.ALLOW_PROD_SEED !== "true") {
  console.error(
    `Refusing to seed a non-local DATABASE_URL (${databaseUrl.replace(/:[^:@]*@/, ":***@")}).\n` +
      "This creates a demo admin account whose password is public in README.md. " +
      "If you really mean to seed this database, set ALLOW_PROD_SEED=true."
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main() {
  const passwordHash = await bcrypt.hash("artisan-demo-password", 12);

  const artistUser = await prisma.user.upsert({
    where: { email: "elena.rossi@example.com" },
    update: {},
    create: {
      email: "elena.rossi@example.com",
      passwordHash,
      firstName: "Elena",
      lastName: "Rossi",
      role: "ARTIST",
      artistProfile: {
        create: {
          displayName: "Elena Rossi",
          slug: "elena-rossi",
          bio: "Elena Rossi explores the delicate balance between void and form.",
          discipline: "Oil on Canvas",
          location: "Milan",
          verificationStatus: "APPROVED"
        }
      }
    },
    include: { artistProfile: true }
  });

  const buyerUser = await prisma.user.upsert({
    where: { email: "collector@example.com" },
    update: {},
    create: {
      email: "collector@example.com",
      passwordHash,
      firstName: "Mira",
      lastName: "Collector",
      role: "BUYER"
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash,
      firstName: "Ada",
      lastName: "Admin",
      role: "ADMIN"
    }
  });

  const artwork = await prisma.artwork.upsert({
    where: { slug: "echoes-of-silence" },
    update: {},
    create: {
      artistId: artistUser.artistProfile.id,
      title: "Echoes of Silence",
      slug: "echoes-of-silence",
      description:
        "A large abstract work defined by negative space, slate movement, and quiet atmospheric depth.",
      category: "Painting",
      medium: "Oil on Canvas",
      dimensions: "48 x 60 in",
      year: 2023,
      priceCents: 1250000,
      status: "PUBLISHED",
      authenticity: "Signed Certificate",
      shipsFrom: "Milan",
      media: {
        create: {
          url: "/artisan/echoes-detail.svg",
          alt: "Echoes of Silence painting",
          sortOrder: 0
        }
      }
    }
  });

  await prisma.commissionRequest.upsert({
    where: { id: "demo-commission-request" },
    update: {},
    create: {
      id: "demo-commission-request",
      buyerId: buyerUser.id,
      artistId: artistUser.artistProfile.id,
      title: "Large Canvas Commission",
      artworkType: "Painting",
      medium: "Oil on Canvas",
      budgetMinCents: 500000,
      budgetMaxCents: 1000000,
      timeline: "3-6 months",
      dimensions: "60 x 48 in",
      requirements:
        "A restrained monochrome composition for a quiet living room, inspired by Echoes of Silence.",
      referenceUrls: [],
      status: "ARTIST_REVIEW"
    }
  });

  console.log(`Seeded ${artistUser.email}, ${buyerUser.email}, ${adminUser.email}, and ${artwork.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
