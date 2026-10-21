-- AGB-Zustimmung, Ein-Klick-Kennzeichen, Gelesen-Markierung, Stripe-Abo (PRD 14.3, 15, 13.2)
-- Die Such-Indizes aus 0001 (search.sql) bleiben unangetastet.

ALTER TABLE "Application" ADD COLUMN "viaPass" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP(3);

ALTER TABLE "Organization" ADD COLUMN "employerTermsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "stripeSubscriptionId" TEXT;

ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT;

CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
