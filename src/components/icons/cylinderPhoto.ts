import cylinderRed from "@/assets/cylinders/cylinder-red-12kg.webp";
import cylinderYellow from "@/assets/cylinders/cylinder-yellow-12kg.webp";
import cylinderGreen from "@/assets/cylinders/cylinder-green-12kg.webp";

/**
 * Real product photos, mapped by size tier. Update this mapping if the
 * actual size-to-color pairing changes (e.g. if red is used for a
 * different size than Small).
 */
export function cylinderPhoto(sizeKg: number): string {
  if (sizeKg <= 6) return cylinderRed;
  if (sizeKg <= 13) return cylinderYellow;
  return cylinderGreen;
}
