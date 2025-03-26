export type Rarity = 'Common' | 'Excellent' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical' | 'SPECIAL';
export type SpecialType = 'MEME';
export type GeneticType = 'S' | 'A' | 'J' | 'SA' | 'SJ' | 'AJ' | 'SAJ';
export type Gender = 'Male' | 'Female';
export type DressType = 'Meme' | 'Shiny' | 'Basic' | 'Effects';

export type DressTheme = 
  | 'Basic' | 'Plain' | 'Simple'
  | 'Striped' | 'Patterned' | 'Design'
  | 'Vintage' | 'Retro' | 'Classic'
  | 'Limited' | 'Exclusive' | 'Premium'
  | 'Royal' | 'Imperial' | 'Noble'
  | 'Divine' | 'Celestial' | 'Ethereal'
  | 'Doge' | 'Pepe' | 'Wojak' | 'Stonks'
  | 'Rickroll' | 'Nyan Cat' | 'Cheems'
  | 'Among Us';

export interface Dress {
  id: string;
  name: string;
  rarity: Rarity;
  powerBonus: number;
  image: string;
  stats: {
    attack: number;
    defense: number;
    agility: number;
    luck: number;
  };
  type: DressType;
  theme: DressTheme;
}

export interface Spider {
  id: string;
  uniqueId: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical';
  genetics: GeneticType;
  gender: 'Male' | 'Female';
  level: number;
  experience: number;
  power: number;
  stats: {
    attack: number;
    defense: number;
    agility: number;
    luck: number;
  };
  condition: {
    health: number;
    hunger: number;
    hydration: number;
  };
  generation: number;
  parents?: {
    father: string;
    mother: string;
  };
  lastFed: string;
  lastHydrated: string;
  lastGemCollection: string;
  lastTokenGeneration: string;
  isHibernating: boolean;
  isAlive: boolean;
  dresses: string[];
  createdAt: string;
  isListed: boolean;
}

export interface Player {
  id: string;
  name: string;
  spiders: Spider[];
  dresses: Dress[];
  balance: {
    SPIDER: number;
    feeders: number;
  };
  webtrap: {
    isUnlocked: boolean;
    level: number;
    lastCollection: string;
  };
  createdAt: string;
  lastLogin: string;
}