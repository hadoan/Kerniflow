-- CreateEnum
CREATE TYPE "PartyRoleType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'CONTACT');

-- CreateEnum
CREATE TYPE "ContactPointType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('BILLING');

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "vatId" TEXT,
    "notes" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" "PartyRoleType" NOT NULL,

    CONSTRAINT "PartyRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactPoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" "ContactPointType" NOT NULL,
    "value" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Invoice" RENAME COLUMN "customerId" TO "customerPartyId";
ALTER TABLE "Invoice" ADD COLUMN     "billToAddressLine1" TEXT,
ADD COLUMN     "billToAddressLine2" TEXT,
ADD COLUMN     "billToCity" TEXT,
ADD COLUMN     "billToCountry" TEXT,
ADD COLUMN     "billToEmail" TEXT,
ADD COLUMN     "billToName" TEXT,
ADD COLUMN     "billToPostalCode" TEXT,
ADD COLUMN     "billToVatId" TEXT;

-- CreateIndex
CREATE INDEX "Party_tenantId_idx" ON "Party"("tenantId");

-- CreateIndex
CREATE INDEX "Party_tenantId_displayName_idx" ON "Party"("tenantId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "tenantId_partyId_role" ON "PartyRole"("tenantId", "partyId", "role");

-- CreateIndex
CREATE INDEX "PartyRole_tenantId_role_idx" ON "PartyRole"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "tenantId_partyId_type" ON "ContactPoint"("tenantId", "partyId", "type");

-- CreateIndex
CREATE INDEX "ContactPoint_tenantId_partyId_type_idx" ON "ContactPoint"("tenantId", "partyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "tenantId_partyId_type_address" ON "Address"("tenantId", "partyId", "type");

-- CreateIndex
CREATE INDEX "Address_tenantId_type_idx" ON "Address"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_customerPartyId_idx" ON "Invoice"("tenantId", "customerPartyId");

-- AddForeignKey
ALTER TABLE "PartyRole" ADD CONSTRAINT "PartyRole_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPoint" ADD CONSTRAINT "ContactPoint_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
