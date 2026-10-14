-- Grace Arena Resorts Seed Data for Local Development and Staging

-- 1. Demo Staff & Guest Accounts (Linked with auth.users if available, otherwise direct in public.users)
-- Passwords hashed with bcrypt cost factor 12: 'Password123!' -> $2b$12$e8tQdUkJpYq7wI4zK52fEuO2k2M/tSjI7F60W10c3mQYtq2a3Kq.y
INSERT INTO public.users (id, email, password_hash, full_name, phone, role, is_email_verified)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'superadmin@gracearenaresorts.com', '$2b$12$e8tQdUkJpYq7wI4zK52fEuO2k2M/tSjI7F60W10c3mQYtq2a3Kq.y', 'Chief Executive Officer', '+2348011112222', 'super_admin', true),
  ('00000000-0000-0000-0000-000000000002', 'admin@gracearenaresorts.com', '$2b$12$e8tQdUkJpYq7wI4zK52fEuO2k2M/tSjI7F60W10c3mQYtq2a3Kq.y', 'Resort General Manager', '+2348033334444', 'resort_admin', true),
  ('00000000-0000-0000-0000-000000000003', 'content@gracearenaresorts.com', '$2b$12$e8tQdUkJpYq7wI4zK52fEuO2k2M/tSjI7F60W10c3mQYtq2a3Kq.y', 'Media & Content Lead', '+2348055556666', 'content_manager', true),
  ('00000000-0000-0000-0000-000000000004', 'guest@example.com', '$2b$12$e8tQdUkJpYq7wI4zK52fEuO2k2M/tSjI7F60W10c3mQYtq2a3Kq.y', 'Dr. Samuel Adebayo', '+2348077778888', 'guest', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Resorts
INSERT INTO public.resorts (id, name, slug, description, features)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'GAR Elysian', 'gar-elysian', 'Our flagship luxury resort campus offering modern elegance, world-class amenities, and serene comfort.', '["Fine Dining", "Modern Mall", "Recreation Park", "Swimming Pool", "High-speed WiFi"]'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'GAR Village', 'gar-village', 'An authentic African thatched sanctuary where cultural architecture harmonizes with peaceful prayer and relaxation.', '["Village Cuisine", "Thatched Huts", "Prayer Hut", "Love Garden", "Fire Pit"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 3. Buildings
INSERT INTO public.buildings (id, resort_id, name, description)
VALUES
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'The Fountain Haven', 'Modern luxury suites overlooking the serenity central fountain.'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Elysian Suites Tower', 'High-ceiling suites featuring contemporary architecture and panoramic resort views.'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Village Thatched Enclave', 'Authentic eco-friendly thatched huts nested around lush gardens.'),
  ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222', 'Presidential Court', 'Grand signature thatched estates currently under bespoke architectural completion.')
ON CONFLICT (id) DO NOTHING;

-- 4. Room Types
INSERT INTO public.room_types (id, building_id, name, tier, description, base_price, max_guests, total_units, status, amenities, images)
VALUES
  (
    '44444444-4444-4444-4444-444444444401',
    '33333333-3333-3333-3333-333333333333',
    'Standard Thatched Hut',
    'standard',
    'Comfortable rustic thatched hut designed for couples and solo retreat guests seeking authentic tranquility.',
    45000,
    2,
    10,
    'available',
    '[
      {"name": "King Bed", "category": "in-room", "isConditional": false},
      {"name": "En-Suite Walk-in Shower", "category": "in-room", "isConditional": false},
      {"name": "Air Conditioning", "category": "in-room", "isConditional": false},
      {"name": "Prayer & Meditation Hut Access", "category": "resort-level", "isConditional": true},
      {"name": "Complimentary Breakfast", "category": "resort-level", "isConditional": false}
    ]'::jsonb,
    '["/images/rooms/village-standard.jpg"]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '33333333-3333-3333-3333-333333333333',
    'Executive Thatched Hut',
    'executive',
    'Spacious thatched accommodation with dedicated lounge, garden terrace, and premium finishes.',
    75000,
    3,
    8,
    'available',
    '[
      {"name": "King Bed + Daybed", "category": "in-room", "isConditional": false},
      {"name": "Private Garden Terrace", "category": "in-room", "isConditional": false},
      {"name": "Smart TV & Satellite Channels", "category": "in-room", "isConditional": false},
      {"name": "Prayer & Meditation Hut Access", "category": "resort-level", "isConditional": true},
      {"name": "Resort Wide High-Speed WiFi", "category": "resort-level", "isConditional": false}
    ]'::jsonb,
    '["/images/rooms/village-executive.jpg"]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '33333333-3333-3333-3333-333333333334',
    'Presidential Thatched Hut',
    'presidential',
    'Majestic multi-room traditional palatial hut featuring private courtyard, plunge pool, and dedicated butler service.',
    0,
    4,
    2,
    'under_construction',
    '[
      {"name": "Master Suite + Guest Suite", "category": "in-room", "isConditional": false},
      {"name": "Private Heated Plunge Pool", "category": "in-room", "isConditional": false},
      {"name": "Executive Lounge & Dining Room", "category": "in-room", "isConditional": false},
      {"name": "Dedicated Butler Service", "category": "resort-level", "isConditional": true}
    ]'::jsonb,
    '["/images/rooms/village-presidential.jpg"]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444404',
    '33333333-3333-3333-3333-333333333334',
    'Royal Thatched Hut',
    'royal',
    'The pinnacle of African royal hospitality with sprawling indoor-outdoor spaces, state room, and private chapel garden.',
    0,
    6,
    1,
    'under_construction',
    '[
      {"name": "Three En-Suite Bedrooms", "category": "in-room", "isConditional": false},
      {"name": "Private Chapel Garden", "category": "in-room", "isConditional": false},
      {"name": "Bespoke Chef & Concierge Service", "category": "resort-level", "isConditional": true}
    ]'::jsonb,
    '["/images/rooms/village-royal.jpg"]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444405',
    '33333333-3333-3333-3333-333333333331',
    'Standard Suite',
    'standard',
    'Modern stylish suite equipped with ergonomic workstation, luxury bath, and serene courtyard views.',
    60000,
    2,
    12,
    'available',
    '[
      {"name": "Queen Bed", "category": "in-room", "isConditional": false},
      {"name": "Workstation & High-Speed WiFi", "category": "in-room", "isConditional": false},
      {"name": "Rain Shower", "category": "in-room", "isConditional": false},
      {"name": "Gym & Pool Access", "category": "resort-level", "isConditional": false}
    ]'::jsonb,
    '["/images/rooms/elysian-standard.jpg"]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444406',
    '33333333-3333-3333-3333-333333333331',
    'Deluxe Suite',
    'deluxe',
    'Expansive suite with private balcony, deep soaking tub, mini bar, and espresso machine.',
    90000,
    2,
    10,
    'available',
    '[
      {"name": "King Bed", "category": "in-room", "isConditional": false},
      {"name": "Private Fountain-View Balcony", "category": "in-room", "isConditional": false},
      {"name": "Soaking Bathtub & Robes", "category": "in-room", "isConditional": false},
      {"name": "Modern Mall & Spa Privileges", "category": "resort-level", "isConditional": true}
    ]'::jsonb,
    '["/images/rooms/elysian-deluxe.jpg"]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444407',
    '33333333-3333-3333-3333-333333333332',
    'Executive Suite',
    'executive',
    'Corner penthouse suite boasting wraparound windows, separate conference lounge, and personalized concierge.',
    130000,
    4,
    6,
    'available',
    '[
      {"name": "Master King Suite + Living Room", "category": "in-room", "isConditional": false},
      {"name": "Dining Area for 6", "category": "in-room", "isConditional": false},
      {"name": "Whirlpool Jacuzzi", "category": "in-room", "isConditional": false},
      {"name": "Priority Table at Elysian Restaurant", "category": "resort-level", "isConditional": true}
    ]'::jsonb,
    '["/images/rooms/elysian-executive.jpg"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Individual Room Units
INSERT INTO public.rooms (room_type_id, unit_number, floor, status)
VALUES
  ('44444444-4444-4444-4444-444444444401', 'V-ST-101', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444401', 'V-ST-102', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444401', 'V-ST-103', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444401', 'V-ST-104', 'Ground', 'maintenance'),
  ('44444444-4444-4444-4444-444444444402', 'V-EX-201', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444402', 'V-EX-202', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444405', 'E-ST-101', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444405', 'E-ST-102', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444406', 'E-DL-201', '2nd Floor', 'available'),
  ('44444444-4444-4444-4444-444444444406', 'E-DL-202', '2nd Floor', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'E-EX-301', 'Penthouse', 'available')
ON CONFLICT (room_type_id, unit_number) DO NOTHING;

-- 6. Seasonal Pricing (Peak season +15-20%)
INSERT INTO public.seasonal_prices (room_type_id, start_date, end_date, price, label)
VALUES
  ('44444444-4444-4444-4444-444444444401', '2026-12-15', '2027-01-05', 55000, 'Christmas & New Year Peak'),
  ('44444444-4444-4444-4444-444444444402', '2026-12-15', '2027-01-05', 90000, 'Christmas & New Year Peak'),
  ('44444444-4444-4444-4444-444444444405', '2026-12-15', '2027-01-05', 75000, 'Christmas & New Year Peak'),
  ('44444444-4444-4444-4444-444444444406', '2026-12-15', '2027-01-05', 110000, 'Christmas & New Year Peak')
ON CONFLICT DO NOTHING;

-- 7. Resort-level Amenities (Entity)
INSERT INTO public.amenities (id, name, icon, category, sort_order)
VALUES
  ('55555555-5555-5555-5555-555555555501', 'Free High-Speed Wi-Fi', 'wifi', 'general', 1),
  ('55555555-5555-5555-5555-555555555502', 'Prayer & Meditation Sanctuary', 'heart', 'general', 2),
  ('55555555-5555-5555-5555-555555555503', 'Outdoor Swimming Pool & Lounges', 'waves', 'outdoor', 3),
  ('55555555-5555-5555-5555-555555555504', 'Modern Mall & Arcade Center', 'store', 'entertainment', 4),
  ('55555555-5555-5555-5555-555555555505', 'Recreation Park & Soccer Pitch', 'activity', 'outdoor', 5),
  ('55555555-5555-5555-5555-555555555506', '24/7 Uninterrupted Clean Power', 'zap', 'general', 6),
  ('55555555-5555-5555-5555-555555555507', 'Fine Dining & Cultural Cuisine', 'utensils', 'entertainment', 7),
  ('55555555-5555-5555-5555-555555555508', '24/7 Gated Security & Surveillance', 'shield', 'general', 8)
ON CONFLICT (id) DO NOTHING;

-- 8. Deals
INSERT INTO public.deals (id, title, slug, description, discount_type, discount_value, promo_code, start_date, end_date, is_active, category, applicable_room_type_ids, terms)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Easter Retreat Special',
    'easter-retreat-special',
    'Celebrate the sacred season with 10% off your peaceful stay across all standard and executive rooms.',
    'percentage',
    10,
    'EASTER10',
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '60 days',
    true,
    'room',
    '["44444444-4444-4444-4444-444444444401", "44444444-4444-4444-4444-444444444402", "44444444-4444-4444-4444-444444444405", "44444444-4444-4444-4444-444444444406"]'::jsonb,
    'Valid on stays of 2 nights or more. Cannot be combined with other promotional deals.'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Welcome Discovery Voucher',
    'welcome-discovery-voucher',
    'Enjoy an instant ₦5,000 deduction on your first direct booking.',
    'fixed',
    5000,
    'WELCOME5K',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '90 days',
    true,
    'room',
    '[]'::jsonb,
    'Applies to entire booking total for verified guests.'
  )
ON CONFLICT (id) DO NOTHING;

-- 9. System Settings
INSERT INTO public.system_settings (key, value)
VALUES
  ('tax_rate', '0.075'),
  ('checkin_time', '14:00'),
  ('checkout_time', '11:00'),
  ('pending_booking_expiry_minutes', '30'),
  ('whatsapp_number', '2348012345678'),
  ('contact_email', 'info@gracearenaresorts.com'),
  ('contact_phone', '+234 801 234 5678'),
  ('map_coordinates', '6.5244,3.3792')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
