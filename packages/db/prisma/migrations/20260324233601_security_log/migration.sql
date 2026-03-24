-- CreateTable
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ip" TEXT,
    "email" TEXT,
    "userId" TEXT,
    "tenantId" TEXT,
    "endpoint" TEXT,
    "details" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityLog_type_createdAt_idx" ON "SecurityLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityLog_tenantId_createdAt_idx" ON "SecurityLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityLog_ip_createdAt_idx" ON "SecurityLog"("ip", "createdAt");
