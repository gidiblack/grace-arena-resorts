import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

const DEFAULT_PAGE_CONTENT: Record<string, Record<string, unknown>> = {
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
  facilities: {
    heroTitle: "Exceptional Amenities & Sacred Spaces",
    intro:
      "From our dedicated Prayer Hut sanctuary to our Olympic swimming pool and fitness center, each space is designed for refreshment.",
  },
  gems: {
    heroTitle: "Discover the Wonders of Igbo-Ora",
    intro:
      "Explore historical monoliths, twin capital cultural heritage, hiking trails, and peaceful nature walks in Ibarapa.",
  },
  events: {
    heroTitle: "Host Meaningful Gatherings in Sacred Grounds",
    intro:
      "Grace Arena Resorts hosts faith-aligned weddings, photography and film shoots, spiritual retreats, and corporate bonding.",
  },
  privacy: {
    title: "Privacy Policy (NDPR & NDPA Compliant)",
    effectiveDate: "2026-01-01",
    dpoContact: "dpo@gracearenaresorts.com",
    content:
      "At Grace Arena Resorts, we are committed to protecting the privacy, confidentiality, and security of all guest personal data in accordance with the Nigeria Data Protection Act 2023 (NDPA).",
  },
  terms: {
    title: "Terms and Conditions of Stay",
    alcoholPolicy:
      "Grace Arena Resorts is a consecrated, alcohol-free Christian hospitality environment.",
    cancellationPolicy: "Full refund up to 72 hours prior to scheduled check-in.",
  },
};

export default withApi(
  async (req, res, ctx) => {
    const { page } = req.query;

    if (!page || typeof page !== "string") {
      return fail(res, "BAD_REQUEST", "Page identifier is required", 400);
    }

    const pageKey = page.toLowerCase();
    const settingKey = `content_page_${pageKey}`;
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: Retrieve page content
    // ==========================================
    if (req.method === "GET") {
      const { data: setting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", settingKey)
        .maybeSingle();

      if (setting?.value) {
        try {
          const parsed = JSON.parse(setting.value);
          return ok(res, parsed);
        } catch {
          return ok(res, { content: setting.value });
        }
      }

      if (DEFAULT_PAGE_CONTENT[pageKey]) {
        return ok(res, DEFAULT_PAGE_CONTENT[pageKey]);
      }

      return fail(res, "NOT_FOUND", `Content for page '${page}' not found`, 404);
    }

    // ==========================================
    // PUT: Update page content (Content Manager+)
    // ==========================================
    if (req.method === "PUT") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only content managers and administrators can edit page content", 403);
      }

      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        return fail(res, "BAD_REQUEST", "Valid JSON payload is required", 400);
      }

      const serializedValue = JSON.stringify(payload);

      const { data: existing } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", settingKey)
        .maybeSingle();

      const { error: upsertErr } = await supabase
        .from("system_settings")
        .upsert(
          {
            key: settingKey,
            value: serializedValue,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (upsertErr) {
        return fail(res, "UPDATE_FAILED", "Failed to update page content", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_PAGE_CONTENT",
        entity: "content_pages",
        entityId: pageKey,
        previousData: existing?.value ? JSON.parse(existing.value) : DEFAULT_PAGE_CONTENT[pageKey] || null,
        newData: payload,
        req,
      });

      return ok(res, {
        page: pageKey,
        content: payload,
        message: `Content for '${pageKey}' has been updated and published.`,
      });
    }
  },
  {
    allowedMethods: ["GET", "PUT"],
  }
);
