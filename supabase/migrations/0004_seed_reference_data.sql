-- Grace Arena Resorts v1.2 Schema Migration 0004: Seed Reference Data
-- Seed resorts, buildings, room types, units, dual amenities, dining, facilities, gems, events, and settings

-- 1. Resorts
INSERT INTO public.resorts (id, name, slug, description, features)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'GAR Elysian', 'elysian', 'Our flagship luxury resort campus offering modern elegance, world-class amenities, and serene comfort.', '["Fine Dining", "Modern Mall", "Recreation Park", "Swimming Pool", "High-speed WiFi"]'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'GAR Village', 'village', 'An authentic African thatched sanctuary where cultural architecture harmonizes with peaceful prayer and relaxation.', '["Village Cuisine", "Thatched Huts", "Prayer Hut", "Love Garden", "Fire Pit"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. Buildings (generated from src/data/mock/resort-data.ts MOCK_BUILDINGS)
INSERT INTO public.buildings (id, resort_id, name, description)
VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'The Fountain Haven', 'Centrally positioned suites surrounding the tranquil courtyard fountain and private gardens.'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'The Oasis Villa', 'Self-contained luxury apartment suites with private kitchenettes, balconies, and quiet living spaces.'),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'The Cabana', 'Elevated suites boasting panoramic resort views, sun terraces, and VIP concierge privileges.'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222222', 'Executive Huts', 'Handcrafted authentic thatched huts combining Yoruba heritage architecture with air-conditioned modern comfort.'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222222', 'Presidential Huts', 'Exclusive thatched pavilions with private plunge pools, currently undergoing architectural finishing.'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222222', 'Royal Huts', 'Imperial thatched heritage lodges designed for dignitaries, state guests, and royal retreats.')
ON CONFLICT (id) DO NOTHING;

-- 3. Room Types (generated from MOCK_ROOMS; slug is the shared key with the public catalog)
INSERT INTO public.room_types (id, building_id, slug, name, tier, description, base_price, max_guests, total_units, status, amenities, images)
VALUES
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'elysian-fountain-standard', 'Standard Room', 'standard', 'Cozy refined room with comfortable king bed, vanity setup, and garden views.', 60000, 2, 6, 'available', '{"inRoom":["King-size bed 6×6","Air conditioner & Standing Fan","Mini refrigerator","Vanity table & mirror","Complimentary breakfast for one","Bath amenities vanity kit","Water heater","Tea & coffee making facilities","Cable TV (DStv) / Netflix","Intercom phone","Welcome bottle of water"],"resort":["Dedicated Prayer Hut","Swimming Pool & Sundeck","Fitness Center access","24/7 Security"]}'::jsonb, '["/assets/suite2.jpg","/assets/suite.jpg"]'::jsonb),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301', 'elysian-fountain-deluxe', 'Deluxe Room', 'deluxe', 'Spacious deluxe comfort featuring relaxation chairs, upgraded vanity, and lush garden vistas.', 70000, 2, 6, 'available', '{"inRoom":["King-size bed & Bed lamps","Air conditioning & standing fan","Relaxation chairs & coffee table","Mini refrigerator","Deluxe vanity kit (soap, bath gel, body cream, shampoo)","Water heater","Complimentary breakfast for one","Tea & coffee facilities","Cable TV (DStv)","Intercom phone","Welcome pack (water, drink & biscuits)"],"resort":["The Prayer Hut","Gym & Pool access","Full resort grounds access","Daily room service"]}'::jsonb, '["/assets/suite.jpg","/assets/suite2.jpg"]'::jsonb),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333302', 'elysian-oasis-deluxe-suite', 'Deluxe Suite with Kitchenette', 'deluxe', 'Downstairs private apartment featuring dedicated kitchenette, microwave, and living area.', 80000, 2, 4, 'available', '{"inRoom":["Exclusive suite with bedroom & kitchenette","Kitchenette (sink, cupboard, small cooktop)","Microwave & mini refrigerator","King-size bed","Air conditioner & standing fan","Vanity table / full-length mirror","Complimentary breakfast for one","Satellite TV","Intercom phone","Welcome drink"],"resort":["Prayer Hut reservation","Pool & Fitness Center","Laundry & Ironing services"]}'::jsonb, '["/assets/suite2.jpg","/assets/suite.jpg"]'::jsonb),
  ('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333302', 'elysian-oasis-premium-suite', 'Premium Suite Apartment', 'premium', 'Elevated apartment with independent living room, private kitchenette, and scenic balcony view.', 90000, 2, 4, 'available', '{"inRoom":["Separate living room & bedroom","Kitchenette with cooktop & microwave","King-size plush bedding","Air conditioner in both rooms","Smart TV with streaming","Complimentary breakfast for one","Premium bath products"],"resort":["The Prayer Hut","Modern Mall access","Recreation Park tennis","Swimming pool"]}'::jsonb, '["/assets/suite.jpg","/assets/pool.jpg"]'::jsonb),
  ('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333303', 'elysian-cabana-premium', 'The Cabana Premium Suite', 'premium', 'Our flagship luxury cabana suite offering panoramic resort views and bespoke interior styling.', 120000, 2, 3, 'available', '{"inRoom":["Expansive cabana terrace","Super king bed","High-power AC & mood lighting","Fully stocked minibar (non-alcoholic)","Nespresso coffee machine","Luxury bathrobes and slippers","Smart 55-inch TV"],"resort":["VIP Prayer Hut slots","Pool cabana reservation","Concierge dining support"]}'::jsonb, '["/assets/gar-elysian.jpg","/assets/suite.jpg"]'::jsonb),
  ('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333303', 'elysian-cabana-executive', 'The Cabana Executive Twin Suite', 'executive', 'Grand twin suite ideal for families or retreat leaders. Accommodates up to 4 guests with luxury amenities.', 180000, 4, 3, 'available', '{"inRoom":["Twin double bedrooms with en-suite baths","Expansive communal lounge","Dining table for four","Full kitchenette & microwave","Air conditioning throughout","Complimentary breakfast for guests"],"resort":["Prayer Hut access","Love Garden access","Spa priority bookings","Pool deck"]}'::jsonb, '["/assets/suite.jpg","/assets/suite2.jpg"]'::jsonb),
  ('44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333304', 'village-executive-hut', 'Executive Thatched Hut', 'executive', 'Handcrafted traditional thatched hut equipped with ultra-modern interior luxuries and serene privacy.', 100000, 2, 10, 'available', '{"inRoom":["Naturally insulated thatched architecture","King bed with artisanal wooden frame","Split AC and ceiling fan","Modern luxury bathroom & rain shower","Mini refrigerator & electric kettle","Complimentary breakfast","Flat-screen satellite TV","Private outdoor veranda"],"resort":["Direct Prayer Hut path","Village Mall cuisine","Recreation Park","Fire pit evening gatherings"]}'::jsonb, '["/assets/hut.jpg","/assets/gar-village.jpg"]'::jsonb),
  ('44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333305', 'village-presidential-hut', 'Presidential Thatched Hut', 'presidential', 'Grand presidential pavilion featuring dual master bedrooms, private dipping pool, and butler pantry.', 0, 2, 4, 'under_construction', '{"inRoom":["Multi-room luxury thatched pavilion","Private plunge pool and sun lounge","Chef preparation pantry","Walk-in dressing rooms and marble tubs"],"resort":["Priority access to all GAR facilities","Dedicated Prayer Hut reservation"]}'::jsonb, '["/assets/gar-village.jpg","/assets/hut.jpg"]'::jsonb),
  ('44444444-4444-4444-4444-444444444409', '33333333-3333-3333-3333-333333333306', 'village-royal-hut', 'Royal Thatched Hut', 'royal', 'The pinnacle of African royal heritage. Designed for dignitaries, executive retreats, and family royalty.', 0, 2, 2, 'under_construction', '{"inRoom":["Sprawling imperial thatched lodge","Private meeting salon and dining hall","Full security quarter connectivity"],"resort":["All-inclusive resort access","Private Prayer Hut sanctuary"]}'::jsonb, '["/assets/hut.jpg","/assets/gar-village.jpg"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. Individual Room Units (under-construction room types have no bookable units yet)
INSERT INTO public.rooms (room_type_id, unit_number, floor, status)
VALUES
  ('44444444-4444-4444-4444-444444444401', 'EFS-01', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444401', 'EFS-02', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444401', 'EFS-03', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444401', 'EFS-04', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444401', 'EFS-05', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444401', 'EFS-06', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444402', 'EFD-01', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444402', 'EFD-02', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444402', 'EFD-03', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444402', 'EFD-04', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444402', 'EFD-05', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444402', 'EFD-06', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444403', 'EODS-01', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444403', 'EODS-02', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444403', 'EODS-03', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444403', 'EODS-04', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444404', 'EOPS-01', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444404', 'EOPS-02', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444404', 'EOPS-03', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444404', 'EOPS-04', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444405', 'ECP-01', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444405', 'ECP-02', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444405', 'ECP-03', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444406', 'ECE-01', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444406', 'ECE-02', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444406', 'ECE-03', '1st Floor', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-01', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-02', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-03', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-04', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-05', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-06', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-07', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-08', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-09', 'Ground', 'available'),
  ('44444444-4444-4444-4444-444444444407', 'VEH-10', 'Ground', 'available')
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
  ('44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555508'),
  ('44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555508'),
  ('44444444-4444-4444-4444-444444444403', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444403', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444403', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444403', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444403', '55555555-5555-5555-5555-555555555508'),
  ('44444444-4444-4444-4444-444444444404', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444404', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444404', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444404', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444404', '55555555-5555-5555-5555-555555555508'),
  ('44444444-4444-4444-4444-444444444405', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444405', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444405', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444405', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444405', '55555555-5555-5555-5555-555555555508'),
  ('44444444-4444-4444-4444-444444444406', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444406', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444406', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444406', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444406', '55555555-5555-5555-5555-555555555508'),
  ('44444444-4444-4444-4444-444444444407', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444407', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444407', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444407', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444407', '55555555-5555-5555-5555-555555555508'),
  ('44444444-4444-4444-4444-444444444408', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444408', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444408', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444408', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444408', '55555555-5555-5555-5555-555555555508'),
  ('44444444-4444-4444-4444-444444444409', '55555555-5555-5555-5555-555555555501'),
  ('44444444-4444-4444-4444-444444444409', '55555555-5555-5555-5555-555555555502'),
  ('44444444-4444-4444-4444-444444444409', '55555555-5555-5555-5555-555555555503'),
  ('44444444-4444-4444-4444-444444444409', '55555555-5555-5555-5555-555555555506'),
  ('44444444-4444-4444-4444-444444444409', '55555555-5555-5555-5555-555555555508')
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

-- 11. Deals (generated from MOCK_DEALS; promo codes match the public /deals page)
INSERT INTO public.deals (id, title, slug, description, discount_type, discount_value, promo_code, start_date, end_date, is_active, category, applicable_room_type_ids, terms)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'Serenity Weekend Retreat Package', 'serenity-weekend-retreat', 'Enjoy 2 nights in an Executive Thatched Hut or Elysian Suite, complete with daily complimentary breakfast, dinner at The Grand Palm, and priority Prayer Hut meditation access.', 'percentage', 15, 'SERENITY15', '2026-01-01', '2026-12-31', true, 'room', '["44444444-4444-4444-4444-444444444407","44444444-4444-4444-4444-444444444401","44444444-4444-4444-4444-444444444402"]'::jsonb, 'Requires 2 nights minimum stay Valid for weekend check-ins (Friday - Sunday) Subject to room availability'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', 'Family Heritage Getaway', 'family-heritage-getaway', 'Book two adjoining suites or huts and receive a 20% discount on the second room, plus complimentary kids pool activities and guided heritage trail walk.', 'percentage', 20, 'FAMILY20', '2026-01-01', '2026-12-31', true, 'room', '["44444444-4444-4444-4444-444444444402","44444444-4444-4444-4444-444444444403","44444444-4444-4444-4444-444444444404"]'::jsonb, 'Applies when booking 2 or more rooms Non-refundable deposit of 30% Advance reservation required'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03', 'Midweek Fasting & Prayer Package', 'midweek-fasting-prayer', 'Tailored for pastors, ministers, and seekers desiring intentional quiet time. Includes room service of fruit juices, light breaking-fast broth, and guaranteed tranquility.', 'fixed', 25000, 'PEACE25', '2026-01-01', '2026-12-31', true, 'room', '["44444444-4444-4444-4444-444444444407","44444444-4444-4444-4444-444444444401"]'::jsonb, 'Check-in Tuesday, check-out Thursday Quiet policy strictly observed')
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
  ('map_coordinates', '6.5244,3.3792'),
  ('paystack_downtime', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
