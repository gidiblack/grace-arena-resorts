import suite from "@/assets/suite.jpg";
import suite2 from "@/assets/suite2.jpg";
import hut from "@/assets/hut.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import village from "@/assets/gar-village.jpg";
import placeholder from "@/assets/hero-placeholder.jpg";

const IMAGE_MAP: Record<string, string> = {
  "/assets/suite.jpg": suite.src,
  "/assets/suite2.jpg": suite2.src,
  "/assets/hut.jpg": hut.src,
  "/assets/gar-elysian.jpg": elysian.src,
  "/assets/gar-village.jpg": village.src,
  "/assets/hero-placeholder.jpg": placeholder.src,
};

export const FALLBACK_ROOM_IMAGE = placeholder.src;

export function resolveRoomImage(imagePath?: string | null): string {
  if (!imagePath) return FALLBACK_ROOM_IMAGE;
  return IMAGE_MAP[imagePath] || imagePath;
}
