import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

const updateSettingsSchema = z.record(z.string(), z.string());

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ----------------------------------------------------
    // GET: Retrieve all system settings
    // ----------------------------------------------------
    if (req.method === "GET") {
      const { data: settings, error } = await supabase
        .from("system_settings")
        .select("key, value, updated_at");

      if (error) {
        return fail(res, "FETCH_SETTINGS_FAILED", "Failed to retrieve system settings", 500);
      }

      const settingsMap: Record<string, string> = {};
      for (const item of settings || []) {
        settingsMap[item.key] = item.value;
      }

      return ok(res, settingsMap);
    }

    // ----------------------------------------------------
    // PUT: Update system settings (Super Admin only)
    // ----------------------------------------------------
    if (req.method === "PUT") {
      const currentAdmin = ctx.user;
      if (!currentAdmin) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }

      const updates = req.body as Record<string, string>;
      const keys = Object.keys(updates);

      if (keys.length === 0) {
        return fail(res, "EMPTY_PAYLOAD", "No settings provided for update", 400);
      }

      // Fetch existing values for audit log
      const { data: existingRows } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", keys);

      const previousData: Record<string, string> = {};
      for (const row of existingRows || []) {
        previousData[row.key] = row.value;
      }

      // Upsert each key/value
      const upsertPayload = keys.map((key) => ({
        key,
        value: String(updates[key]),
        updated_by: currentAdmin.id,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from("system_settings")
        .upsert(upsertPayload, { onConflict: "key" });

      if (upsertErr) {
        return fail(res, "UPDATE_SETTINGS_FAILED", "Failed to persist updated settings", 500);
      }

      await recordAuditLog({
        userId: currentAdmin.id,
        action: "UPDATE_SYSTEM_SETTINGS",
        entity: "system_settings",
        entityId: "system",
        previousData,
        newData: updates,
        req,
      });

      return ok(res, {
        settings: updates,
        message: `Successfully updated ${keys.length} system setting(s).`,
      });
    }
  },
  {
    allowedMethods: ["GET", "PUT"],
    requiredRoles: ["super_admin"],
    bodySchema: updateSettingsSchema,
  }
);
