-- Kanalwahl für Suchabos (PRD 13.3: per E-Mail oder Web Push). Such-Indizes aus 0001 bleiben unangetastet.

CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'PUSH', 'BOTH');

ALTER TABLE "SavedSearch" ADD COLUMN "channel" "AlertChannel" NOT NULL DEFAULT 'EMAIL';
