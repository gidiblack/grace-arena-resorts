import { z } from "zod";
import { withApi } from "../../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { UserRole } from "@/types/db";

const createUserSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  role: z.enum(["guest", "content_manager", "resort_admin", "super_admin"]),
  phone: z.string().trim().max(20).optional().nullable(),
});

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ----------------------------------------------------
    // GET: List users (Super Admin only)
    // ----------------------------------------------------
    if (req.method === "GET") {
      const { role, search, page = "1", limit = "20" } = req.query;

      const pageNum = Math.max(1, parseInt(typeof page === "string" ? page : "1", 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(typeof limit === "string" ? limit : "20", 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from("users")
        .select("id, email, full_name, phone, role, is_email_verified, is_locked, created_at, updated_at", {
          count: "exact",
        });

      if (role && typeof role === "string" && role !== "all") {
        query = query.eq("role", role as UserRole);
      }

      if (search && typeof search === "string" && search.trim()) {
        const term = search.trim();
        query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
      }

      const { data: users, count, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) {
        return fail(res, "FETCH_USERS_ERROR", "Failed to retrieve users", 500);
      }

      return ok(res, users || [], 200, {
        total: count ?? 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((count ?? 0) / limitNum),
      });
    }

    // ----------------------------------------------------
    // POST: Create Admin User (Super Admin only)
    // ----------------------------------------------------
    if (req.method === "POST") {
      const body = req.body as z.infer<typeof createUserSchema>;

      // Check if user already exists in public.users
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", body.email.toLowerCase().trim())
        .maybeSingle();

      if (existingUser) {
        return fail(res, "USER_EXISTS", `A user with email '${body.email}' already exists`, 409);
      }

      // Create in Supabase Auth
      const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
        email: body.email.toLowerCase().trim(),
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.fullName,
          phone: body.phone || null,
        },
      });

      if (authError || !authResult.user) {
        return fail(res, "AUTH_CREATION_FAILED", authError?.message || "Failed to create user account", 400);
      }

      const userId = authResult.user.id;

      // Upsert profile in public.users
      const { data: newProfile, error: profileError } = await supabase
        .from("users")
        .upsert(
          {
            id: userId,
            email: body.email.toLowerCase().trim(),
            full_name: body.fullName,
            phone: body.phone || null,
            role: body.role,
            is_email_verified: true,
            is_locked: false,
            failed_login_attempts: 0,
            locked_until: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (profileError || !newProfile) {
        return fail(res, "PROFILE_CREATION_FAILED", "User created in auth but profile setup failed", 500);
      }

      // Record audit log
      if (ctx.user) {
        await recordAuditLog({
          userId: ctx.user.id,
          action: "CREATE_ADMIN_USER",
          entity: "users",
          entityId: userId,
          previousData: null,
          newData: { email: body.email, role: body.role, fullName: body.fullName },
          req,
        });
      }

      return ok(
        res,
        {
          id: userId,
          email: newProfile.email,
          fullName: newProfile.full_name,
          role: newProfile.role,
          message: `User '${newProfile.email}' successfully created with role '${newProfile.role}'.`,
        },
        201
      );
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    requiredRoles: ["super_admin"],
    bodySchema: createUserSchema,
  }
);
