-- Grace Arena Resorts v1.2 Schema Migration 0002: Row Level Security (RLS) Policies
-- Enforces Authorization Matrix from GAR-SRS Section 4.1

-- Enable RLS on all 25 public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notify_me_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_type_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_emails ENABLE ROW LEVEL SECURITY;

-- Helper functions for role checks in security context
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'role'),
    (SELECT role FROM public.users WHERE id = auth.uid()),
    'anon'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_content_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('content_manager', 'resort_admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_resort_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('resort_admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'super_admin';
$$;

-- 1. Users policies
CREATE POLICY "Users can read own profile or admins can view all"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR public.is_resort_admin());

CREATE POLICY "Users can update own profile or super admin can manage"
  ON public.users FOR UPDATE
  USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "Allow user registration or super admin creation"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "Only super admin can delete users"
  ON public.users FOR DELETE
  USING (public.is_super_admin());

-- 2. Public Catalog Read Policies (Resorts, Buildings, RoomTypes, Rooms, SeasonalPrices, Restaurants, Menus, Facilities, Gems, EventCategories, Deals, Amenities, SystemSettings, Media)
CREATE POLICY "Public read resorts" ON public.resorts FOR SELECT USING (true);
CREATE POLICY "Admins manage resorts" ON public.resorts FOR ALL USING (public.is_resort_admin());

CREATE POLICY "Public read buildings" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "Admins manage buildings" ON public.buildings FOR ALL USING (public.is_resort_admin());

CREATE POLICY "Public read room types" ON public.room_types FOR SELECT USING (true);
CREATE POLICY "Admins manage room types" ON public.room_types FOR ALL USING (public.is_resort_admin());

CREATE POLICY "Admins manage room units" ON public.rooms FOR ALL USING (public.is_resort_admin());
CREATE POLICY "Guests read available units count" ON public.rooms FOR SELECT USING (status != 'maintenance' OR public.is_resort_admin());

CREATE POLICY "Public read seasonal prices" ON public.seasonal_prices FOR SELECT USING (true);
CREATE POLICY "Admins manage seasonal prices" ON public.seasonal_prices FOR ALL USING (public.is_resort_admin());

CREATE POLICY "Public read deals" ON public.deals FOR SELECT USING (is_active = true OR public.is_content_manager());
CREATE POLICY "Content managers manage deals" ON public.deals FOR ALL USING (public.is_content_manager());

CREATE POLICY "Public read restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Content managers manage restaurants" ON public.restaurants FOR ALL USING (public.is_content_manager());

CREATE POLICY "Public read menu items" ON public.menu_items FOR SELECT USING (is_available = true OR public.is_content_manager());
CREATE POLICY "Content managers manage menu items" ON public.menu_items FOR ALL USING (public.is_content_manager());

CREATE POLICY "Public read facilities" ON public.facilities FOR SELECT USING (true);
CREATE POLICY "Content managers manage facilities" ON public.facilities FOR ALL USING (public.is_content_manager());

CREATE POLICY "Public read gems" ON public.gems FOR SELECT USING (true);
CREATE POLICY "Content managers manage gems" ON public.gems FOR ALL USING (public.is_content_manager());

CREATE POLICY "Public read event categories" ON public.event_categories FOR SELECT USING (true);
CREATE POLICY "Content managers manage event categories" ON public.event_categories FOR ALL USING (public.is_content_manager());

CREATE POLICY "Public read amenities" ON public.amenities FOR SELECT USING (true);
CREATE POLICY "Content managers manage amenities" ON public.amenities FOR ALL USING (public.is_content_manager());

CREATE POLICY "Public read room type amenities" ON public.room_type_amenities FOR SELECT USING (true);
CREATE POLICY "Content managers manage room type amenities" ON public.room_type_amenities FOR ALL USING (public.is_content_manager());

CREATE POLICY "Public read system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Super admin manages system settings" ON public.system_settings FOR ALL USING (public.is_super_admin());

CREATE POLICY "Public read media assets" ON public.media_assets FOR SELECT USING (true);
CREATE POLICY "Content managers manage media assets" ON public.media_assets FOR ALL USING (public.is_content_manager());

-- 3. Bookings & Line Items
CREATE POLICY "Guests view own bookings or managers view all"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id OR public.is_content_manager());

CREATE POLICY "Guests insert own pending booking or admins insert any"
  ON public.bookings FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND status = 'pending')
    OR public.is_resort_admin()
  );

CREATE POLICY "Guests cancel own booking or admins manage booking status"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id OR public.is_resort_admin());

CREATE POLICY "Super admins delete bookings"
  ON public.bookings FOR DELETE
  USING (public.is_super_admin());

CREATE POLICY "Read booking line items"
  ON public.booking_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_line_items.booking_id
        AND (b.user_id = auth.uid() OR public.is_content_manager())
    )
  );

CREATE POLICY "Insert booking line items"
  ON public.booking_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_line_items.booking_id
        AND (b.user_id = auth.uid() OR public.is_resort_admin())
    )
  );

CREATE POLICY "Admins manage booking line items"
  ON public.booking_line_items FOR ALL
  USING (public.is_resort_admin());

-- 4. Payments
CREATE POLICY "View payments for own bookings or managers view all"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id
        AND (b.user_id = auth.uid() OR public.is_content_manager())
    )
  );

CREATE POLICY "Create payments for bookings"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id
        AND (b.user_id = auth.uid() OR public.is_resort_admin())
    )
  );

CREATE POLICY "Admins manage payments"
  ON public.payments FOR UPDATE
  USING (public.is_resort_admin());

-- 5. Public Submissions (Event inquiries, contact form, newsletter, notify-me)
CREATE POLICY "Public can submit event inquiries"
  ON public.event_inquiries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Managers can view event inquiries"
  ON public.event_inquiries FOR SELECT
  USING (public.is_content_manager());

CREATE POLICY "Admins can manage event inquiries"
  ON public.event_inquiries FOR ALL
  USING (public.is_resort_admin());

CREATE POLICY "Public can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view contact submissions"
  ON public.contact_submissions FOR SELECT
  USING (public.is_resort_admin() OR (auth.uid() IS NOT NULL AND auth.uid() = user_id));

CREATE POLICY "Admins manage contact submissions"
  ON public.contact_submissions FOR UPDATE
  USING (public.is_resort_admin());

CREATE POLICY "Public subscribe and unsubscribe newsletter"
  ON public.newsletter_subscribers FOR ALL
  USING (true);

CREATE POLICY "Public submit notify-me registrations"
  ON public.notify_me_registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view notify-me registrations"
  ON public.notify_me_registrations FOR SELECT
  USING (public.is_resort_admin());

CREATE POLICY "Admins manage notify-me registrations"
  ON public.notify_me_registrations FOR ALL
  USING (public.is_resort_admin());

-- 6. Audit Logs & Failed Emails
CREATE POLICY "Admins view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_resort_admin());

CREATE POLICY "Super admin manages failed emails"
  ON public.failed_emails FOR ALL
  USING (public.is_super_admin());
