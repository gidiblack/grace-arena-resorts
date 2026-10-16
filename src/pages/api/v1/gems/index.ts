import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_GEMS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { GemCategory } from "@/types/db";

const createGemSchema = z.object({
  name: z.string().trim().min(2, "Gem name is required").max(100),
  slug: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(5),
  category: z.enum(["nature", "culture", "adventure", "spiritual"]),
  distance: z.string().trim().min(1, "Distance is required").max(50),
  duration: z.string().trim().min(1, "Duration is required").max(50),
  images: z.array(z.any()).default([]),
  is_featured: z.boolean().default(false),
});

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List gems
    // ==========================================
    if (req.method === "GET") {
      const { category } = req.query;

      let query = supabase.from("gems").select("*");

      if (category && typeof category === "string" && category !== "all") {
        query = query.eq("category", category as GemCategory);
      }

      const { data: dbGems } = await query.order("created_at", { ascending: false });

      if (dbGems && dbGems.length > 0) {
        return ok(res, dbGems, 200, { total: dbGems.length });
      }

      let gems: Array<Record<string, unknown>> = [...MOCK_GEMS];
      if (category && typeof category === "string" && category !== "all") {
        gems = gems.filter(
          (g) => typeof g.category === "string" && g.category.toLowerCase() === category.toLowerCase()
        );
      }

      return ok(res, gems, 200, { total: gems.length });
    }

    // ==========================================
    // POST: Create gem (Content Manager+)
    // ==========================================
    if (req.method === "POST") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only content managers and administrators can create gems", 403);
      }

      const body = req.body as z.infer<typeof createGemSchema>;
      const slug =
        body.slug ||
        body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const { data: newGem, error: insertErr } = await supabase
        .from("gems")
        .insert({
          name: body.name,
          slug,
          description: body.description,
          category: body.category as GemCategory,
          distance: body.distance,
          duration: body.duration,
          images: body.images,
          is_featured: body.is_featured,
        })
        .select()
        .single();

      if (insertErr || !newGem) {
        return fail(res, "CREATE_FAILED", insertErr?.message || "Failed to create gem", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "CREATE_GEM",
        entity: "gems",
        entityId: newGem.id,
        previousData: null,
        newData: newGem,
        req,
      });

      return ok(res, newGem, 201);
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: createGemSchema,
  }
);
