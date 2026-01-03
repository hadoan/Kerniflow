-- AlterTable
ALTER TABLE "AgentRun" ADD COLUMN     "traceId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "traceId" TEXT;

-- AlterTable
ALTER TABLE "ToolExecution" ADD COLUMN     "traceId" TEXT;
