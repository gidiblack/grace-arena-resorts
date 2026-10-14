import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail } from "@/lib/http/response";

const PAGE_CONTENT: Record<string, Record<string, unknown>> = {
  home: {
    heroTitle: "Your Comfort, Our Sacred Priority",
    tagline: "A Serene Christian Retreat in Igbo-Ora, Nigeria",
    campuses: [
      {
        name: "GAR Elysian",
        tier: "Luxury Suites",
        buildings: ["Fountain Haven", "Oasis Villa", "The Cabana"],
      },
      {
        name: "GAR Village",
        tier: "Rustic Thatched Huts",
        buildings: ["Executive Huts", "Presidential Huts", "Royal Huts"],
      },
    ],
  },
  about: {
    heroTitle: "A Sanctuary Built on Faith and Serenity",
    tagline: "Our Story, Vision and Foundations in Igbo-Ora",
    mission:
      "To provide an oasis of rest, spiritual renewal, and Christian hospitality where families, ministers, and travelers reconnect with peace.",
    vision:
      "To be Nigeria's premier faith-aligned luxury eco-resort, celebrated for world-class hospitality and cultural preservation.",
    values: [
      { title: "Faith & Integrity", desc: "Honoring Christ in all operations and hospitality." },
      { title: "Quiet Sanctuary", desc: "Protecting tranquility and stillness for reflection." },
      { title: "Cultural Excellence", desc: "Showcasing authentic thatched African heritage." },
      { title: "Generous Service", desc: "Warm, unhurried, and dedicated guest care." },
    ],
  },
  contact: {
    address: "Grace Arena Resorts, Igbo-Ora, Ibarapa Central Local Government, Oyo State, Nigeria",
    phone: "+2348123456789",
    email: "info@gracearenaresorts.com",
    checkInTime: "14:00",
    checkOutTime: "11:00",
  },
  privacy: {
    title: "Privacy Policy (NDPR & NDPA Compliant)",
    effectiveDate: "2026-01-01",
    dpoContact: "dpo@gracearenaresorts.com",
  },
  terms: {
    title: "Terms and Conditions of Stay",
    alcoholPolicy:
      "Grace Arena Resorts is a consecrated, alcohol-free Christian hospitality environment.",
    cancellationPolicy: "Full refund up to 48 hours prior to scheduled check-in.",
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const { page } = req.query;
  if (!page || typeof page !== "string" || !PAGE_CONTENT[page]) {
    return fail(res, "NOT_FOUND", `Content for page '${page}' not found`, 404);
  }

  return ok(res, PAGE_CONTENT[page]);
}
