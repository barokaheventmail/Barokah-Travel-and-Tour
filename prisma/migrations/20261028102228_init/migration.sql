-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "customPassword" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "phone" TEXT,
    "photoUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CREW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "dateEnd" DATETIME,
    "location" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "imageUrl" TEXT,
    "crewPrefix" TEXT,
    "panduanItinerary" TEXT,
    "panduanRules" TEXT,
    "panduanSections" TEXT,
    "crewName" TEXT,
    "crewPhone" TEXT,
    "crewRole" TEXT,
    "crewPhotoUrl" TEXT,
    "crewList" TEXT,
    "denahKamarCrewName" TEXT,
    "denahKamarCrewRole" TEXT,
    "denahKamarCrewPhotoUrl" TEXT,
    "denahVwCrewName" TEXT,
    "denahVwCrewRole" TEXT,
    "denahVwCrewPhotoUrl" TEXT,
    "vwName" TEXT NOT NULL DEFAULT 'VW MAGELANG',
    "vwTitle" TEXT,
    "itineraryTitle" TEXT,
    "itineraryKeterangan" TEXT,
    "itineraryKeterangan2" TEXT,
    "denahKamarTitle" TEXT,
    "denahKamarKeterangan" TEXT,
    "denahKamarKeterangan2" TEXT,
    "denahDudukTitle" TEXT,
    "vwKeterangan" TEXT,
    "vwKeterangan2" TEXT,
    "panduanLogoLeft" TEXT,
    "panduanLogoLeft2" TEXT,
    "panduanLogoCenter" TEXT,
    "panduanLogoRight2" TEXT,
    "panduanLogoRight" TEXT,
    "panduanLogoTopRight" TEXT,
    "panduanLogoTopRight2" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PaketEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "subtitle" TEXT,
    "body" TEXT,
    "badge" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PaketImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paketId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaketImage_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "PaketEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaketPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paketId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "facilities" JSONB,
    "badge" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PaketPrice_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "PaketEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "seatRows" INTEGER NOT NULL DEFAULT 0,
    "seatCols" INTEGER NOT NULL DEFAULT 0,
    "seatCellW" INTEGER NOT NULL DEFAULT 1,
    "seatCellH" INTEGER NOT NULL DEFAULT 1,
    "seatLayout" TEXT,
    "frontLayout" TEXT,
    "facilities" TEXT,
    "unitImageUrl" TEXT,
    "unitLabel" TEXT,
    "unitImagePosX" INTEGER NOT NULL DEFAULT 50,
    "unitImagePosY" INTEGER NOT NULL DEFAULT 50,
    "unitImageZoom" INTEGER NOT NULL DEFAULT 0,
    "denahDudukKeterangan" TEXT,
    "denahDudukKeterangan2" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bus_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusWorker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "busId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusWorker_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusWorker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "birthPlace" TEXT,
    "birthDate" DATETIME,
    "phone" TEXT,
    "seat" TEXT,
    "room" TEXT,
    "roomType" TEXT,
    "vw" TEXT,
    "jeepParis" TEXT,
    "jeepMerapi" TEXT,
    "jeepBromo" TEXT,
    "token" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "scannedAt" DATETIME,
    "scannedById" TEXT,
    "scannedAtEvent" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Participant_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Participant_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'attended',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE INDEX "PaketEvent_order_idx" ON "PaketEvent"("order");

-- CreateIndex
CREATE INDEX "PaketImage_paketId_order_idx" ON "PaketImage"("paketId", "order");

-- CreateIndex
CREATE INDEX "PaketPrice_paketId_order_idx" ON "PaketPrice"("paketId", "order");

-- CreateIndex
CREATE INDEX "Bus_eventId_idx" ON "Bus"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_eventId_name_key" ON "Bus"("eventId", "name");

-- CreateIndex
CREATE INDEX "BusWorker_busId_idx" ON "BusWorker"("busId");

-- CreateIndex
CREATE UNIQUE INDEX "BusWorker_busId_userId_key" ON "BusWorker"("busId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_token_key" ON "Participant"("token");

-- CreateIndex
CREATE INDEX "Participant_eventId_busId_idx" ON "Participant"("eventId", "busId");

-- CreateIndex
CREATE INDEX "Participant_eventId_name_idx" ON "Participant"("eventId", "name");

-- CreateIndex
CREATE INDEX "Participant_scannedAt_idx" ON "Participant"("scannedAt");

-- CreateIndex
CREATE INDEX "Participant_ticketCode_idx" ON "Participant"("ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_busId_order_key" ON "Participant"("eventId", "busId", "order");

-- CreateIndex
CREATE INDEX "ScanLog_participantId_idx" ON "ScanLog"("participantId");

-- CreateIndex
CREATE INDEX "ScanLog_createdAt_idx" ON "ScanLog"("createdAt");

-- CreateIndex
CREATE INDEX "Preset_kind_order_idx" ON "Preset"("kind", "order");

-- CreateIndex
CREATE INDEX "ActivityLog_eventId_idx" ON "ActivityLog"("eventId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "RoomType_eventId_order_idx" ON "RoomType"("eventId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_eventId_name_key" ON "RoomType"("eventId", "name");
