import { User } from 'firebase/auth';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { GameProfile, Spider } from '../types/Firebase';

// Default resources for new players
const DEFAULT_RESOURCES = {
  SPIDER: 5000,
  feeders: 500
};

// Default spider for new players - commented out temporarily
/*
const DEFAULT_SPIDER: Omit<Spider, 'id' | 'createdAt' | 'updatedAt'> = {
  ownerId: '',
  name: 'Starter Spider',
  rarity: 'common',
  level: 1,
  experience: 0,
  attributes: {
    strength: 5,
    speed: 5,
    health: 10,
    defense: 3,
    specialAbility: 1
  },
  skills: [
    {
      id: 'skill_basic_attack',
      name: 'Basic Attack',
      level: 1,
      effect: 'Deals 3-5 damage to target',
      cooldown: 0
    }
  ]
};
*/

/**
 * Load a player's game profile from Firestore
 * @param userId The Firebase user ID
 * @returns The player's game profile or null if not found
 */
export const loadPlayerProfile = async (userId: string): Promise<GameProfile | null> => {
  try {
    const profileDoc = await getDoc(doc(db, 'gameProfiles', userId));
    
    if (profileDoc.exists()) {
      return { id: profileDoc.id, ...profileDoc.data() } as GameProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading player profile:', error);
    return null;
  }
};

/**
 * Get user data including wallet address if available
 * @param userId The Firebase user ID
 * @returns User data or null if not found
 */
export const getUserData = async (userId: string): Promise<any | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    
    return null;
  } catch (error) {
    console.error('Error loading user data:', error);
    return null;
  }
};

/**
 * Create a new player profile in Firestore
 * @param user The Firebase user
 * @param username Optional username (defaults to display name or email)
 * @returns The newly created game profile
 */
export const createPlayerProfile = async (
  user: User,
  username?: string
): Promise<GameProfile> => {
  try {
    // Check if there's wallet data already
    const userData = await getUserData(user.uid);
    const walletAddress = userData?.walletAddress || null;
    
    // TEMPORARILY REMOVED: Spider creation
    // const spiderRef = doc(db, 'spiders', `starter_${user.uid}`);
    // await setDoc(spiderRef, {
    //   ...DEFAULT_SPIDER,
    //   ownerId: user.uid,
    //   createdAt: serverTimestamp(),
    //   updatedAt: serverTimestamp()
    // });
    
    // Determine username
    const playerUsername = username || user.displayName || user.email?.split('@')[0] || `Player${Math.floor(Math.random() * 10000)}`;
    
    // Create profile with updated structure
    const newProfile: Omit<GameProfile, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: user.uid,
      username: playerUsername,
      level: 1,
      experience: 0,
      balance: {
        SPIDER: DEFAULT_RESOURCES.SPIDER,
        feeders: DEFAULT_RESOURCES.feeders
      },
      achievements: [],
      spiders: [] // Empty array instead of [spiderRef.id]
    };
    
    // Ensure user document exists with basic data
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      walletAddress: walletAddress,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // Save to Firestore
    const profileRef = doc(db, 'gameProfiles', user.uid);
    await setDoc(profileRef, {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Return the complete profile
    return {
      id: user.uid,
      ...newProfile,
      createdAt: new Date() as any,
      updatedAt: new Date() as any
    };
  } catch (error) {
    console.error('Error creating player profile:', error);
    throw error;
  }
};

/**
 * Get or create a player profile
 * @param user The Firebase user
 * @returns The existing or newly created game profile
 */
export const getOrCreatePlayerProfile = async (
  user: User
): Promise<GameProfile> => {
  if (!user) throw new Error('User is required to get or create a profile');
  
  // First try to load existing profile
  const existingProfile = await loadPlayerProfile(user.uid);
  
  if (existingProfile) {
    return existingProfile;
  }
  
  // Create a new profile if none exists
  return await createPlayerProfile(user);
};

/**
 * Update player's balance in Firestore
 * @param userId The Firebase user ID
 * @param balance The updated balance object
 */
export const updatePlayerBalance = async (
  userId: string, 
  balance: { SPIDER?: number; feeders?: number }
): Promise<void> => {
  try {
    console.log(`Updating balance for user ${userId}:`, balance);
    
    const profileRef = doc(db, 'gameProfiles', userId);
    const updateData: any = { updatedAt: serverTimestamp() };
    
    // Only include fields that are provided
    if (balance.SPIDER !== undefined) {
      updateData['balance.SPIDER'] = balance.SPIDER;
    }
    
    if (balance.feeders !== undefined) {
      updateData['balance.feeders'] = balance.feeders;
    }
    
    await updateDoc(profileRef, updateData);
    console.log(`Balance updated for user ${userId}`);
  } catch (error) {
    console.error('Error updating player balance:', error);
    throw error;
  }
}; 