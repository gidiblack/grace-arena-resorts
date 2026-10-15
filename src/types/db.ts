/**
 * Grace Arena Resorts - Supabase Database TypeScript Definitions
 * Aligned with SQL Migrations 0001 - 0006 and GAR-SRS Section 6 Data Model
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "guest" | "content_manager" | "resort_admin" | "super_admin";
export type RoomTier =
  "budget" | "standard" | "deluxe" | "premium" | "executive" | "presidential" | "royal";
export type RoomTypeStatus = "available" | "under_construction";
export type RoomUnitStatus = "available" | "occupied" | "maintenance";
export type BookingStatus =
  "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
export type PaymentStatus =
  "pending" | "success" | "failed" | "refund_pending" | "refunded" | "partially_refunded";
export type AuthTokenPurpose =
  | "email_verification"
  | "password_reset"
  | "newsletter_confirm"
  | "newsletter_unsubscribe"
  | "booking_access";
export type BookingChannel = "online_guest" | "online_account" | "walk_in";
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      room_types: {
        Row: {
          id: string;
          building_id: string;
          slug: string;
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
          slug: string;
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
          hold_expires_at: string | null;
          channel: BookingChannel;
          privacy_consent_at: string | null;
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
          hold_expires_at?: string | null;
          channel?: BookingChannel;
          privacy_consent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      event_inquiries: {
        Row: {
          id: string;
          event_category_id: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          preferred_date: string | null;
          estimated_guests: number | null;
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
          preferred_date?: string | null;
          estimated_guests?: number | null;
          budget_range?: string | null;
          special_requirements?: string | null;
          status?: InquiryStatus;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_inquiries"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
          retry_handler: string | null;
          retry_params: Json;
          next_attempt_at: string | null;
          sent_at: string | null;
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
          retry_handler?: string | null;
          retry_params?: Json;
          next_attempt_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["failed_emails"]["Insert"]>;
        Relationships: [];
      };
      auth_tokens: {
        Row: {
          id: string;
          token_hash: string;
          purpose: AuthTokenPurpose;
          user_id: string | null;
          booking_id: string | null;
          email: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token_hash: string;
          purpose: AuthTokenPurpose;
          user_id?: string | null;
          booking_id?: string | null;
          email: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["auth_tokens"]["Insert"]>;
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: string;
          provider: string;
          event_key: string;
          event_type: string;
          payload: Json;
          attempts: number;
          processed_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          event_key: string;
          event_type: string;
          payload?: Json;
          attempts?: number;
          processed_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["webhook_events"]["Insert"]>;
        Relationships: [];
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
      booking_hold_minutes: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_booking_with_lock: {
        Args: {
          p_reference: string;
          p_user_id: string | null;
          p_status: BookingStatus;
          p_channel: BookingChannel;
          p_guest_name: string;
          p_guest_email: string;
          p_guest_phone: string;
          p_check_in: string;
          p_check_out: string;
          p_nights: number;
          p_adults: number;
          p_children: number;
          p_special_requests: string | null;
          p_subtotal: number;
          p_deal_discount: number;
          p_tax: number;
          p_total: number;
          p_deal_id: string | null;
          p_privacy_consent_at: string | null;
          p_line_items: Json;
          p_max_pending_holds?: number;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      link_guest_bookings: {
        Args: { p_user_id: string; p_email: string };
        Returns: number;
      };
      get_stay_availability: {
        Args: { p_check_in: string; p_check_out: string; p_resort?: string | null };
        Returns: Array<{
          id: string;
          slug: string;
          name: string;
          tier: RoomTier;
          base_price: number;
          max_guests: number;
          total_units: number;
          status: RoomTypeStatus;
          images: Json;
          building_name: string;
          resort_slug: string;
          resort_name: string;
          available_units: number;
          seasonal_prices: Json;
        }>;
      };
      expire_stale_pending_bookings: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    CompositeTypes: Record<string, never>;
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

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
