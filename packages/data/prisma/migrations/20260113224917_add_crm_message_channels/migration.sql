-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "channelKey" TEXT,
ADD COLUMN     "messageDirection" TEXT,
ADD COLUMN     "messageTo" TEXT,
ADD COLUMN     "openUrl" TEXT;
