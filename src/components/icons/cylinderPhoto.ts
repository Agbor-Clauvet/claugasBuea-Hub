import cylinderRed from "@/assets/cylinders/cylinder-red-12kg.webp";
import cylinderYellow from "@/assets/cylinders/cylinder-yellow-12kg.webp";
import cylinderGreen from "@/assets/cylinders/cylinder-green-12kg.webp";

/**
 * Matches a cylinder's real product photo by the color word in its name
 * (e.g. "ClauGas 12.5kg — Red"). All cylinders are the same 12.5kg size,
 * so size can no longer be used to distinguish them — name/color is the
 * source of truth. Falls back to yellow if no color word is found.
 */
export function cylinderPhoto(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("red")) return cylinderRed;
  if (n.includes("green")) return cylinderGreen;
  if (n.includes("yellow")) return cylinderYellow;
  return cylinderYellow;
}
