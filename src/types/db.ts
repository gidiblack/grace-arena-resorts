/**
 * Grace Arena Resorts - Supabase Database TypeScript Definitions
 * Aligned with SQL Migrations 0001 - 0006 and GAR-SRS Section 6 Data Model
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "guest" | "content_manager" | "resort_admin" | "super_admin";
export type RoomTier = "budget" | "standard" | "deluxe" | "executive" | "presidential" | "royal";
export type RoomTypeStatus = "available" | "under_construction";
export type RoomUnitStatus = "available" | "occupied" | "maintenance";
export type BookingStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
export type PaymentStatus = "pending" | "success" | "failed" | "refunded" | "partially_refunded";
export type DiscountType = "percentage" | "fixed";
export type DealCategory = "room" | "dining" | "package" | "seasonal";
export type MenuCategory = "starter" | "main" | "dessert" | "beverage";
export type GemCategory = "nature" | "culture" | "adventure" | "spiritual";
export type EventCategoryName = "weddings" | "shoots" | "celebrations" | "team_bonding";
export type InquiryStatus = "new" | "in_review" | "responded" | "closed";
export type ContactStatus = "new" | "read" | "responded" | "closed";
export type AmenityCategory = "general" | "bathroom" | "entertainment" | "outdoor";
export type MediaCategory = "gallery" | "room" | "facility" | "restaurant" | "event" | "deal";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string | null;
          full_name: string;
          phone: string | null;
          role: UserRole;
          is_email_verified: boolean;
          is_locked: boolean;
          failed_login_attempts: number;
          locked_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          password_hash?: string | null;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
          is_email_verified?: boolean;
          is_locked?: boolean;
          failed_login_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      resorts: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          hero_image_id: string | null;
          features: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description: string;
          hero_image_id?: string | null;
          features?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["resorts"]["Insert"]>;
      };
      buildings: {
        Row: {
          id: string;
          resort_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resort_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["buildings"]["Insert"]>;
      };
      room_types: {
        Row: {
          id: string;
          building_id: string;
          name: string;
          tier: RoomTier;
          description: string;
          base_price: number;
          max_guests: number;
          total_units: number;
          status: RoomTypeStatus;
          amenities: Json;
          images: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          building_id: string;
          name: string;
          tier: RoomTier;
          description: string;
          base_price: number;
          max_guests?: number;
          total_units?: number;
          status?: RoomTypeStatus;
          amenities?: Json;
          images?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["room_types"]["Insert"]>;
      };
      rooms: {
        Row: {
          id: string;
          room_type_id: string;
          unit_number: string;
          floor: string | null;
          status: RoomUnitStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_type_id: string;
          unit_number: string;
          floor?: string | null;
          status?: RoomUnitStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rooms"]["Insert"]>;
      };
      seasonal_prices: {
        Row: {
          id: string;
          room_type_id: string;
          start_date: string;
          end_date: string;
          price: number;
          label: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_type_id: string;
          start_date: string;
          end_date: string;
          price: number;
          label: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seasonal_prices"]["Insert"]>;
      };
      deals: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          discount_type: DiscountType;
          discount_value: number;
          promo_code: string | null;
          start_date: string;
          end_date: string;
          is_active: boolean;
          category: DealCategory;
          applicable_room_type_ids: Json;
          images: Json;
          terms: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description: string;
          discount_type: DiscountType;
          discount_value: number;
          promo_code?: string | null;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          category?: DealCategory;
          applicable_room_type_ids?: Json;
          images?: Json;
          terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deals"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          reference: string;
          user_id: string | null;
          guest_name: string;
          guest_email: string;
          guest_phone: string;
          check_in_date: string;
          check_out_date: string;
          nights: number;
          adults: number;
          children: number;
          special_requests: string | null;
          subtotal: number;
          deal_discount: number;
          tax: number;
          total: number;
          status: BookingStatus;
          deal_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference?: string;
          user_id?: string | null;
          guest_name: string;
          guest_email: string;
          guest_phone: string;
          check_in_date: string;
          check_out_date: string;
          nights: number;
          adults?: number;
          children?: number;
          special_requests?: string | null;
          subtotal: number;
          deal_discount?: number;
          tax?: number;
          total: number;
          status?: BookingStatus;
          deal_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      booking_line_items: {
        Row: {
          id: string;
          booking_id: string;
          room_type_id: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          room_type_id: string;
          quantity?: number;
          unit_price: number;
          line_total: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["booking_line_items"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          gateway: string;
          gateway_reference: string | null;
          amount: number;
          currency: string;
          status: PaymentStatus;
          refund_amount: number | null;
          refunded_at: string | null;
          paid_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          gateway: string;
          gateway_reference?: string | null;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          refund_amount?: number | null;
          refunded_at?: string | null;
          paid_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      restaurants: {
        Row: {
          id: string;
          resort_id: string | null;
          name: string;
          slug: string;
          description: string;
          cuisine_type: string;
          operating_hours: Json;
          images: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resort_id?: string | null;
          name: string;
          slug: string;
          description: string;
          cuisine_type: string;
          operating_hours?: Json;
          images?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["restaurants"]["Insert"]>;
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          price: number;
          category: MenuCategory;
          is_available: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          price: number;
          category: MenuCategory;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
      };
      facilities: {
        Row: {
          id: string;
          resort_id: string | null;
          name: string;
          slug: string;
          description: string;
          operating_hours: Json;
          images: Json;
          is_featured: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resort_id?: string | null;
          name: string;
          slug: string;
          description: string;
          operating_hours?: Json;
          images?: Json;
          is_featured?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["facilities"]["Insert"]>;
      };
      gems: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          category: GemCategory;
          distance: string;
          duration: string;
          images: Json;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description: string;
          category: GemCategory;
          distance: string;
          duration: string;
          images?: Json;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gems"]["Insert"]>;
      };
      event_categories: {
        Row: {
          id: string;
          name: EventCategoryName;
          description: string;
          venue_options: Json;
          capacity: string;
          sample_packages: Json;
          images: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: EventCategoryName;
          description: string;
          venue_options?: Json;
          capacity: string;
          sample_packages?: Json;
          images?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_categories"]["Insert"]>;
      };
      event_inquiries: {
        Row: {
          id: string;
          event_category_id: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          preferred_date: string;
          estimated_guests: number;
          budget_range: string | null;
          special_requirements: string | null;
          status: InquiryStatus;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_category_id: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          preferred_date: string;
          estimated_guests: number;
          budget_range?: string | null;
          special_requirements?: string | null;
          status?: InquiryStatus;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_inquiries"]["Insert"]>;
      };
      contact_submissions: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          subject: string;
          message: string;
          status: ContactStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          subject: string;
          message: string;
          status?: ContactStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_submissions"]["Insert"]>;
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          is_confirmed: boolean;
          confirmed_at: string | null;
          unsubscribed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          is_confirmed?: boolean;
          confirmed_at?: string | null;
          unsubscribed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["newsletter_subscribers"]["Insert"]>;
      };
      notify_me_registrations: {
        Row: {
          id: string;
          room_type_id: string;
          email: string;
          is_notified: boolean;
          notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_type_id: string;
          email: string;
          is_notified?: boolean;
          notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notify_me_registrations"]["Insert"]>;
      };
      amenities: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          category: AmenityCategory;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string | null;
          category?: AmenityCategory;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["amenities"]["Insert"]>;
      };
      room_type_amenities: {
        Row: {
          room_type_id: string;
          amenity_id: string;
          created_at: string;
        };
        Insert: {
          room_type_id: string;
          amenity_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["room_type_amenities"]["Insert"]>;
      };
      system_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["system_settings"]["Insert"]>;
      };
      media_assets: {
        Row: {
          id: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          url: string;
          cdn_url: string | null;
          alt_text: string;
          category: MediaCategory;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          url: string;
          cdn_url?: string | null;
          alt_text?: string;
          category?: MediaCategory;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["media_assets"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity: string;
          entity_id: string;
          previous_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity: string;
          entity_id: string;
          previous_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
      failed_emails: {
        Row: {
          id: string;
          recipient: string;
          subject: string;
          template_id: string;
          template_data: Json;
          attempts: number;
          last_attempt_at: string | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipient: string;
          subject: string;
          template_id: string;
          template_data?: Json;
          attempts?: number;
          last_attempt_at?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["failed_emails"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_room_availability: {
        Args: { p_room_type_id: string; p_check_in: string; p_check_out: string };
        Returns: number;
      };
      get_effective_nightly_price: {
        Args: { p_room_type_id: string; p_night: string };
        Returns: number;
      };
      generate_booking_reference: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      room_tier: RoomTier;
      room_type_status: RoomTypeStatus;
      room_unit_status: RoomUnitStatus;
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
