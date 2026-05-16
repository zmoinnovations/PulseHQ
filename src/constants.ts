/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const AFRICAN_DIRECTORY: Record<string, string[]> = {
  "Nigeria": ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Abeokuta", "Enugu", "Benin City", "Jos", "Kaduna", "Uyo", "Calabar", "Warri"],
  "Ghana": ["Accra", "Kumasi", "Tema", "Tamale", "Sekondi-Takoradi", "Cape Coast", "Sunyani"],
  "Kenya": ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Malindi"],
  "South Africa": ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "East London"],
  "Rwanda": ["Kigali", "Gisenyi", "Butare", "Musanze"],
  "Ethiopia": ["Addis Ababa", "Dire Dawa", "Adama", "Gondar", "Bahir Dar", "Mek'ele"],
  "Egypt": ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez"],
  "Morocco": ["Casablanca", "Rabat", "Marrakesh", "Fes", "Tangier", "Agadir"],
  "Senegal": ["Dakar", "Touba", "Thies", "Saint-Louis", "Kaolack"],
  "Tanzania": ["Dar es Salaam", "Mwanza", "Arusha", "Dodoma", "Mbeya", "Morogoro"],
  "Uganda": ["Kampala", "Entebbe", "Mbarara", "Jinja", "Gulu"],
  "Ivory Coast": ["Abidjan", "Bouaké", "Daloa", "Yamoussoukro", "San-Pédro"],
  "Angola": ["Luanda", "Huambo", "Lobito", "Benguela", "Lubango"],
  "Zambia": ["Lusaka", "Kitwe", "Ndola", "Kabwe", "Chingola"],
  "Zimbabwe": ["Harare", "Bulawayo", "Chitungwiza", "Mutare", "Gweru"],
  "Cameroon": ["Douala", "Yaoundé", "Garoua", "Bamenda", "Maroua"],
  "DR Congo": ["Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kananga", "Kisangani"],
  "Botswana": ["Gaborone", "Francistown", "Molepolole", "Maun"],
  "Namibia": ["Windhoek", "Walvis Bay", "Swakopmund", "Oshakati"],
  "Mozambique": ["Maputo", "Matola", "Beira", "Nampula", "Chimoio"],
  "Gambia": ["Banjul", "Bakau", "Serekunda"],
  "Sierra Leone": ["Freetown", "Bo", "Kenema", "Makeni"],
  "Gabon": ["Libreville", "Port-Gentil", "Franceville"],
  "Mauritius": ["Port Louis", "Beau Bassin", "Vacoas", "Curepipe"]
};

export const AFRICAN_LOCATIONS = Object.entries(AFRICAN_DIRECTORY).flatMap(([country, cities]) =>
  cities.map(city => `${city}, ${country}`)
);

// Industries ranked by likelihood of having people with investable capital
export const INDUSTRIES = [
  // Tier 1: High disposable income, financially literate
  "Banking & Finance", "Oil & Gas", "Consulting", "Legal Services", "Medicine & Healthcare",
  "Telecommunications", "Tech & Software", "Real Estate", "Mining",
  // Tier 2: Business owners with idle capital
  "Import/Export", "FMCG Distribution", "Pharmaceuticals", "Construction",
  "Logistics & Shipping", "Manufacturing", "Automotive Dealers",
  // Tier 3: Growing professionals
  "Accounting & Audit", "Insurance", "Engineering", "Aviation",
  "Hospitality & Hotels", "Media & Advertising", "Education (Private)",
  // Tier 4: Diaspora & remittance corridors
  "Diaspora Professionals", "International NGOs", "Diplomatic Services",
  // Tier 5: Aspirational investors
  "Retail Business Owners", "Agriculture (Commercial)", "Fashion & Luxury", "Entertainment"
];




// US cities with high liquidity — wealthy populations, active investors, high disposable income
export const US_DIRECTORY: Record<string, string[]> = {
  "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Irvine", "Beverly Hills", "Palo Alto", "Santa Monica", "Newport Beach", "Walnut Creek"],
  "Nevada": ["Las Vegas", "Henderson", "Reno", "Summerlin"],
  "New York": ["New York City", "Manhattan", "Brooklyn", "White Plains", "Long Island", "Albany"],
  "Florida": ["Miami", "Fort Lauderdale", "Tampa", "Orlando", "Jacksonville", "Boca Raton", "Naples", "West Palm Beach"],
  "Texas": ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "Plano", "Frisco"],
  "Illinois": ["Chicago", "Naperville", "Evanston", "Schaumburg"],
  "Georgia": ["Atlanta", "Buckhead", "Marietta", "Alpharetta", "Savannah"],
  "New Jersey": ["Newark", "Jersey City", "Princeton", "Hoboken", "Cherry Hill"],
  "Connecticut": ["Greenwich", "Stamford", "Hartford", "Westport", "New Haven"],
  "Massachusetts": ["Boston", "Cambridge", "Newton", "Wellesley"],
  "Washington": ["Seattle", "Bellevue", "Redmond", "Kirkland", "Tacoma"],
  "Colorado": ["Denver", "Boulder", "Aspen", "Colorado Springs", "Aurora"],
  "Arizona": ["Scottsdale", "Phoenix", "Paradise Valley", "Tempe", "Chandler"],
  "Maryland": ["Bethesda", "Potomac", "Baltimore", "Columbia", "Rockville"],
  "Virginia": ["McLean", "Arlington", "Tysons Corner", "Alexandria", "Richmond"],
  "Pennsylvania": ["Philadelphia", "Pittsburgh", "King of Prussia", "Wayne"],
  "Hawaii": ["Honolulu", "Maui", "Kailua"],
  "District of Columbia": ["Washington DC", "Georgetown", "Dupont Circle"]
};

export const US_LOCATIONS = Object.entries(US_DIRECTORY).flatMap(([state, cities]) =>
  cities.map(city => `${city}, ${state}`)
);

export const REGIONS = ["Africa", "US"] as const;
export type Region = typeof REGIONS[number];

export const REGION_DIRECTORIES: Record<Region, Record<string, string[]>> = {
  Africa: AFRICAN_DIRECTORY,
  US: US_DIRECTORY,
};



  // - Wealth hubs: Beverly Hills, Greenwich, Scottsdale, McLean, Potomac, Newport Beach
  // - Tech money: Palo Alto, San Jose, Bellevue, Redmond, Austin
  // - Finance corridors: Manhattan, Jersey City, Stamford, Chicago
  // - High-roller cities: Las Vegas, Miami, Boca Raton, Naples
  // - Diaspora-dense: Houston, Atlanta, DC, Brooklyn (large African diaspora communities with remittance behavior)
  //
  // These are places where people have liquid cash, understand investment products, and are actively looking for yield — ideal for the
  // forex/auto-trade/REIF pitch.
