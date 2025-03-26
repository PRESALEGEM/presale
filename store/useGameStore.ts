import { create } from 'zustand';
import { Spider, Player, GeneticType, Dress } from '../types/spider';
import { feedSpider, hydrateSpider, updatePlayerTokens, getFeedersNeeded, getFeedingCost } from '../utils/core';
import { generateUniqueSpiderId } from '@/constants/game';
import { updateSpider as updateSpiderInFirestore } from '../services/spiderService';
import { updatePlayerBalance } from '../services/playerService';
import { getAuth } from 'firebase/auth';

interface ListedItem {
  id: string;
  type: 'EGG' | 'SPIDER' | 'DRESS' | 'FEEDERS';
  itemId: number | string;
  name: string;
  price: number;
  seller: string;
  icon: string;
  description: string;
}

interface MarketState {
  myListings: ListedItem[];
  marketListings: ListedItem[];
}

interface GameState {
  player: Player;
  market: MarketState;
  feedSpiderAction: (spiderId: string) => void;
  hydrateSpiderAction: (spiderId: string) => void;
  updateTokens: () => void;
  addSpider: (spider: Spider) => void;
  updateSpider: (id: string, updates: Partial<Spider>) => void;
  removeSpider: (id: string) => void;
  updateBalance: (updates: Partial<Player['balance']>) => void;
  addDress: (dress: Dress) => void;
  updateWebtrap: (updates: Partial<Player['webtrap']>) => void;
  listItem: (item: ListedItem) => void;
  cancelListing: (itemId: string) => void;
  buyListing: (itemId: string) => void;
}

//const initialSpider: Spider = {
  //id: '1',
  //uniqueId: generateUniqueSpiderId(),
  //name: 'Test Spider',
  //rarity: 'Legendary',
  //genetics: 'S',
  //gender: Math.random() < 0.5 ? 'Male' : 'Female',
  //level: 1,
  //experience: 0,
  ////power: 600,
  //stats: {
    //attack: 10,
    //defense: 10,
    //agility: 10,
    //luck: 10,
  //},
  //condition: {
    //health: 100,
    //hunger: 80,
    //hydration: 90,
  //},
  //generation: 1,
  //lastFed: new Date().toISOString(),
  //lastHydrated: new Date().toISOString(),
  //lastGemCollection: new Date().toISOString(),
  //lastTokenGeneration: new Date().toISOString(),
  //isHibernating: false,
  //isAlive: true,
  //dresses: [],
  //createdAt: new Date().toISOString(),
  //isListed: false
//};

const initialPlayer: Player = {
  id: '1',
  name: 'Player One',
  spiders: [],
  balance: {
    SPIDER: 5000,
    feeders: 500
  },
  dresses: [],
  webtrap: {
    isUnlocked: false,
    level: 1,
    lastCollection: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
};

const initialMarketState: MarketState = {
  myListings: [],
  marketListings: []
};

// Helper function to sync spider changes with Firestore
const syncSpiderWithFirestore = async (spiderId: string, updates: Partial<Spider>) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (user) {
    try {
      // Only sync with Firestore if the user is logged in and the spider ID looks like a Firestore ID
      // Local IDs typically start with "spider-", while Firestore IDs are alphanumeric
      if (!spiderId.startsWith('spider-')) {
        await updateSpiderInFirestore(spiderId, updates);
      }
    } catch (error) {
      console.error('Error syncing spider with Firestore:', error);
    }
  }
};

// Helper function to sync player balance with Firestore
const syncBalanceWithFirestore = async (updates: Partial<Player['balance']>) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (user) {
    try {
      await updatePlayerBalance(user.uid, updates);
      console.log('Synced player balance with Firestore:', updates);
    } catch (error) {
      console.error('Error syncing balance with Firestore:', error);
    }
  }
};

export const useGameStore = create<GameState>((set, get) => ({
  player: initialPlayer,
  market: initialMarketState,
  
  feedSpiderAction: (spiderId: string) => set((state) => {
    const spiderIndex = state.player.spiders.findIndex(s => s.id === spiderId);
    if (spiderIndex === -1) return state;

    const spider = state.player.spiders[spiderIndex];
    const feedersNeeded = getFeedingCost(spider.level);
    
    if (state.player.balance.feeders < feedersNeeded) return state;

    const updatedSpider = feedSpider(spider, state.player.balance.feeders);
    if (!updatedSpider) return state;

    const updatedSpiders = [...state.player.spiders];
    updatedSpiders[spiderIndex] = updatedSpider;
    
    // Sync changes with Firestore
    const updates = {
      condition: updatedSpider.condition,
      experience: updatedSpider.experience,
      level: updatedSpider.level,
      lastFed: updatedSpider.lastFed
    };
    syncSpiderWithFirestore(spiderId, updates);

    return {
      player: {
        ...state.player,
        spiders: updatedSpiders,
        balance: {
          ...state.player.balance,
          feeders: state.player.balance.feeders - feedersNeeded,
        },
      },
    };
  }),

  hydrateSpiderAction: (spiderId: string) => set((state) => {
    const spiderIndex = state.player.spiders.findIndex(s => s.id === spiderId);
    if (spiderIndex === -1) return state;

    const spider = state.player.spiders[spiderIndex];
    const feedersNeeded = getFeedersNeeded(spider.level);
    
    if (state.player.balance.feeders < feedersNeeded) return state;

    const updatedSpider = hydrateSpider(state.player.spiders[spiderIndex]);
    const updatedSpiders = [...state.player.spiders];
    updatedSpiders[spiderIndex] = updatedSpider;
    
    // Sync changes with Firestore
    const updates = {
      condition: updatedSpider.condition,
      experience: updatedSpider.experience,
      level: updatedSpider.level,
      lastHydrated: updatedSpider.lastHydrated
    };
    syncSpiderWithFirestore(spiderId, updates);

    return {
      player: {
        ...state.player,
        spiders: updatedSpiders,
        balance: {
          ...state.player.balance,
          feeders: state.player.balance.feeders - feedersNeeded,
        },
      },
    };
  }),

  updateTokens: () => set((state) => ({
    player: updatePlayerTokens(state.player),
  })),

  addSpider: (spider) => set((state) => ({
    player: {
      ...state.player,
      spiders: [...state.player.spiders, spider],
    },
  })),

  updateSpider: (id, updates) => set((state) => {
    // Sync changes with Firestore
    syncSpiderWithFirestore(id, updates);
    
    return {
      player: {
        ...state.player,
        spiders: state.player.spiders.map((spider) =>
          spider.id === id ? { ...spider, ...updates } : spider
        ),
      },
    };
  }),

  // Make sure this function is properly implemented
  removeSpider: (id) => set((state) => {
    console.log("Removing spider with ID:", id); // Add logging for debugging
    return {
      player: {
        ...state.player,
        spiders: state.player.spiders.filter((spider) => spider.id !== id),
      },
    };
  }),

  updateBalance: (updates) => {
    // First update the local state
    set((state) => ({
      player: {
        ...state.player,
        balance: { ...state.player.balance, ...updates },
      },
    }));
    
    // Then sync with Firestore (if authenticated)
    syncBalanceWithFirestore(updates);
  },

  addDress: (dress) => set((state) => ({
    player: {
      ...state.player,
      dresses: [...state.player.dresses, dress],
    },
  })),

  updateWebtrap: (updates) => set((state) => ({
    player: {
      ...state.player,
      webtrap: { ...state.player.webtrap, ...updates },
    },
  })),

  listItem: (item: ListedItem) => {
    set((state) => ({
      market: {
        ...state.market,
        myListings: [...state.market.myListings, item],
        marketListings: [...state.market.marketListings, item]
      },
      player: {
        ...state.player,
        spiders: state.player.spiders.map(spider => 
          spider.id === item.itemId 
            ? { ...spider, isListed: true }
            : spider
        )
      }
    }));
    
    // If this is a spider, sync its listing status to Firestore
    if (item.type === 'SPIDER') {
      syncSpiderWithFirestore(item.itemId as string, { isListed: true });
    }
  },

  cancelListing: (listingId: string) => {
    set((state) => {
      const listing = state.market.myListings.find(item => item.id === listingId);
      
      // If this is a spider, sync its listing status to Firestore
      if (listing && listing.type === 'SPIDER') {
        syncSpiderWithFirestore(listing.itemId as string, { isListed: false });
      }
      
      return {
        market: {
          ...state.market,
          myListings: state.market.myListings.filter(item => item.id !== listingId),
          marketListings: state.market.marketListings.filter(item => item.id !== listingId)
        },
        player: {
          ...state.player,
          spiders: state.player.spiders.map(spider => 
            spider.id === listing?.itemId 
              ? { ...spider, isListed: false }
              : spider
          )
        }
      };
    });
  },

  buyListing: (listingId: string) => {
    set((state) => {
      const listing = state.market.marketListings.find(item => item.id === listingId);
      if (!listing) return state;
  
      return {
        market: {
          ...state.market,
          myListings: state.market.myListings.filter(item => item.id !== listingId),
          marketListings: state.market.marketListings.filter(item => item.id !== listingId)
        },
        player: {
          ...state.player,
          balance: {
            ...state.player.balance,
            SPIDER: state.player.balance.SPIDER - listing.price
          }
        }
      };
    });
  }})
);