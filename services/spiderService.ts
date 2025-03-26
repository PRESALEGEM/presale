import { db } from '../config/firebase';
import { doc, collection, setDoc, updateDoc, arrayUnion, getDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Spider, GameProfile } from '../types/Firebase';
import { Spider as LocalSpider } from '../types/spider';

/**
 * Convert a local spider model to a Firebase spider model
 * @param spider The local spider object
 * @returns A spider object compatible with Firebase
 */
const localToFirebaseSpider = (spider: LocalSpider, userId: string): Omit<Spider, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    ownerId: userId,
    name: spider.name,
    uniqueId: spider.uniqueId,
    rarity: spider.rarity,
    genetics: spider.genetics,
    gender: spider.gender,
    level: spider.level,
    experience: spider.experience,
    power: spider.power,
    stats: {
      attack: spider.stats.attack,
      defense: spider.stats.defense,
      agility: spider.stats.agility,
      luck: spider.stats.luck,
    },
    condition: {
      health: spider.condition.health,
      hunger: spider.condition.hunger,
      hydration: spider.condition.hydration,
    },
    generation: spider.generation,
    lastFed: spider.lastFed,
    lastHydrated: spider.lastHydrated,
    lastTokenGeneration: spider.lastTokenGeneration,
    isHibernating: spider.isHibernating,
    isAlive: spider.isAlive,
    dresses: spider.dresses,
    isListed: spider.isListed,
  };
};

/**
 * Convert a Firebase spider model to a local spider model
 * @param spider The Firebase spider object
 * @returns A spider object compatible with the local store
 */
const firebaseToLocalSpider = (spider: Spider): LocalSpider => {
  return {
    id: spider.id,
    uniqueId: spider.uniqueId,
    name: spider.name,
    rarity: spider.rarity,
    genetics: spider.genetics,
    gender: spider.gender,
    level: spider.level,
    experience: spider.experience,
    power: spider.power,
    stats: {
      attack: spider.stats.attack,
      defense: spider.stats.defense,
      agility: spider.stats.agility,
      luck: spider.stats.luck,
    },
    condition: {
      health: spider.condition.health,
      hunger: spider.condition.hunger,
      hydration: spider.condition.hydration,
    },
    generation: spider.generation,
    lastFed: spider.lastFed,
    lastHydrated: spider.lastHydrated,
    lastTokenGeneration: spider.lastTokenGeneration,
    isHibernating: spider.isHibernating,
    isAlive: spider.isAlive,
    dresses: spider.dresses,
    createdAt: spider.createdAt.toDate().toISOString(),
    updatedAt: spider.updatedAt.toDate().toISOString(),
    isListed: spider.isListed
  };
};

/**
 * Save a new spider to Firestore and update the player's profile to include it
 * @param spider The spider object to save
 * @param userId The ID of the user who owns the spider
 * @returns The saved spider with its Firestore ID
 */
export const saveNewSpider = async (
  spider: Omit<LocalSpider, 'id' | 'createdAt' | 'updatedAt'>, 
  userId: string
): Promise<LocalSpider> => {
  try {
    console.log(`Saving new spider to Firestore for user ${userId}`, spider);
    
    // Create a reference to a new document with an auto-generated ID
    const spiderRef = doc(collection(db, 'spiders'));
    const spiderId = spiderRef.id;
    console.log(`Generated new Firestore ID for spider: ${spiderId}`);
    
    // Create timestamp objects for Firebase
    const now = Timestamp.now();
    
    // Convert the local spider to a Firebase spider
    const firebaseSpider = localToFirebaseSpider(spider as LocalSpider, userId);
    
    // Prepare the spider data with timestamps
    const spiderData = {
      ...firebaseSpider,
      createdAt: now,
      updatedAt: now
    };
    
    // Save the spider to Firestore
    await setDoc(spiderRef, spiderData);
    console.log(`Spider ${spiderId} saved to Firestore`);
    
    // Update the player's profile to include this spider
    try {
      const profileRef = doc(db, 'gameProfiles', userId);
      await updateDoc(profileRef, {
        spiders: arrayUnion(spiderId),
        updatedAt: serverTimestamp()
      });
      console.log(`Added spider ${spiderId} to user ${userId}'s profile`);
    } catch (profileError) {
      console.error(`Error updating player profile for user ${userId}:`, profileError);
      // Continue anyway - the spider is saved, but not linked to the profile
      // We will handle this during profile loading
    }
    
    // Return the saved spider with its ID as a local spider model
    const savedSpider = {
      ...spider,
      id: spiderId,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString()
    } as LocalSpider;
    
    console.log(`Returning saved spider with ID ${spiderId}`, savedSpider);
    return savedSpider;
  } catch (error) {
    console.error('Error saving spider to Firestore:', error);
    throw error;
  }
};

/**
 * Update an existing spider in Firestore
 * @param spiderId The ID of the spider to update
 * @param updates The updates to apply to the spider
 */
export const updateSpider = async (
  spiderId: string,
  updates: Partial<Omit<LocalSpider, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const spiderRef = doc(db, 'spiders', spiderId);
    
    // Create a new object with only the properties that exist in Firebase Spider model
    const firebaseUpdates: any = {};
    
    // Copy over all valid properties
    if (updates.name) firebaseUpdates.name = updates.name;
    if (updates.uniqueId) firebaseUpdates.uniqueId = updates.uniqueId;
    if (updates.rarity) firebaseUpdates.rarity = updates.rarity;
    if (updates.genetics) firebaseUpdates.genetics = updates.genetics;
    if (updates.gender) firebaseUpdates.gender = updates.gender;
    if (updates.level) firebaseUpdates.level = updates.level;
    if (updates.experience) firebaseUpdates.experience = updates.experience;
    if (updates.power) firebaseUpdates.power = updates.power;
    if (updates.stats) firebaseUpdates.stats = updates.stats;
    if (updates.condition) firebaseUpdates.condition = updates.condition;
    if (updates.generation) firebaseUpdates.generation = updates.generation;
    if (updates.lastFed) firebaseUpdates.lastFed = updates.lastFed;
    if (updates.lastHydrated) firebaseUpdates.lastHydrated = updates.lastHydrated;
    if (updates.lastTokenGeneration) firebaseUpdates.lastTokenGeneration = updates.lastTokenGeneration;
    if (updates.isHibernating !== undefined) firebaseUpdates.isHibernating = updates.isHibernating;
    if (updates.isAlive !== undefined) firebaseUpdates.isAlive = updates.isAlive;
    if (updates.dresses) firebaseUpdates.dresses = updates.dresses;
    if (updates.isListed !== undefined) firebaseUpdates.isListed = updates.isListed;
    
    // Add updatedAt timestamp
    firebaseUpdates.updatedAt = serverTimestamp();
    
    await updateDoc(spiderRef, firebaseUpdates);
  } catch (error) {
    console.error('Error updating spider in Firestore:', error);
    throw error;
  }
};

/**
 * Get a spider by its ID
 * @param spiderId The ID of the spider to retrieve
 * @returns The spider object or null if not found
 */
export const getSpiderById = async (spiderId: string): Promise<LocalSpider | null> => {
  try {
    const spiderDoc = await getDoc(doc(db, 'spiders', spiderId));
    
    if (spiderDoc.exists()) {
      const firebaseSpider = { id: spiderDoc.id, ...spiderDoc.data() } as Spider;
      return firebaseToLocalSpider(firebaseSpider);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting spider from Firestore:', error);
    return null;
  }
};

/**
 * Load all spiders for a player from Firestore
 * @param userId The ID of the user whose spiders to load
 * @returns An array of the player's spiders
 */
export const loadPlayerSpiders = async (userId: string): Promise<LocalSpider[]> => {
  try {
    // Query spiders collection for all spiders owned by this user
    const spidersQuery = query(
      collection(db, 'spiders'),
      where('ownerId', '==', userId)
    );
    
    const spidersSnapshot = await getDocs(spidersQuery);
    
    // Convert each document to a local spider model
    const spiders: LocalSpider[] = [];
    
    spidersSnapshot.forEach((doc) => {
      const firebaseSpider = { id: doc.id, ...doc.data() } as Spider;
      spiders.push(firebaseToLocalSpider(firebaseSpider));
    });
    
    console.log(`Loaded ${spiders.length} spiders for user ${userId}`);
    return spiders;
  } catch (error) {
    console.error('Error loading player spiders from Firestore:', error);
    return [];
  }
}; 