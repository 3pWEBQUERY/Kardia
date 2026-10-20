-- CreateSchema

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('DE_CH', 'FR_CH', 'IT_CH', 'EN');

-- CreateEnum
CREATE TYPE "Profession" AS ENUM ('NURSE_HF_FH', 'FAGE', 'AGS', 'NURSING_AID_SRK', 'PHYSICIAN', 'MPA', 'PHYSIOTHERAPIST', 'OCCUPATIONAL_THERAPIST', 'SPEECH_THERAPIST', 'MTRA', 'BMA', 'PARAMEDIC', 'OR_TECHNICIAN', 'MIDWIFE');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('ICU', 'EMERGENCY', 'SURGERY', 'INTERNAL_MEDICINE', 'GERIATRICS', 'PSYCHIATRY', 'PEDIATRICS', 'ONCOLOGY', 'OPERATING_ROOM', 'ANESTHESIA', 'LONG_TERM_CARE', 'HOME_CARE', 'REHABILITATION', 'MATERNITY', 'RADIOLOGY', 'LABORATORY', 'PRACTICE');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('EARLY', 'LATE', 'NIGHT', 'DAY_12H', 'SPLIT', 'WEEKDAYS_ONLY');

-- CreateEnum
CREATE TYPE "RosterCode" AS ENUM ('F', 'S', 'N', 'T', 'X');

-- CreateEnum
CREATE TYPE "ChildcareType" AS ENUM ('NONE', 'INTERNAL_DAYCARE', 'ALLOWANCE');

-- CreateEnum
CREATE TYPE "OrgVerification" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'AGENCY_REVIEW');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'RECRUITER', 'WARD_LEAD', 'VIEWER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RejectionReason" AS ENUM ('QUALIFICATION_MISSING', 'POSITION_FILLED', 'LANGUAGE', 'AVAILABILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('DIPLOMA', 'RECOGNITION_SRK', 'RECOGNITION_MEBEKO', 'REGISTRY_ENTRY', 'FURTHER_EDUCATION', 'LANGUAGE_CERTIFICATE');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Registry" AS ENUM ('MEDREG', 'GESREG', 'NAREG');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SENT', 'INTERESTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'BOOKED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PoolBookingMode" AS ENUM ('FIRST_CONFIRMS', 'EMPLOYER_SELECTS');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('UPLOADING', 'SCANNING', 'READY', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiFunction" AS ENUM ('JOB_STRUCTURING', 'SEARCH_PARSING', 'DOCUMENT_PRECHECK', 'MODERATION', 'TEAM_SUMMARY', 'TRANSLATION');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('SUCCESS', 'INVALID_OUTPUT', 'TIMEOUT', 'ERROR');

-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('PRAXIS', 'INSTITUTION', 'SPITALGRUPPE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'DE_CH',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "verification" "OrgVerification" NOT NULL DEFAULT 'PENDING',
    "secoRegistryMatch" BOOLEAN NOT NULL DEFAULT false,
    "emailDomains" TEXT[],
    "logoFileId" TEXT,
    "plan" "PlanTier",
    "stripeCustomerId" TEXT,
    "offerQuotaPerMonth" INTEGER NOT NULL DEFAULT 0,
    "planValidUntil" TIMESTAMP(3),
    "foundingPartner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "canton" CHAR(2) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "hasParking" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "salaryMinChf" INTEGER NOT NULL,
    "salaryMaxChf" INTEGER NOT NULL,
    "thirteenthSalary" BOOLEAN NOT NULL,
    "nightAllowanceChfHour" INTEGER NOT NULL,
    "sundayAllowancePct" INTEGER NOT NULL,
    "onCallChfDay" INTEGER,
    "shiftTypes" "ShiftType"[],
    "rosterLeadWeeks" INTEGER NOT NULL,
    "weekendsPerMonth" DOUBLE PRECISION NOT NULL,
    "guaranteedWishDays" INTEGER NOT NULL,
    "minWorkloadPct" INTEGER NOT NULL,
    "maxWorkloadPct" INTEGER NOT NULL,
    "minShiftsPerWeek" INTEGER,
    "patientsPerNurseDay" DOUBLE PRECISION,
    "patientsPerNurseNight" DOUBLE PRECISION,
    "skillMixHfFhPct" INTEGER,
    "skillMixFagePct" INTEGER,
    "skillMixAidPct" INTEGER,
    "onboardingWeeks" INTEGER NOT NULL,
    "vacationWeeks" INTEGER NOT NULL,
    "educationBudgetChf" INTEGER,
    "educationDays" INTEGER,
    "childcare" "ChildcareType" NOT NULL DEFAULT 'NONE',
    "childcareAllowanceChf" INTEGER,
    "collectiveAgreement" TEXT NOT NULL,
    "rosterPattern" "RosterCode"[],
    "reentryFriendly" BOOLEAN NOT NULL DEFAULT false,
    "reentryOnboardingWeeks" INTEGER,
    "reentryAccompaniedShifts" INTEGER,
    "reentryRefresher" JSONB,
    "description" TEXT,
    "translations" JSONB,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "profession" "Profession" NOT NULL,
    "workloadMinPct" INTEGER NOT NULL,
    "workloadMaxPct" INTEGER NOT NULL,
    "startDate" DATE,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "overrides" JSONB,
    "allowsPendingRecog" BOOLEAN NOT NULL DEFAULT false,
    "specialtyTitle" TEXT,
    "trainingCategory" TEXT,
    "maxCreditableYears" DOUBLE PRECISION,
    "weeklyHours" INTEGER,
    "structuredTrainingHoursWeek" INTEGER,
    "rotations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assistantPositions" INTEGER,
    "paidUntil" TIMESTAMP(3),
    "feedId" TEXT,
    "externalRef" TEXT,
    "sourceHash" TEXT,
    "searchVector" tsvector,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "homeLat" DOUBLE PRECISION,
    "homeLng" DOUBLE PRECISION,
    "homeDistrict" TEXT,
    "profession" "Profession" NOT NULL,
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "workAuthorizedCh" BOOLEAN,
    "marketplaceActive" BOOLEAN NOT NULL DEFAULT false,
    "desiredWorkloadPct" INTEGER,
    "earliestStart" DATE,
    "mustConditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "years" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageSkill" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "language" CHAR(2) NOT NULL,
    "level" VARCHAR(2) NOT NULL,

    CONSTRAINT "LanguageSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgress" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "specialtyTitle" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "yearsCompleted" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TrainingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "issuedAt" DATE,
    "validUntil" DATE,
    "registry" "Registry",
    "registryNumber" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rejectReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "message" VARCHAR(500),
    "documentsShared" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" "RejectionReason",
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedJob" (
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("candidateId","jobId")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "frequency" "AlertFrequency" NOT NULL DEFAULT 'DAILY',
    "lastSentAt" TIMESTAMP(3),

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "salaryChf" INTEGER NOT NULL,
    "workloadPct" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "note" VARCHAR(600),
    "status" "OfferStatus" NOT NULL DEFAULT 'SENT',
    "declineReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateBlock" (
    "candidateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "CandidateBlock_pkey" PRIMARY KEY ("candidateId","organizationId")
);

-- CreateTable
CREATE TABLE "FlexPool" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bookingMode" "PoolBookingMode" NOT NULL DEFAULT 'FIRST_CONFIRMS',
    "cancelDeadlineHours" INTEGER NOT NULL DEFAULT 48,

    CONSTRAINT "FlexPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolMember" (
    "poolId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolMember_pkey" PRIMARY KEY ("poolId","candidateId")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "code" "RosterCode" NOT NULL,
    "hourlyRateChf" INTEGER NOT NULL,
    "requirements" TEXT,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "bookedByCandidateId" TEXT,
    "bookedAt" TIMESTAMP(3),

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedEmployee" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealityCheck" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "agrees" BOOLEAN NOT NULL,
    "proposedValue" TEXT,
    "comment" VARCHAR(400),
    "voterHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WardVideo" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "captionsId" TEXT NOT NULL,
    "posterId" TEXT,
    "durationSec" INTEGER NOT NULL,
    "moderation" "ModerationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "WardVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WardAmbassador" (
    "wardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WardAmbassador_pkey" PRIMARY KEY ("wardId","userId")
);

-- CreateTable
CREATE TABLE "TeamQuestion" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "askedById" TEXT NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "answer" VARCHAR(1500),
    "answeredAt" TIMESTAMP(3),
    "moderation" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WardBenchmark" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "wardValue" DOUBLE PRECISION NOT NULL,
    "medianValue" DOUBLE PRECISION NOT NULL,
    "peerCount" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WardBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'UPLOADING',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommuteCache" (
    "originGeohash" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommuteCache_pkey" PRIMARY KEY ("originGeohash","wardId","mode")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "function" "AiFunction" NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'claude-haiku-5-5',
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DECIMAL(10,6) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "status" "AiRunStatus" NOT NULL,
    "inputHash" TEXT NOT NULL,
    "rawInput" TEXT,
    "rawOutput" JSONB,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "orgId" TEXT,
    "entityId" TEXT,
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecognitionGuide" (
    "id" TEXT NOT NULL,
    "originCountry" CHAR(2) NOT NULL,
    "targetProfession" "Profession" NOT NULL,
    "authority" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "reviewedAt" DATE NOT NULL,

    CONSTRAINT "RecognitionGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "aaguid" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SsoProvider" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "oidcConfig" TEXT,
    "samlConfig" TEXT,
    "userId" TEXT,
    "providerId" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "SsoProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastStatus" INTEGER,
    "deliveredAt" TIMESTAMP(3),
    "nextAttempt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "tokens" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "JobFeed" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "lastHash" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MemberRole",
    "wardId" TEXT,
    "poolId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WardFieldComment" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "body" VARCHAR(600) NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WardFieldComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" VARCHAR(400) NOT NULL,
    "reporterId" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecognitionProgress" (
    "candidateId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "completedSteps" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecognitionProgress_pkey" PRIMARY KEY ("candidateId","guideId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_uid_key" ON "Organization"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_logoFileId_key" ON "Organization"("logoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_organizationId_userId_key" ON "OrgMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Location_canton_idx" ON "Location"("canton");

-- CreateIndex
CREATE INDEX "Location_lat_lng_idx" ON "Location"("lat", "lng");

-- CreateIndex
CREATE INDEX "Ward_department_idx" ON "Ward"("department");

-- CreateIndex
CREATE INDEX "Ward_salaryMinChf_idx" ON "Ward"("salaryMinChf");

-- CreateIndex
CREATE INDEX "Ward_rosterLeadWeeks_idx" ON "Ward"("rosterLeadWeeks");

-- CreateIndex
CREATE INDEX "Ward_shiftTypes_idx" ON "Ward" USING GIN ("shiftTypes");

-- CreateIndex
CREATE INDEX "Ward_confirmedAt_idx" ON "Ward"("confirmedAt");

-- CreateIndex
CREATE INDEX "Job_status_profession_idx" ON "Job"("status", "profession");

-- CreateIndex
CREATE INDEX "Job_wardId_status_idx" ON "Job"("wardId", "status");

-- CreateIndex
CREATE INDEX "Job_publishedAt_idx" ON "Job"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_feedId_externalRef_key" ON "Job"("feedId", "externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageSkill_candidateId_language_key" ON "LanguageSkill"("candidateId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_fileId_key" ON "Credential"("fileId");

-- CreateIndex
CREATE INDEX "Credential_status_idx" ON "Credential"("status");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_candidateId_idx" ON "Application"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_candidateId_key" ON "Application"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "Offer_organizationId_createdAt_idx" ON "Offer"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_candidateId_status_idx" ON "Offer"("candidateId", "status");

-- CreateIndex
CREATE INDEX "PoolMember_candidateId_idx" ON "PoolMember"("candidateId");

-- CreateIndex
CREATE INDEX "Shift_poolId_status_startsAt_idx" ON "Shift"("poolId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "Shift_bookedByCandidateId_idx" ON "Shift"("bookedByCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedEmployee_wardId_userId_key" ON "VerifiedEmployee"("wardId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RealityCheck_wardId_field_voterHash_key" ON "RealityCheck"("wardId", "field", "voterHash");

-- CreateIndex
CREATE UNIQUE INDEX "WardVideo_fileId_key" ON "WardVideo"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "WardVideo_captionsId_key" ON "WardVideo"("captionsId");

-- CreateIndex
CREATE UNIQUE INDEX "WardVideo_posterId_key" ON "WardVideo"("posterId");

-- CreateIndex
CREATE UNIQUE INDEX "WardBenchmark_wardId_field_key" ON "WardBenchmark"("wardId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "File_bucketKey_key" ON "File"("bucketKey");

-- CreateIndex
CREATE INDEX "AiRun_function_createdAt_idx" ON "AiRun"("function", "createdAt");

-- CreateIndex
CREATE INDEX "AiRun_orgId_createdAt_idx" ON "AiRun"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_name_createdAt_idx" ON "Event"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "RecognitionGuide_originCountry_targetProfession_key" ON "RecognitionGuide"("originCountry", "targetProfession");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- CreateIndex
CREATE INDEX "Passkey_credentialID_idx" ON "Passkey"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "SsoProvider_providerId_key" ON "SsoProvider"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "WebhookDelivery_endpointId_createdAt_idx" ON "WebhookDelivery"("endpointId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_tokenHash_key" ON "InviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InviteToken_email_idx" ON "InviteToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WardFieldComment_wardId_field_key" ON "WardFieldComment"("wardId", "field");

-- CreateIndex
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "Ward_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "JobFeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageSkill" ADD CONSTRAINT "LanguageSkill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateBlock" ADD CONSTRAINT "CandidateBlock_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateBlock" ADD CONSTRAINT "CandidateBlock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlexPool" ADD CONSTRAINT "FlexPool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolMember" ADD CONSTRAINT "PoolMember_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "FlexPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolMember" ADD CONSTRAINT "PoolMember_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "FlexPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedEmployee" ADD CONSTRAINT "VerifiedEmployee_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealityCheck" ADD CONSTRAINT "RealityCheck_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardVideo" ADD CONSTRAINT "WardVideo_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardVideo" ADD CONSTRAINT "WardVideo_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardVideo" ADD CONSTRAINT "WardVideo_captionsId_fkey" FOREIGN KEY ("captionsId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardVideo" ADD CONSTRAINT "WardVideo_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardAmbassador" ADD CONSTRAINT "WardAmbassador_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamQuestion" ADD CONSTRAINT "TeamQuestion_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardBenchmark" ADD CONSTRAINT "WardBenchmark_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFeed" ADD CONSTRAINT "JobFeed_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardFieldComment" ADD CONSTRAINT "WardFieldComment_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecognitionProgress" ADD CONSTRAINT "RecognitionProgress_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecognitionProgress" ADD CONSTRAINT "RecognitionProgress_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "RecognitionGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Volltextsuche (PRD 11.2): generierte Spalte, GIN- und Trigramm-Index
-- Wird an die Migration angehängt, die "Job" anlegt.
ALTER TABLE "Job" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "Job" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('german', coalesce("specialtyTitle", '')), 'B')
  ) STORED;
CREATE INDEX "Job_searchVector_idx" ON "Job" USING GIN ("searchVector");
CREATE INDEX "Job_title_trgm_idx" ON "Job" USING GIN ("title" gin_trgm_ops);
