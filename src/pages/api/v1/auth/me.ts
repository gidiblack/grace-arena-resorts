import { withApi } from "@/pages/api/v1/_shared/handler";
import { updateProfileSchema } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";

export default withApi(
  async (req, res, ctx) => {
    const user = ctx.user!;
    const supabase = getSupabaseAdminClient();

    if (req.method === "GET") {
      const { data: profile, error } = await supabase
        .from("users")
        .select("id, email, full_name, phone, role, is_email_verified, created_at, updated_at")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        return ok(res, {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        });
      }

      return ok(res, {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        phone: profile.phone,
        role: profile.role,
        isEmailVerified: profile.is_email_verified,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      });
    }

    if (req.method === "PUT") {
      const { fullName, phone } = req.body;
      const updates: { full_name?: string; phone?: string | null } = {};

      if (fullName) updates.full_name = fullName;
      if (phone !== undefined) updates.phone = phone;

      const { data: updated, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select("id, email, full_name, phone, role, is_email_verified, updated_at")
        .single();

      if (error) {
        return fail(res, "UPDATE_FAILED", "Failed to update profile", 500);
      }

      return ok(res, {
        id: updated.id,
        email: updated.email,
        fullName: updated.full_name,
        phone: updated.phone,
        role: updated.role,
        isEmailVerified: updated.is_email_verified,
        updatedAt: updated.updated_at,
      });
    }
  },
  {
    allowedMethods: ["GET", "PUT"],
    requireAuth: true,
    bodySchema: updateProfileSchema,
  }
);
