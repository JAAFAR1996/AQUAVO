import type { GallerySubmission } from "./schema.js";

/** Gallery winners' private contact and redemption fields stay owner/admin-only. */
export function toPublicGallerySubmission(row: GallerySubmission) {
  return {
    id: row.id,
    customerName: row.customerName,
    imageUrl: row.imageUrl,
    tankSize: row.tankSize,
    description: row.description,
    likes: row.likes,
    isWinner: row.isWinner,
    winnerMonth: row.winnerMonth,
    prize: row.prize,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
