/*
  Warnings:

  - You are about to drop the column `barcode` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `batchNumber` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `brandName` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `expiryDate` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `genericName` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `manufacturer` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `prescriptionRequired` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `reorderLevel` on the `Medicine` table. All the data in the column will be lost.
  - Added the required column `category` to the `Medicine` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Medicine" DROP CONSTRAINT "Medicine_categoryId_fkey";

-- DropIndex
DROP INDEX "Medicine_barcode_key";

-- AlterTable
ALTER TABLE "Medicine" DROP COLUMN "barcode",
DROP COLUMN "batchNumber",
DROP COLUMN "brandName",
DROP COLUMN "categoryId",
DROP COLUMN "expiryDate",
DROP COLUMN "genericName",
DROP COLUMN "imageUrl",
DROP COLUMN "manufacturer",
DROP COLUMN "prescriptionRequired",
DROP COLUMN "reorderLevel",
ADD COLUMN     "category" TEXT NOT NULL;
