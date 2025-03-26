import { Timestamp } from 'firebase/firestore';

// Base interface for all Firestore documents
export interface FirestoreDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User document
export interface User extends FirestoreDocument {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  walletAddress?: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
}

// Game profile - simplified to match game requirements
export interface GameProfile extends FirestoreDocument {
  userId: string;
  username: string;
  level: number;
  experience: number;
  balance: {
    SPIDER: number;
    feeders: number;
  };
  achievements: string[];
  spiders: SpiderId[];
}

// Inventory item
export interface InventoryItem {
  id: string;
  type: string;
  quantity: number;
  properties?: Record<string, any>;
}

// Spider reference ID
export type SpiderId = string;

// Spider - updated to match game requirements
export interface Spider extends FirestoreDocument {
  ownerId: string;
  name: string;
  uniqueId: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical';
  genetics: 'S' | 'A' | 'J' | 'SA' | 'SJ' | 'AJ' | 'SAJ';
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
  lastFed: string;
  lastHydrated: string;
  lastTokenGeneration: string;
  isHibernating: boolean;
  isAlive: boolean;
  dresses: string[];
  isListed: boolean;
  marketListing?: {
    price: number;
    listedAt: Timestamp;
    expiresAt: Timestamp;
  };
}

// Market listing
export interface MarketListing extends FirestoreDocument {
  sellerId: string;
  spiderId: string;
  price: number;
  expiresAt: Timestamp;
  status: 'active' | 'sold' | 'expired' | 'cancelled';
  buyerId?: string;
  soldAt?: Timestamp;
}

// Transaction
export interface Transaction extends FirestoreDocument {
  type: 'purchase' | 'sale' | 'reward' | 'breeding' | 'other';
  userId: string;
  amount: number;
  description: string;
  relatedItemId?: string;
  status: 'pending' | 'completed' | 'failed';
}

// Breeding
export interface BreedingPair extends FirestoreDocument {
  ownerUserId: string;
  spider1Id: string;
  spider2Id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'breeding' | 'completed' | 'failed';
  resultSpiderId?: string;
}

// Game Event
export interface GameEvent extends FirestoreDocument {
  title: string;
  description: string;
  type: 'tournament' | 'challenge' | 'reward' | 'season';
  startTime: Timestamp;
  endTime: Timestamp;
  rewards: EventReward[];
  participants?: string[]; // user IDs
  status: 'upcoming' | 'active' | 'completed';
}

export interface EventReward {
  type: 'spider' | 'item' | 'gems' | 'resources';
  amount: number;
  itemId?: string;
  rank?: number; // Required position to earn this reward (1st, 2nd, etc.)
} 