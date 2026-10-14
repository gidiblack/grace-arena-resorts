import { z } from "zod";

export const step1DatesGuestsSchema = z.object({
  checkInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in date must be in YYYY-MM-DD format"),
  nights: z.number().int().min(1, "Minimum stay is 1 night").max(30, "Maximum stay is 30 nights"),
  adults: z.number().int().min(1, "At least 1 adult is required").max(10, "Maximum 10 adults"),
  children: z.number().int().min(0).max(10, "Maximum 10 children").default(0),
});

export const step3GuestSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().regex(/^\+234\d{10}$/, "Phone number must be in +234XXXXXXXXXX format"),
  specialRequests: z.string().max(500, "Special requests cannot exceed 500 characters").optional(),
  prayerHutSession: z.boolean().default(false),
});

export const dealValidationSchema = z.object({
  code: z.string().min(1, "Deal code is required"),
});
