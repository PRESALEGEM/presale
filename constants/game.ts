export const RARITY_LEVELS = {
  Common: 25,
  Excellent: 35,
  Rare: 55,
  Epic: 70,
  Legendary: 80,
  Mythical: 100,
} as const;

export const RARITY_COLORS = {
  Common: '#9CA3AF',
  Excellent: '#34D399',
  Rare: '#3B82F6',
  Epic: '#8B5CF6',
  Legendary: '#F59E0B',
  Mythical: '#EF4444',
  SPECIAL: '#EC4899',
} as const;

export const RARITY_TEXT_COLORS = {
  Common: 'text-gray-500',
  Excellent: 'text-emerald-500',
  Rare: 'text-blue-500',
  Epic: 'text-purple-500',
  Legendary: 'text-amber-500',
  Mythical: 'text-red-500',
  SPECIAL: 'text-pink-500',
} as const;

export const FEEDER_CONSUMPTION = {
  '1-10': 7,
  '11-20': 10,
  '21-25': 12,
  '26-30': 15,
  '31-45': 20,
  '46-60': 25,
  '61-80': 30,
  '81-100': 40,
} as const;

export const EXP_REQUIREMENTS = {
  '1-4': 3,
  '5-10': 5,
  '11-20': 6,
  '21-30': 8,
  '31-40': 10,
  '41-50': 12,
  '51-60': 14,
  '61-70': 17,
  '71-80': 21,
  '81-90': 26,
  '91-100': 35,
} as const;

export const POWER_RANGES = {
  Common: { min: 18, max: 33 },
  Excellent: { min: 34, max: 45 },
  Rare: { min: 46, max: 60 },
  Epic: { min: 61, max: 90 },
  Legendary: { min: 91, max: 150 },
  Mythical: { min: 151, max: 300 },
  SPECIAL: { min: 600, max: 1000 },
} as const;

export const COMBAT_STAT_INCREASE_PER_LEVEL = {
  Common: {
    ATK: { min: 1, max: 2 },
    DEF: { min: 1, max: 2 },
    AGI: { min: 1, max: 2 },
    LUCK: { min: 1, max: 2 }
  },
  Excellent: {
    ATK: { min: 2, max: 3 },
    DEF: { min: 2, max: 3 },
    AGI: { min: 2, max: 3 },
    LUCK: { min: 2, max: 3 }
  },
  Rare: {
    ATK: { min: 3, max: 4 },
    DEF: { min: 3, max: 4 },
    AGI: { min: 3, max: 4 },
    LUCK: { min: 3, max: 4 }
  },
  Epic: {
    ATK: { min: 4, max: 6 },
    DEF: { min: 4, max: 6 },
    AGI: { min: 4, max: 6 },
    LUCK: { min: 4, max: 6 }
  },
  Legendary: {
    ATK: { min: 6, max: 8 },
    DEF: { min: 6, max: 8 },
    AGI: { min: 6, max: 8 },
    LUCK: { min: 6, max: 8 }
  },
  Mythical: {
    ATK: { min: 8, max: 12 },
    DEF: { min: 8, max: 12 },
    AGI: { min: 8, max: 12 },
    LUCK: { min: 8, max: 12 }
  },
  SPECIAL: {
    ATK: { min: 12, max: 18 },
    DEF: { min: 12, max: 18 },
    AGI: { min: 12, max: 18 },
    LUCK: { min: 12, max: 18 }
  }
} as const;

export const DRESS_POWER_BONUS = {
  Common: 25,
  Excellent: 35,
  Rare: 55,
  Epic: 70,
  Legendary: 80,
  Mythical: 100,
  SPECIAL: 500,
} as const;

// Predefined dress collection with SPECIAL rarity
export const DRESS_COLLECTION = [
  {
    type: 'Spider Dress',
    themes: {
      Common: ['Basic', 'Plain', 'Simple'],
      Excellent: ['Striped', 'Patterned', 'Design'],
      Rare: ['Vintage', 'Retro', 'Classic'],
      Epic: ['Limited', 'Exclusive', 'Premium'],
      Legendary: ['Royal', 'Imperial', 'Noble'],
      Mythical: ['Divine', 'Celestial', 'Ethereal'],
      SPECIAL: ['Meme']
    }
  },
  {
    type: 'Shiny Dress',
    themes: {
      Common: ['Basic', 'Plain', 'Simple'],
      Excellent: ['Striped', 'Patterned', 'Design'],
      Rare: ['Vintage', 'Retro', 'Classic'],
      Epic: ['Limited', 'Exclusive', 'Premium'],
      Legendary: ['Royal', 'Imperial', 'Noble'],
      Mythical: ['Divine', 'Celestial', 'Ethereal'],
      SPECIAL: ['Meme']
    }
  },
  {
    type: 'DressEffects',
    themes: {
      Common: ['Basic', 'Plain', 'Simple'],
      Excellent: ['Striped', 'Patterned', 'Design'],
      Rare: ['Vintage', 'Retro', 'Classic'],
      Epic: ['Limited', 'Exclusive', 'Premium'],
      Legendary: ['Royal', 'Imperial', 'Noble'],
      Mythical: ['Divine', 'Celestial', 'Ethereal'],
      SPECIAL: ['Meme']
    }
  }
] as const;

// Generate unique spider ID
export const generateUniqueSpiderId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const uniqueId = `spider_${timestamp}_${random}`;
  return uniqueId;
};

// Generate unique dress ID
export const generateUniqueDressId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const uniqueId = `dress_${timestamp}_${random}`;
  return uniqueId;
};