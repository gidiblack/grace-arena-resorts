import type { NextApiRequest } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import type { Json } from "@/types/db";

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  previousData?: Json | null;
  newData?: Json | null;
  req?: NextApiRequest;
}

/**
 * Creates an immutable audit log record in public.audit_logs
 */
export async function recordAuditLog({
  userId,
  action,
  entity,
  entityId,
  previousData = null,
  newData = null,
  req,
}: CreateAuditLogParams): Promise<void> {
  try {
    const ipAddress = req ? getClientIp(req) : null;
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("audit_logs").insert({
      user_id: userId || null,
      action,
      entity,
      entity_id: entityId,
      previous_data: previousData,
      new_data: newData,
      ip_address: ipAddress,
    });

    if (error) {
      logger.error("Failed to write database audit log", { error, action, entity, entityId });
    }
  } catch (err) {
    logger.error("Unexpected error recording audit log", { err });
  }
}
