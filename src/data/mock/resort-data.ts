export interface AmenityItem {
  id: string;
  name: string;
  category: "general" | "wellness" | "spiritual" | "dining" | "sports";
  iconName: string;
  description: string;
  sortOrder: number;
}

export interface FacilityItem {
  id: string;
  name: string;
  campus: "elysian" | "village" | "central";
  campusTitle: string;
  category: string;
  operatingHours: string;
  location: string;
  description: string;
  features: string[];
  image: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  priceNgn: number;
  category: "starter" | "main" | "grill" | "dessert" | "beverage";
  dietary?: string[];
  isChefSpecial?: boolean;
}

export interface RestaurantItem {
  id: string;
  name: string;
  campus: "elysian" | "village" | "central";
  campusTitle: string;
  cuisine: string;
  operatingHours: string;
  description: string;
  image: string;
  menu: MenuItem[];
}

export interface GemItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  image: string;
  location: string;
  link: string;
}

export interface EventCategoryItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  capacity: string;
  features: string[];
  image: string;
}

export interface DealItem {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  promoCode: string;
  applicableRooms: string[];
  validFrom: string;
  validTo: string;
  terms: string[];
  image: string;
  badgeText: string;
}

export interface MediaAssetItem {
  id: string;
  title: string;
  altText: string;
  category: "gallery" | "campus" | "rooms" | "dining" | "facilities";
  page: "home" | "rooms" | "facilities" | "restaurants" | "about";
  url: string;
  thumbnailUrl: string;
}

// 1. Resort-level Amenities (Home page snapshot)
export const MOCK_AMENITIES: AmenityItem[] = [
  {
    id: "amenity-prayer-hut",
    name: "The Prayer Hut",
    category: "spiritual",
    iconName: "FaPray",
    description: "24/7 dedicated sanctuary for private meditation and spiritual contemplation.",
    sortOrder: 1,
  },
  {
    id: "amenity-pool",
    name: "Infinity & Dipping Pools",
    category: "wellness",
    iconName: "MdPool",
    description: "Sparkling outdoor pools surrounded by peaceful botanical palm gardens.",
    sortOrder: 2,
  },
  {
    id: "amenity-dining",
    name: "Four Distinct Dining Outlets",
    category: "dining",
    iconName: "PiChefHatBold",
    description: "From rustic African buffet to refined continental á la carte dining.",
    sortOrder: 3,
  },
  {
    id: "amenity-wifi",
    name: "High-Speed Fiber Internet",
    category: "general",
    iconName: "FaWifi",
    description: "Seamless wireless connectivity across all private huts, villas, and lawns.",
    sortOrder: 4,
  },
  {
    id: "amenity-gym",
    name: "Wellness & Fitness Suite",
    category: "wellness",
    iconName: "BiDumbbell",
    description: "Equipped fitness suite overlooking landscaped resort grounds.",
    sortOrder: 5,
  },
  {
    id: "amenity-nature",
    name: "Botanical Trails & Lawns",
    category: "general",
    iconName: "PiPlantFill",
    description: "Over 20 acres of serene walking paths, organic citrus trees, and gazebos.",
    sortOrder: 6,
  },
  {
    id: "amenity-power",
    name: "24/7 Uninterrupted Clean Power",
    category: "general",
    iconName: "TbAirConditioning",
    description: "Redundant eco-solar and power grid infrastructure ensuring continuous comfort.",
    sortOrder: 7,
  },
  {
    id: "amenity-laundry",
    name: "Express Laundry & Dry Cleaning",
    category: "general",
    iconName: "MdLocalLaundryService",
    description: "Same-day professional laundering and garment care for all staying guests.",
    sortOrder: 8,
  },
];

// 2. Facilities
export const MOCK_FACILITIES: FacilityItem[] = [
  {
    id: "the-prayer-hut",
    name: "The Prayer Hut",
    campus: "central",
    campusTitle: "Central Sanctuary",
    category: "Spiritual Renewal",
    operatingHours: "Open 24 Hours Daily",
    location: "Quiet Grove, South Wing",
    description:
      "A serene thatched hexagonal sanctuary constructed with natural acoustic bamboo and timber, created specifically for personal prayer, quiet fasting, and meditation.",
    features: [
      "Private prayer alcoves",
      "Natural ventilation",
      "Spiritual library",
      "Continuous peace",
    ],
    image: "/assets/hut.jpg",
  },
  {
    id: "elysian-pool",
    name: "Elysian Palm Pool",
    campus: "elysian",
    campusTitle: "GAR Elysian Campus",
    category: "Wellness & Leisure",
    operatingHours: "07:00 – 20:00 Daily",
    location: "Elysian Central Terrace",
    description:
      "A crystal-clear outdoor swimming pool framed by royal palms and plush sun cabanas. Poolside beverage service available.",
    features: [
      "Heated shallow pool for children",
      "Sun loungers",
      "Poolside juice bar",
      "Lifeguard on duty",
    ],
    image: "/assets/pool.jpg",
  },
  {
    id: "grace-conference-hall",
    name: "Grace Executive Conference Center",
    campus: "elysian",
    campusTitle: "GAR Elysian Campus",
    category: "Business & Retreats",
    operatingHours: "08:00 – 22:00 (On Reservation)",
    location: "Level 1, East Annex",
    description:
      "High-tech executive conference and summit facility accommodating up to 250 delegates with dual HD presentation screens and acoustic treatment.",
    features: [
      "4K Projectors",
      "Video conferencing hardware",
      "Breakout meeting rooms",
      "Dedicated banquet staging",
    ],
    image: "/assets/hero-bg.jpg",
  },
  {
    id: "village-banquet-gardens",
    name: "Village Heritage Lawns",
    campus: "village",
    campusTitle: "GAR Village Campus",
    category: "Events & Celebrations",
    operatingHours: "09:00 – 23:00 (On Reservation)",
    location: "Village Green",
    description:
      "Expansive manicured lawns ideal for Christian weddings, family reunions, and church fellowship retreats of up to 600 attendees.",
    features: [
      "Open-air marquee capabilities",
      "Evening mood illumination",
      "Dedicated caterer access",
      "Ample parking",
    ],
    image: "/assets/gar-village.jpg",
  },
];

// 3. Restaurants & Menus
export const MOCK_RESTAURANTS: RestaurantItem[] = [
  {
    id: "the-grand-palm",
    name: "The Grand Palm Dining Room",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    cuisine: "Continental & African Gourmet",
    operatingHours: "06:30 – 22:30 Daily",
    description:
      "Our premier fine-dining restaurant featuring sophisticated African fusion, USDA steaks, fresh Atlantic seafood, and bespoke continental dishes.",
    image: "/assets/dining.jpg",
    menu: [
      {
        id: "gp-m-1",
        name: "Grilled Jumbo Prawns in Herb Butter",
        description:
          "Charcoal-grilled Atlantic jumbo prawns served with seasoned jollof risotto and seasonal asparagus.",
        priceNgn: 18500,
        category: "grill",
        isChefSpecial: true,
      },
      {
        id: "gp-m-2",
        name: "Pan-Seared Salmon Fillet",
        description:
          "Norwegian salmon with lemon hollandaise, garlic mashed potatoes, and sautéed garden beans.",
        priceNgn: 24000,
        category: "main",
      },
      {
        id: "gp-m-3",
        name: "Slow-Braised Oxtail Stew",
        description:
          "Tender oxtail simmered in rich aromatic spices, served with steamed basmati rice or traditional yam.",
        priceNgn: 16500,
        category: "main",
        isChefSpecial: true,
      },
      {
        id: "gp-m-4",
        name: "Classic Crème Brûlée",
        description:
          "Madagascan vanilla bean custard with caramelized sugar crust and fresh tropical berries.",
        priceNgn: 6500,
        category: "dessert",
      },
    ],
  },
  {
    id: "village-kitchen",
    name: "The Village Hearth",
    campus: "village",
    campusTitle: "GAR Village",
    cuisine: "Authentic Nigerian Cuisine & Woodfire Grills",
    operatingHours: "10:00 – 22:00 Daily",
    description:
      "Celebrates traditional rustic recipes prepared in clay pots and open woodfire grills. Pounded yam, amala, fresh fish peppersoup, and suya skewers.",
    image: "/assets/dining.jpg",
    menu: [
      {
        id: "vk-m-1",
        name: "Igbo-Ora Special Goat Meat Peppersoup",
        description:
          "Infused with indigenous African herbs, hot spices, and tender mountain goat cuts.",
        priceNgn: 9500,
        category: "starter",
        isChefSpecial: true,
      },
      {
        id: "vk-m-2",
        name: "Village Fisherman Seafood Stew",
        description:
          "Tilapia, crab, and tiger prawns simmered in native palm soup served with pounded yam.",
        priceNgn: 17500,
        category: "main",
        isChefSpecial: true,
      },
      {
        id: "vk-m-3",
        name: "Charcoal Suya Platter",
        description:
          "Finely spiced beef and chicken skewers with red onions, ripe tomatoes, and spicy yaji.",
        priceNgn: 8500,
        category: "grill",
      },
    ],
  },
  {
    id: "grace-bistro",
    name: "Grace Terrace Café",
    campus: "central",
    campusTitle: "Central Plaza",
    cuisine: "Artisan Coffee, Pastries & Light Bites",
    operatingHours: "07:00 – 21:00 Daily",
    description:
      "Relaxed poolside coffee house offering specialty barista brews, fresh tropical smoothies, artisan sandwiches, and pastries.",
    image: "/assets/hero-bg.jpg",
    menu: [
      {
        id: "gb-m-1",
        name: "Avocado & Smoked Turkey Panini",
        description:
          "Artisan sourdough toast with guacamole, smoked turkey breast, and melted mozzarella.",
        priceNgn: 7500,
        category: "main",
      },
      {
        id: "gb-m-2",
        name: "Handcrafted Iced Caramel Macchiato",
        description:
          "Double espresso shot poured over chilled milk, ice, and golden Madagascar caramel drizzle.",
        priceNgn: 3800,
        category: "beverage",
      },
    ],
  },
  {
    id: "sunset-lounge",
    name: "The Sunset Veranda",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    cuisine: "Non-Alcoholic Mocktails & Sunset Small Plates",
    operatingHours: "16:00 – 23:00 Daily",
    description:
      "Open-air panoramic terrace serving artisan non-alcoholic mocktails, gourmet tapas, and light appetizers with golden-hour views.",
    image: "/assets/pool.jpg",
    menu: [
      {
        id: "sl-m-1",
        name: "Hibiscus Mint Sparkler (Zobo Fizz)",
        description:
          "Brewed roselle extract with fresh garden mint, crushed ginger, and sparkling spring water.",
        priceNgn: 3500,
        category: "beverage",
        isChefSpecial: true,
      },
      {
        id: "sl-m-2",
        name: "Crispy Calamari with Sweet Chili Glaze",
        description: "Lightly breaded calamari rings served with house citrus tartar sauce.",
        priceNgn: 8500,
        category: "starter",
      },
    ],
  },
];

// 4. Off-Beat Gems (4 featured cards)
export const MOCK_GEMS: GemItem[] = [
  {
    id: "gem-thatched-huts",
    title: "Luxurious Accommodations",
    subtitle: "Suites & Thatched Huts",
    description:
      "Experience architectural balance where traditional African thatched craftsmanship meets 5-star hotel luxury and air-conditioned tranquility.",
    highlights: [
      "Hand-thatched cooling roofs",
      "Modern walk-in showers",
      "King-size beds",
      "Private balconies",
    ],
    image: "/assets/suite.jpg",
    location: "Across Both Campuses",
    link: "/rooms",
  },
  {
    id: "gem-dining",
    title: "Exquisite Dining",
    subtitle: "Local & Continental",
    description:
      "Four signature culinary outlets presenting garden-fresh farm produce, authentic charcoal delicacies, and refined international classics.",
    highlights: [
      "Farm-to-table vegetables",
      "Woodfire clay hearth",
      "Poolside mocktail bar",
      "Breakfast included",
    ],
    image: "/assets/dining.jpg",
    location: "Dining Plaza",
    link: "/restaurants",
  },
  {
    id: "gem-prayer-hut",
    title: "The Prayer Hut",
    subtitle: "Spiritual Tranquility",
    description:
      "A dedicated, peaceful prayer sanctuary surrounded by whispering palms and fountains for deep meditation, communion, and spiritual renewal.",
    highlights: [
      "24/7 private access",
      "Natural acoustic silence",
      "Comfortable kneeling stations",
      "Open bible alcoves",
    ],
    image: "/assets/hut.jpg",
    location: "Quiet South Wing",
    link: "/facilities",
  },
  {
    id: "gem-twin-heritage",
    title: "Igbo-Ora Heritage",
    subtitle: "Land of Twins",
    description:
      "Explore the cultural richness of the world twin capital with guided resort walks, lush vegetation, and family blessings.",
    highlights: [
      "Cultural walking trails",
      "Twin monument visits",
      "Scenic mountain views",
      "Family heritage photography",
    ],
    image: "/assets/hero-placeholder.jpg",
    location: "Igbo-Ora Valley",
    link: "/about",
  },
];

// 5. Events & Retreats
export const MOCK_EVENT_CATEGORIES: EventCategoryItem[] = [
  {
    id: "event-church-retreats",
    title: "Church & Ministry Retreats",
    subtitle: "A Sacred Space for Renewal & Fellowship",
    description:
      "Equipped with dedicated indoor sanctuaries, open-air prayer grounds, and breakout rooms for leadership summits, church retreats, and fasting gatherings.",
    capacity: "Up to 500 Participants",
    features: [
      "Acoustically tuned sound systems",
      "Prayer Hut reservation",
      "Full board meal plans",
      "Lodging packages",
    ],
    image: "/assets/hut.jpg",
  },
  {
    id: "event-weddings",
    title: "Christian Weddings & Vow Renewals",
    subtitle: "Start Forever in God's Splendor",
    description:
      "Picturesque lawn settings and elegant banquet venues offering faith-aligned ceremonial spaces, exquisite decor, and gourmet feast catering.",
    capacity: "Up to 600 Guests",
    features: [
      "Bridal suite preparation",
      "Manicured photo garden",
      "Executive guest suites",
      "Personal event coordinator",
    ],
    image: "/assets/paper-bg.png",
  },
  {
    id: "event-corporate",
    title: "Corporate Conferences & Board Retreats",
    subtitle: "Strategic Vision in Peaceful Surroundings",
    description:
      "Escape boardroom fatigue and inspire innovation. Seamless audio-visual connectivity and private executive villas allow teams to focus and recharge.",
    capacity: "Up to 250 Delegates",
    features: [
      "High-speed fiber WiFi",
      "Hybrid video summit support",
      "Breakout coffee lounges",
      "Team-building activities",
    ],
    image: "/assets/hero-bg.jpg",
  },
];

// 6. Deals & Special Packages
export const MOCK_DEALS: DealItem[] = [
  {
    id: "deal-spiritual-renewal",
    title: "Serenity Weekend Retreat Package",
    slug: "serenity-weekend-retreat",
    tagline: "3 Days / 2 Nights of Spiritual Refreshment",
    description:
      "Enjoy 2 nights in an Executive Thatched Hut or Elysian Suite, complete with daily complimentary breakfast, dinner at The Grand Palm, and priority Prayer Hut meditation access.",
    discountType: "percentage",
    discountValue: 15,
    promoCode: "SERENITY15",
    applicableRooms: [
      "village-executive-hut",
      "elysian-fountain-standard",
      "elysian-fountain-deluxe",
    ],
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    terms: [
      "Requires 2 nights minimum stay",
      "Valid for weekend check-ins (Friday - Sunday)",
      "Subject to room availability",
    ],
    image: "/assets/suite2.jpg",
    badgeText: "15% OFF",
  },
  {
    id: "deal-family-fellowship",
    title: "Family Heritage Getaway",
    slug: "family-heritage-getaway",
    tagline: "Reconnect with Loved Ones in Luxury",
    description:
      "Book two adjoining suites or huts and receive a 20% discount on the second room, plus complimentary kids pool activities and guided heritage trail walk.",
    discountType: "percentage",
    discountValue: 20,
    promoCode: "FAMILY20",
    applicableRooms: [
      "elysian-fountain-deluxe",
      "elysian-oasis-deluxe-suite",
      "elysian-oasis-premium-suite",
    ],
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    terms: [
      "Applies when booking 2 or more rooms",
      "Non-refundable deposit of 30%",
      "Advance reservation required",
    ],
    image: "/assets/pool.jpg",
    badgeText: "POPULAR",
  },
  {
    id: "deal-midweek-fasting",
    title: "Midweek Fasting & Prayer Package",
    slug: "midweek-fasting-prayer",
    tagline: "Quiet Solitude Tuesday through Thursday",
    description:
      "Tailored for pastors, ministers, and seekers desiring intentional quiet time. Includes room service of fruit juices, light breaking-fast broth, and guaranteed tranquility.",
    discountType: "fixed",
    discountValue: 25000,
    promoCode: "PEACE25",
    applicableRooms: ["village-executive-hut", "elysian-fountain-standard"],
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    terms: ["Check-in Tuesday, check-out Thursday", "Quiet policy strictly observed"],
    image: "/assets/hut.jpg",
    badgeText: "₦25,000 OFF",
  },
];

// 7. Gallery Media Assets (Lightbox)
export const MOCK_MEDIA: MediaAssetItem[] = [
  {
    id: "media-suite-interior",
    title: "Elysian Presidential Master Suite",
    altText: "Spacious master bedroom with plush king-size bed and warm mood lighting",
    category: "gallery",
    page: "home",
    url: "/assets/suite.jpg",
    thumbnailUrl: "/assets/suite.jpg",
  },
  {
    id: "media-hut-exterior",
    title: "The Prayer Hut at Sunrise",
    altText: "Traditional African thatched sanctuary surrounded by peaceful botanical palm gardens",
    category: "gallery",
    page: "home",
    url: "/assets/hut.jpg",
    thumbnailUrl: "/assets/hut.jpg",
  },
  {
    id: "media-pool-side",
    title: "Palm Shaded Swimming Pool",
    altText: "Outdoor turquoise pool with submerged sun loungers under golden hour light",
    category: "gallery",
    page: "home",
    url: "/assets/pool.jpg",
    thumbnailUrl: "/assets/pool.jpg",
  },
  {
    id: "media-dining-spread",
    title: "Fine Dining at The Grand Palm",
    altText: "Artfully plated Nigerian and continental dishes arranged on a mahogany table",
    category: "gallery",
    page: "home",
    url: "/assets/dining.jpg",
    thumbnailUrl: "/assets/dining.jpg",
  },
  {
    id: "media-village-camp",
    title: "GAR Village Campus Grounds",
    altText: "Lush green heritage lawn with thatched executive huts and stone walkways",
    category: "gallery",
    page: "home",
    url: "/assets/gar-village.jpg",
    thumbnailUrl: "/assets/gar-village.jpg",
  },
  {
    id: "media-suite-bath",
    title: "Executive Hut Suite Living Lounge",
    altText: "Luxury executive suite with handcrafted bamboo furnishings and plush armchairs",
    category: "gallery",
    page: "home",
    url: "/assets/suite2.jpg",
    thumbnailUrl: "/assets/suite2.jpg",
  },
];

// 8. Resort Buildings & Campus Associations
export interface BuildingItem {
  id: string;
  name: string;
  campus: "elysian" | "village";
  campusTitle: string;
  description: string;
  totalRooms: number;
}

export const MOCK_BUILDINGS: BuildingItem[] = [
  {
    id: "building-fountain-haven",
    name: "The Fountain Haven",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    description:
      "Centrally positioned suites surrounding the tranquil courtyard fountain and private gardens.",
    totalRooms: 12,
  },
  {
    id: "building-oasis-villa",
    name: "The Oasis Villa",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    description:
      "Self-contained luxury apartment suites with private kitchenettes, balconies, and quiet living spaces.",
    totalRooms: 8,
  },
  {
    id: "building-cabana",
    name: "The Cabana",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    description:
      "Elevated suites boasting panoramic resort views, sun terraces, and VIP concierge privileges.",
    totalRooms: 6,
  },
  {
    id: "building-executive-huts",
    name: "Executive Huts",
    campus: "village",
    campusTitle: "GAR Village",
    description:
      "Handcrafted authentic thatched huts combining Yoruba heritage architecture with air-conditioned modern comfort.",
    totalRooms: 10,
  },
  {
    id: "building-presidential-huts",
    name: "Presidential Huts",
    campus: "village",
    campusTitle: "GAR Village",
    description:
      "Exclusive thatched pavilions with private plunge pools, currently undergoing architectural finishing.",
    totalRooms: 4,
  },
  {
    id: "building-royal-huts",
    name: "Royal Huts",
    campus: "village",
    campusTitle: "GAR Village",
    description:
      "Imperial thatched heritage lodges designed for dignitaries, state guests, and royal retreats.",
    totalRooms: 2,
  },
];

// 9. Rooms and Suites Catalog (SRS 3.2 & 4.2)
export interface RoomAmenitiesJson {
  inRoom: string[];
  resort: string[];
}

export interface RoomTypeItem {
  id: string;
  slug: string;
  name: string;
  buildingId: string;
  buildingName: string;
  campus: "elysian" | "village";
  campusTitle: string;
  tier: "Standard" | "Deluxe" | "Premium" | "Executive" | "Presidential" | "Royal";
  tierColor: string;
  basePriceNgn: number | null;
  maxGuests: number | null;
  image: string;
  images: string[];
  isUnderConstruction: boolean;
  shortDesc: string;
  keyAmenities: string[];
  amenities: RoomAmenitiesJson;
}

export const MOCK_ROOMS: RoomTypeItem[] = [
  {
    id: "elysian-fountain-standard",
    slug: "elysian-fountain-standard",
    name: "Standard Room",
    buildingId: "building-fountain-haven",
    buildingName: "The Fountain Haven",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Standard",
    tierColor: "#3B82F6",
    basePriceNgn: 60000,
    maxGuests: 2,
    image: "/assets/suite2.jpg",
    images: ["/assets/suite2.jpg", "/assets/suite.jpg"],
    isUnderConstruction: false,
    shortDesc: "Cozy refined room with comfortable king bed, vanity setup, and garden views.",
    keyAmenities: [
      "King Bed (6×6)",
      "Air Conditioning",
      "Prayer Hut Access",
      "Free Wi-Fi",
      "Complimentary Breakfast",
    ],
    amenities: {
      inRoom: [
        "King-size bed 6×6",
        "Air conditioner & Standing Fan",
        "Mini refrigerator",
        "Vanity table & mirror",
        "Complimentary breakfast for one",
        "Bath amenities vanity kit",
        "Water heater",
        "Tea & coffee making facilities",
        "Cable TV (DStv) / Netflix",
        "Intercom phone",
        "Welcome bottle of water",
      ],
      resort: [
        "Dedicated Prayer Hut",
        "Swimming Pool & Sundeck",
        "Fitness Center access",
        "24/7 Security",
      ],
    },
  },
  {
    id: "elysian-fountain-deluxe",
    slug: "elysian-fountain-deluxe",
    name: "Deluxe Room",
    buildingId: "building-fountain-haven",
    buildingName: "The Fountain Haven",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Deluxe",
    tierColor: "#10B981",
    basePriceNgn: 70000,
    maxGuests: 2,
    image: "/assets/suite.jpg",
    images: ["/assets/suite.jpg", "/assets/suite2.jpg"],
    isUnderConstruction: false,
    shortDesc:
      "Spacious deluxe comfort featuring relaxation chairs, upgraded vanity, and lush garden vistas.",
    keyAmenities: [
      "King Bed",
      "Relaxation Chairs",
      "Prayer Hut Access",
      "Upgraded Bath Kit",
      "Free Wi-Fi",
    ],
    amenities: {
      inRoom: [
        "King-size bed & Bed lamps",
        "Air conditioning & standing fan",
        "Relaxation chairs & coffee table",
        "Mini refrigerator",
        "Deluxe vanity kit (soap, bath gel, body cream, shampoo)",
        "Water heater",
        "Complimentary breakfast for one",
        "Tea & coffee facilities",
        "Cable TV (DStv)",
        "Intercom phone",
        "Welcome pack (water, drink & biscuits)",
      ],
      resort: [
        "The Prayer Hut",
        "Gym & Pool access",
        "Full resort grounds access",
        "Daily room service",
      ],
    },
  },
  {
    id: "elysian-oasis-deluxe-suite",
    slug: "elysian-oasis-deluxe-suite",
    name: "Deluxe Suite with Kitchenette",
    buildingId: "building-oasis-villa",
    buildingName: "The Oasis Villa",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Deluxe",
    tierColor: "#10B981",
    basePriceNgn: 80000,
    maxGuests: 2,
    image: "/assets/suite2.jpg",
    images: ["/assets/suite2.jpg", "/assets/suite.jpg"],
    isUnderConstruction: false,
    shortDesc:
      "Downstairs private apartment featuring dedicated kitchenette, microwave, and living area.",
    keyAmenities: [
      "Private Kitchenette",
      "Microwave & Cooktop",
      "Prayer Hut Access",
      "King Bed",
      "Satellite TV",
    ],
    amenities: {
      inRoom: [
        "Exclusive suite with bedroom & kitchenette",
        "Kitchenette (sink, cupboard, small cooktop)",
        "Microwave & mini refrigerator",
        "King-size bed",
        "Air conditioner & standing fan",
        "Vanity table / full-length mirror",
        "Complimentary breakfast for one",
        "Satellite TV",
        "Intercom phone",
        "Welcome drink",
      ],
      resort: ["Prayer Hut reservation", "Pool & Fitness Center", "Laundry & Ironing services"],
    },
  },
  {
    id: "elysian-oasis-premium-suite",
    slug: "elysian-oasis-premium-suite",
    name: "Premium Suite Apartment",
    buildingId: "building-oasis-villa",
    buildingName: "The Oasis Villa",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Premium",
    tierColor: "#8B5CF6",
    basePriceNgn: 90000,
    maxGuests: 2,
    image: "/assets/suite.jpg",
    images: ["/assets/suite.jpg", "/assets/pool.jpg"],
    isUnderConstruction: false,
    shortDesc:
      "Elevated apartment with independent living room, private kitchenette, and scenic balcony view.",
    keyAmenities: [
      "Separate Living Room",
      "Kitchenette",
      "Prayer Hut Access",
      "Balcony View",
      "Microwave",
    ],
    amenities: {
      inRoom: [
        "Separate living room & bedroom",
        "Kitchenette with cooktop & microwave",
        "King-size plush bedding",
        "Air conditioner in both rooms",
        "Smart TV with streaming",
        "Complimentary breakfast for one",
        "Premium bath products",
      ],
      resort: ["The Prayer Hut", "Modern Mall access", "Recreation Park tennis", "Swimming pool"],
    },
  },
  {
    id: "elysian-cabana-premium",
    slug: "elysian-cabana-premium",
    name: "The Cabana Premium Suite",
    buildingId: "building-cabana",
    buildingName: "The Cabana",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Premium",
    tierColor: "#8B5CF6",
    basePriceNgn: 120000,
    maxGuests: 2,
    image: "/assets/gar-elysian.jpg",
    images: ["/assets/gar-elysian.jpg", "/assets/suite.jpg"],
    isUnderConstruction: false,
    shortDesc:
      "Our flagship luxury cabana suite offering panoramic resort views and bespoke interior styling.",
    keyAmenities: [
      "Cabana Terrace",
      "VIP Lounge Access",
      "Prayer Hut Access",
      "King Bed",
      "Priority Service",
    ],
    amenities: {
      inRoom: [
        "Expansive cabana terrace",
        "Super king bed",
        "High-power AC & mood lighting",
        "Fully stocked minibar (non-alcoholic)",
        "Nespresso coffee machine",
        "Luxury bathrobes and slippers",
        "Smart 55-inch TV",
      ],
      resort: ["VIP Prayer Hut slots", "Pool cabana reservation", "Concierge dining support"],
    },
  },
  {
    id: "elysian-cabana-executive",
    slug: "elysian-cabana-executive",
    name: "The Cabana Executive Twin Suite",
    buildingId: "building-cabana",
    buildingName: "The Cabana",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Executive",
    tierColor: "#F59E0B",
    basePriceNgn: 180000,
    maxGuests: 4,
    image: "/assets/suite.jpg",
    images: ["/assets/suite.jpg", "/assets/suite2.jpg"],
    isUnderConstruction: false,
    shortDesc:
      "Grand twin suite ideal for families or retreat leaders. Accommodates up to 4 guests with luxury amenities.",
    keyAmenities: [
      "Sleeps 4 Guests",
      "Twin Bedrooms",
      "Prayer Hut Access",
      "Spacious Lounge",
      "Kitchenette",
    ],
    amenities: {
      inRoom: [
        "Twin double bedrooms with en-suite baths",
        "Expansive communal lounge",
        "Dining table for four",
        "Full kitchenette & microwave",
        "Air conditioning throughout",
        "Complimentary breakfast for guests",
      ],
      resort: ["Prayer Hut access", "Love Garden access", "Spa priority bookings", "Pool deck"],
    },
  },
  {
    id: "village-executive-hut",
    slug: "village-executive-hut",
    name: "Executive Thatched Hut",
    buildingId: "building-executive-huts",
    buildingName: "Executive Huts",
    campus: "village",
    campusTitle: "GAR Village",
    tier: "Executive",
    tierColor: "#F59E0B",
    basePriceNgn: 100000,
    maxGuests: 2,
    image: "/assets/hut.jpg",
    images: ["/assets/hut.jpg", "/assets/gar-village.jpg"],
    isUnderConstruction: false,
    shortDesc:
      "Handcrafted traditional thatched hut equipped with ultra-modern interior luxuries and serene privacy.",
    keyAmenities: [
      "Authentic Thatched Roof",
      "King Bed",
      "Prayer Hut Access",
      "Private Veranda",
      "Modern AC",
    ],
    amenities: {
      inRoom: [
        "Naturally insulated thatched architecture",
        "King bed with artisanal wooden frame",
        "Split AC and ceiling fan",
        "Modern luxury bathroom & rain shower",
        "Mini refrigerator & electric kettle",
        "Complimentary breakfast",
        "Flat-screen satellite TV",
        "Private outdoor veranda",
      ],
      resort: [
        "Direct Prayer Hut path",
        "Village Mall cuisine",
        "Recreation Park",
        "Fire pit evening gatherings",
      ],
    },
  },
  {
    id: "village-presidential-hut",
    slug: "village-presidential-hut",
    name: "Presidential Thatched Hut",
    buildingId: "building-presidential-huts",
    buildingName: "Presidential Huts",
    campus: "village",
    campusTitle: "GAR Village",
    tier: "Presidential",
    tierColor: "#DC2626",
    basePriceNgn: null,
    maxGuests: null,
    image: "/assets/gar-village.jpg",
    images: ["/assets/gar-village.jpg", "/assets/hut.jpg"],
    isUnderConstruction: true,
    shortDesc:
      "Grand presidential pavilion featuring dual master bedrooms, private dipping pool, and butler pantry.",
    keyAmenities: [
      "Private Dipping Pool",
      "Dual Master Suites",
      "Dedicated Prayer Space",
      "Under Construction",
    ],
    amenities: {
      inRoom: [
        "Multi-room luxury thatched pavilion",
        "Private plunge pool and sun lounge",
        "Chef preparation pantry",
        "Walk-in dressing rooms and marble tubs",
      ],
      resort: ["Priority access to all GAR facilities", "Dedicated Prayer Hut reservation"],
    },
  },
  {
    id: "village-royal-hut",
    slug: "village-royal-hut",
    name: "Royal Thatched Hut",
    buildingId: "building-royal-huts",
    buildingName: "Royal Huts",
    campus: "village",
    campusTitle: "GAR Village",
    tier: "Royal",
    tierColor: "#9333EA",
    basePriceNgn: null,
    maxGuests: null,
    image: "/assets/hut.jpg",
    images: ["/assets/hut.jpg", "/assets/gar-village.jpg"],
    isUnderConstruction: true,
    shortDesc:
      "The pinnacle of African royal heritage. Designed for dignitaries, executive retreats, and family royalty.",
    keyAmenities: [
      "Royal Courtyard",
      "Grand Throne Lounge",
      "VIP Security Perimeter",
      "Under Construction",
    ],
    amenities: {
      inRoom: [
        "Sprawling imperial thatched lodge",
        "Private meeting salon and dining hall",
        "Full security quarter connectivity",
      ],
      resort: ["All-inclusive resort access", "Private Prayer Hut sanctuary"],
    },
  },
];
