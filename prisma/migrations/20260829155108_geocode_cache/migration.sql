-- CreateTable
CREATE TABLE "GeocodeCache" (
    "query" TEXT NOT NULL,
    "found" BOOLEAN NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "label" TEXT,
    "lookedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("query")
);
