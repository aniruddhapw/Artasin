-- AlterTable
ALTER TABLE "Artwork" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "CommissionRequest" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- Relabel existing rows. Amounts are left untouched: this changes the
-- currency label on existing records, it does not convert their value.
UPDATE "Artwork" SET "currency" = 'INR' WHERE "currency" = 'USD';
UPDATE "CommissionRequest" SET "currency" = 'INR' WHERE "currency" = 'USD';
UPDATE "Order" SET "currency" = 'INR' WHERE "currency" = 'USD';
UPDATE "Payout" SET "currency" = 'INR' WHERE "currency" = 'USD';
UPDATE "Transaction" SET "currency" = 'INR' WHERE "currency" = 'USD';
