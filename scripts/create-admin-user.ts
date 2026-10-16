import { createClient } from "@supabase/supabase-js";
import type { Database, UserRole } from "../src/types/db";

/**
 * CLI script to bootstrap or elevate admin accounts (Data Day 2 & local setup).
 * Usage:
 *   npx tsx scripts/create-admin-user.ts <email> <password> <fullName> <role> [phone]
 * Roles: content_manager | resort_admin | super_admin
 */
async function main() {
  const [email, password, fullName, roleInput, phone] = process.argv.slice(2);

  if (!email || !password || !fullName || !roleInput) {
    console.error(
      "Usage: npx tsx scripts/create-admin-user.ts <email> <password> <fullName> <content_manager|resort_admin|super_admin> [phone]"
    );
    process.exit(1);
  }

  const role = roleInput.toLowerCase() as UserRole;
  if (!["content_manager", "resort_admin", "super_admin"].includes(role)) {
    console.error(`Invalid role: ${roleInput}. Must be content_manager, resort_admin, or super_admin.`);
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Creating/updating admin user: ${email} with role: ${role}...`);

  // 1. Create or fetch user in auth.users
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUser = userList?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    console.log(`User already exists in auth.users (${userId}), updating password and metadata...`);
    const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phone || null },
    });
    if (updateAuthErr) {
      console.error("Failed to update auth user:", updateAuthErr.message);
      process.exit(1);
    }
  } else {
    const { data: newUser, error: createAuthErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phone || null },
    });
    if (createAuthErr || !newUser?.user) {
      console.error("Failed to create auth user:", createAuthErr?.message);
      process.exit(1);
    }
    userId = newUser.user.id;
  }

  // 2. Insert or update public.users with elevated role
  const { error: upsertProfileErr } = await supabase
    .from("users")
    .upsert(
      {
        id: userId,
        email: email.toLowerCase(),
        full_name: fullName,
        phone: phone || null,
        role,
        is_email_verified: true,
        is_locked: false,
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (upsertProfileErr) {
    console.error("Failed to update profile in public.users:", upsertProfileErr.message);
    process.exit(1);
  }

  console.log(`✓ Admin user successfully provisioned:`);
  console.log(`  ID:       ${userId}`);
  console.log(`  Email:    ${email}`);
  console.log(`  Name:     ${fullName}`);
  console.log(`  Role:     ${role}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
