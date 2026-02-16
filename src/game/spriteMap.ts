// Centralized sprite map: maps emoji IDs to pixel-art images
// Falls back to emoji when no sprite is available

// TCG Card sprites
import treeImg from '@/assets/game/tree.png';
import parkImg from '@/assets/game/park.png';
import reserveImg from '@/assets/game/reserve.png';
import trailImg from '@/assets/game/trail.png';
import gardenImg from '@/assets/game/garden.png';
import reforestationImg from '@/assets/game/reforestation.png';
import seedbombImg from '@/assets/game/seedbomb.png';
import houseImg from '@/assets/game/house.png';
import schoolImg from '@/assets/game/school.png';
import hotelImg from '@/assets/game/hotel.png';
import bikeImg from '@/assets/game/bike.png';
import carImg from '@/assets/game/car.png';
import hospitalImg from '@/assets/game/hospital.png';
import councilImg from '@/assets/game/council.png';
import cleanupImg from '@/assets/game/cleanup.png';
import signsImg from '@/assets/game/signs.png';
import communityImg from '@/assets/game/community.png';
import recyclingImg from '@/assets/game/recycling.png';
import meetingImg from '@/assets/game/meeting.png';
import smartcityImg from '@/assets/game/smartcity.png';
import lawImg from '@/assets/game/law.png';
import governanceImg from '@/assets/game/governance.png';
import firebrigadeImg from '@/assets/game/firebrigade.png';

// Threat sprites
import pollutionImg from '@/assets/game/pollution.png';
import stormImg from '@/assets/game/storm.png';
import wildfireImg from '@/assets/game/wildfire.png';

// Nature / Memory sprites
import araraImg from '@/assets/game/arara.png';
import jaguarImg from '@/assets/game/jaguar.png';
import whaleImg from '@/assets/game/whale.png';
import turtleImg from '@/assets/game/turtle.png';
import crabImg from '@/assets/game/crab.png';
import coralImg from '@/assets/game/coral.png';
import crystalImg from '@/assets/game/crystal.png';
import cisternImg from '@/assets/game/cistern.png';
import orchidImg from '@/assets/game/orchid.png';
import seedlingImg from '@/assets/game/seedling.png';
import beeImg from '@/assets/game/bee.png';

// ── CARD ID → SPRITE ──────────────────────────────────
// Maps game card IDs to their pixel-art sprites
export const CARD_SPRITES: Record<string, string> = {
  // RA cards
  plant_tree: treeImg,
  create_park: parkImg,
  nature_reserve: reserveImg,
  eco_trail: trailImg,
  botanical_garden: gardenImg,
  reforestation: reforestationImg,
  seed_bomb: seedbombImg,
  // OE cards
  build_house: houseImg,
  build_school: schoolImg,
  build_hotel: hotelImg,
  clean_transport: bikeImg,
  dirty_transport: carImg,
  build_hospital: hospitalImg,
  smart_city: smartcityImg,
  // AO cards
  council: councilImg,
  cleanup_program: cleanupImg,
  edu_signs: signsImg,
  community_center: communityImg,
  recycling: recyclingImg,
  town_meeting: meetingImg,
  public_governance: governanceImg,
  // Policy
  eco_law: lawImg,
  // Biome-specific
  fire_brigade: firebrigadeImg,
  canopy_walk: parkImg,
  mangrove: seedlingImg,
  beach_cleanup: cleanupImg,
  slope_reforest: reforestationImg,
  mountain_lodge: hotelImg,
  cistern: cisternImg,
  native_seeds: seedlingImg,
  bio_treatment: coralImg,
  floating_garden: gardenImg,
  green_roof: parkImg,
  metro: bikeImg,
};

// ── THREAT ID → SPRITE ──────────────────────────────────
export const THREAT_SPRITES: Record<string, string> = {
  light_rain: stormImg,
  heavy_rain: stormImg,
  hurricane: stormImg,
  trash_wave: pollutionImg,
  smog: pollutionImg,
  toxic_spill: pollutionImg,
  wildfire: wildfireImg,
  noise: meetingImg,
  small_crowd: communityImg,
  overcrowding: communityImg,
  landslide: stormImg,
  epidemic: pollutionImg,
  total_chaos: wildfireImg,
  mass_exodus: houseImg,
  illegal_logging: wildfireImg,
  oil_spill: pollutionImg,
  coastal_erosion: stormImg,
  avalanche: stormImg,
  mining: crystalImg,
  severe_drought: pollutionImg,
  monoculture: seedlingImg,
  algae_bloom: coralImg,
  fish_death: coralImg,
  traffic_jam: carImg,
  gentrification: houseImg,
};

// ── EMOJI → SPRITE (for Memory & Treasure) ──────────────
export const EMOJI_SPRITES: Record<string, string> = {
  '🌳': treeImg,
  '🦜': araraImg,
  '🌱': seedlingImg,
  '🐆': jaguarImg,
  '🍯': beeImg,
  '🌺': orchidImg,
  '♻️': recyclingImg,
  '🌍': coralImg,
  '💧': crystalImg,
  '🐒': jaguarImg,
  '🪵': treeImg,
  '🦋': beeImg,
  '🐋': whaleImg,
  '🪸': coralImg,
  '🐢': turtleImg,
  '🌊': stormImg,
  '🦈': whaleImg,
  '🐙': turtleImg,
  '🐠': coralImg,
  '🦑': whaleImg,
  '🦅': araraImg,
  '❄️': crystalImg,
  '🌿': seedlingImg,
  '🌬️': stormImg,
  '🦎': jaguarImg,
  '🪨': crystalImg,
  '☀️': lawImg,
  '🌲': treeImg,
  '💎': crystalImg,
  '🌡️': pollutionImg,
  '🦀': crabImg,
  '🌴': treeImg,
  '🐟': coralImg,
  '🦪': crabImg,
  '🐊': jaguarImg,
  '🚰': pollutionImg,
  '🦩': araraImg,
  '🏗️': communityImg,
  '🐴': turtleImg,
  '🤝': councilImg,
  '🏠': houseImg,
  '🏫': schoolImg,
  '🏨': hotelImg,
  '🚲': bikeImg,
  '🚗': carImg,
  '🏥': hospitalImg,
  '🧹': cleanupImg,
  '🪧': signsImg,
  '🏛️': communityImg,
  '⚖️': lawImg,
  '🌐': smartcityImg,
  '🗳️': governanceImg,
  '📢': meetingImg,
  '🌻': gardenImg,
  '🌾': seedlingImg,
  '🧪': coralImg,
  '🪷': gardenImg,
  '🏙️': smartcityImg,
  '🚇': bikeImg,
};

/**
 * Get sprite URL for a game card by ID, with emoji fallback
 */
export function getCardSprite(cardId: string): string | null {
  return CARD_SPRITES[cardId] || null;
}

/**
 * Get sprite URL for a threat card by ID
 */
export function getThreatSprite(threatId: string): string | null {
  return THREAT_SPRITES[threatId] || null;
}

/**
 * Get sprite URL for an emoji, with fallback to null
 */
export function getEmojiSprite(emoji: string): string | null {
  return EMOJI_SPRITES[emoji] || null;
}
