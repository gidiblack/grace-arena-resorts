/**
 * Identifies an upload by its leading bytes (magic numbers) rather than the client-declared
 * MIME type or file extension. Returns null for anything outside the media allow-list.
 */
export type SniffedMimeType =
  "image/jpeg" | "image/png" | "image/webp" | "image/avif" | "video/mp4";

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

export function sniffMimeType(bytes: Uint8Array): SniffedMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  ) {
    return "image/png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  // ISO base media file format: [size:4]["ftyp"][major brand:4]
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "dash"].includes(brand))
      return "video/mp4";
  }
  return null;
}
