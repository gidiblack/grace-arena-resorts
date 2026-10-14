-- Grace Arena Resorts v1.2 Schema Migration 0004: Seed Reference Data
-- Seed resorts, buildings, room types, units, dual amenities, dining, facilities, gems, events, and settings

-- 1. Resorts
INSERT INTO public.resorts (id, name, slug, description, features)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'GAR Elysian', 'gar-elysian', 'Our flagship luxury resort campus offering modern elegance, world-class amenities, and serene comfort.', '["Fine Dining", "Modern Mall", "Recreation Park", "Swimming Pool", "High-speed WiFi"]'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'GAR Village', 'gar-village', 'An authentic African thatched sanctuary where cultural architecture harmonizes with peaceful prayer and relaxation.', '["Village Cuisine", "Thatched Huts", "Prayer Hut", "Love Garden", "Fire Pit"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. Buildings
INSERT INTO public.buildings (id, resort_id, name, description)
VALUES
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'The Fountain Haven', 'Modern luxury suites overlooking the serenity central fountain.'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Elysian Suites Tower', 'High-ceiling suites featuring contemporary architecture and panoramic resort views.'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Village Thatched Enclave', 'Authentic eco-friendly thatched huts nested around lush gardens.'),
  ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222', 'Presidential Court', 'Grand signature thatched estates currently under bespoke architectural completion.')
ON CONFLICT (id) DO NOTHING;

-- 3. Room Types
INSERT INTO public.room_types (id, building_id, name, tier, description, base_price, max_guests, total_units, status, amenities, images)
VALUES
  -- Village Rooms
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
  -- Elysian Rooms
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

-- 4. Individual Room Units
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

-- 5. Resort-level Amenities (Entity)
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

-- 6. RoomTypeAmenity Junction
INSERT INTO public.room_type_amenities (room_type_id, amenity_id)
VALUES
  ('44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444405', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444405', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444406', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444406', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444406', '55555555-5555-5555-5555-555555555504'),
  ('44444444-4444-4444-4444-444444444407', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444407', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444407', '55555555-5555-5555-5555-555555555507')
ON CONFLICT (room_type_id, amenity_id) DO NOTHING;

-- 7. Restaurants & Menu Items
INSERT INTO public.restaurants (id, resort_id, name, slug, description, cuisine_type, operating_hours)
VALUES
  ('66666666-6666-6666-6666-666666666601', '22222222-2222-2222-2222-222222222222', 'GAR Village Restaurant', 'village-restaurant', 'Authentic regional Nigerian delicacies prepared with organic ingredients in a traditional open-air pavilion.', 'Local & Continental', '{"weekday": "07:00 - 22:00", "weekend": "07:00 - 23:00"}'::jsonb),
  ('66666666-6666-6666-6666-666666666602', '11111111-1111-1111-1111-111111111111', 'GAR Elysian Restaurant', 'elysian-restaurant', 'Fine dining elegance serving refined continental fusion, exquisite pastries, and gourmet chef specials.', 'Fine Dining', '{"weekday": "06:30 - 22:30", "weekend": "06:30 - 23:30"}'::jsonb),
  ('66666666-6666-6666-6666-666666666603', '22222222-2222-2222-2222-222222222222', 'Suya Hut', 'suya-hut', 'Sizzling night-time grilled meats, spiced beef suya, chicken skewers, and roasted plantain.', 'Grilled Street Food', '{"daily": "16:00 - 23:00"}'::jsonb),
  ('66666666-6666-6666-6666-666666666604', '11111111-1111-1111-1111-111111111111', 'Shawarma Spot', 'shawarma-spot', 'Freshly wrapped beef, chicken, and mixed shawarmas with secret artisanal sauces.', 'Casual Bites', '{"daily": "11:00 - 22:00"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (restaurant_id, name, description, price, category, is_available, sort_order)
VALUES
  ('66666666-6666-6666-6666-666666666601', 'Pounded Yam & Egusi Special', 'Smooth pounded yam with richly seasoned melon seed soup and assorted goat meat.', 8500, 'main', true, 1),
  ('66666666-6666-6666-6666-666666666601', 'Fisherman Fresh Soup', 'Native seafood medley in aromatic spiced broth with choice of swallow.', 12000, 'main', true, 2),
  ('66666666-6666-6666-6666-666666666602', 'Pan-Seared Salmon & Asparagus', 'Atlantic salmon with lemon-herb butter, roasted baby potatoes, and grilled asparagus.', 24000, 'main', true, 1),
  ('66666666-6666-6666-6666-666666666602', 'Chocolate Lava Fondant', 'Warm decadent dark chocolate cake with vanilla bean ice cream.', 6500, 'dessert', true, 2),
  ('66666666-6666-6666-6666-666666666603', 'Special Beef Suya Platter', 'Tender cuts dusted with authentic yaji spice, onions, and sweet tomatoes.', 5000, 'main', true, 1),
  ('66666666-6666-6666-6666-666666666604', 'Double-Chicken Jumbo Shawarma', 'Double chicken breast with garlic mayo, chili, and shredded cabbage in warm pita.', 4500, 'main', true, 1)
ON CONFLICT DO NOTHING;

-- 8. Facilities
INSERT INTO public.facilities (id, resort_id, name, slug, description, operating_hours, is_featured, sort_order)
VALUES
  ('77777777-7777-7777-7777-777777777701', '11111111-1111-1111-1111-111111111111', 'Modern Mall & Spa', 'modern-mall', 'Wellness spa, fitness gym, e-learning library, and indoor gaming arcade with cantilevered human glass facade.', '{"daily": "08:00 - 21:00"}'::jsonb, true, 1),
  ('77777777-7777-7777-7777-777777777702', '11111111-1111-1111-1111-111111111111', 'Recreation Park', 'recreation-park', 'Outdoor sports park featuring floodlit lawn tennis courts and mini soccer pitch.', '{"daily": "06:00 - 20:00"}'::jsonb, true, 2),
  ('77777777-7777-7777-7777-777777777703', '22222222-2222-2222-2222-222222222222', 'Love Garden', 'love-garden', 'Lush botanical garden shaded by tall umbrella trees, ideal for quiet reading and evening walks.', '{"daily": "06:00 - 22:00"}'::jsonb, true, 3),
  ('77777777-7777-7777-7777-777777777704', '11111111-1111-1111-1111-111111111111', 'Heritage Movie Theater', 'movie-theater', 'Acoustically tuned cinema hall screening Christian cinema and heritage documentaries.', '{"screenings": "14:00, 18:00, 20:30"}'::jsonb, false, 4)
ON CONFLICT (id) DO NOTHING;

-- 9. Gems (Off-Beat Things to Do)
INSERT INTO public.gems (id, name, slug, description, category, distance, duration, is_featured)
VALUES
  ('88888888-8888-8888-8888-888888888801', 'Sacred Prayer Rocks', 'sacred-prayer-rocks', 'A peaceful natural rock formation providing elevated scenic vistas and solitude for morning devotions.', 'spiritual', '1.2 km', '15 mins walk', true),
  ('88888888-8888-8888-8888-888888888802', 'Heritage Pottery Village', 'heritage-pottery-village', 'Historic indigenous workshop showcasing centuries-old clay sculpting and craft traditions.', 'culture', '4.5 km', '12 mins drive', true),
  ('88888888-8888-8888-8888-888888888803', 'Whispering Pines Forest Trail', 'whispering-pines-trail', 'Canopy-shaded hiking path through pristine natural woodland teeming with native songbirds.', 'nature', '2.8 km', '35 mins walk', true),
  ('88888888-8888-8888-8888-888888888804', 'Osun River Kayak Adventure', 'osun-river-kayak', 'Gentle river paddling tour guided by experienced certified naturalists.', 'adventure', '6.0 km', '20 mins drive', true)
ON CONFLICT (id) DO NOTHING;

-- 10. Event Categories
INSERT INTO public.event_categories (id, name, description, venue_options, capacity, sample_packages)
VALUES
  ('99999999-9999-9999-9999-999999999901', 'weddings', 'Spiritual and scenic wedding ceremonies across lush gardens and grand banquet halls.', '["Grand Fountain Lawn", "Village Garden Pavilion", "Elysian Ballroom"]'::jsonb, '50 to 500 Guests', '[{"name": "Garden Serenity", "price": "From ₦2,500,000"}, {"name": "Royal Elysian", "price": "From ₦5,000,000"}]'::jsonb),
  ('99999999-9999-9999-9999-999999999902', 'shoots', 'Picture-perfect film and photography backdrops with natural lighting and architectural variety.', '["Cantilevered Glass Facade", "Thatched Village Enclave", "Love Garden"]'::jsonb, 'Up to 30 Crew', '[{"name": "Half-Day Creative Shoot", "price": "From ₦350,000"}]'::jsonb),
  ('99999999-9999-9999-9999-999999999903', 'celebrations', 'Anniversaries, milestone birthdays, and church fellowships in private intimate banquet settings.', '["Poolside Terrace", "Elysian Private Dining", "Village Fire Pit Area"]'::jsonb, '20 to 150 Guests', '[{"name": "Intimate Celebration", "price": "From ₦800,000"}]'::jsonb),
  ('99999999-9999-9999-9999-999999999904', 'team_bonding', 'Executive retreats, church leadership offsites, and team building activities in quiet seclusion.', '["Recreation Park", "Modern Mall Conference Hall", "Retreat Huts"]'::jsonb, '15 to 80 Participants', '[{"name": "Two-Day Leadership Retreat", "price": "From ₦1,800,000"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 11. Deals
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

-- 12. System Settings
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
