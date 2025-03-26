import { collection, doc, getDoc, setDoc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  earnings: number;
}

/**
 * Check if a referral code exists
 */
export const checkReferralCode = async (referralCode: string): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'users', referralCode);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists();
  } catch (error) {
    console.error('Error checking referral code:', error);
    return false;
  }
};

/**
 * Process a user signup with a referral code
 */
export const processReferral = async (userId: string, referrerId: string): Promise<boolean> => {
  try {
    // Create referral record
    const referralRef = doc(db, 'referrals', userId);
    await setDoc(referralRef, {
      userId,
      referrerId,
      createdAt: new Date(),
      isActive: true,
      earnings: 0
    });
    
    // Update referrer's stats
    const referrerStatsRef = doc(db, 'referralStats', referrerId);
    const referrerStatsDoc = await getDoc(referrerStatsRef);
    
    if (referrerStatsDoc.exists()) {
      await updateDoc(referrerStatsRef, {
        totalReferrals: increment(1),
        activeReferrals: increment(1)
      });
    } else {
      await setDoc(referrerStatsRef, {
        totalReferrals: 1,
        activeReferrals: 1,
        earnings: 0
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error processing referral:', error);
    return false;
  }
};

/**
 * Process a referral reward when a referred user makes a purchase
 */
export const processReferralReward = async (userId: string, purchaseAmount: number): Promise<boolean> => {
  try {
    // Find if user was referred by someone
    const referralRef = doc(db, 'referrals', userId);
    const referralDoc = await getDoc(referralRef);
    
    if (!referralDoc.exists() || !referralDoc.data().isActive) {
      return false;
    }
    
    const referralData = referralDoc.data();
    const referrerId = referralData.referrerId;
    
    // Calculate reward (5% of purchase)
    const rewardAmount = purchaseAmount * 0.05;
    
    // Update referrer's stats
    const referrerStatsRef = doc(db, 'referralStats', referrerId);
    await updateDoc(referrerStatsRef, {
      earnings: increment(rewardAmount)
    });
    
    // Add to referrer's balance
    const referrerGameProfileRef = doc(db, 'gameProfiles', referrerId);
    await updateDoc(referrerGameProfileRef, {
      'balance.SPIDER': increment(rewardAmount)
    });
    
    // Update referral with this reward
    await updateDoc(referralRef, {
      earnings: increment(rewardAmount),
      lastReward: new Date(),
      lastRewardAmount: rewardAmount
    });
    
    return true;
  } catch (error) {
    console.error('Error processing referral reward:', error);
    return false;
  }
};

/**
 * Get referral stats for a user
 */
export const getReferralStats = async (userId: string): Promise<ReferralStats> => {
  try {
    const referrerStatsRef = doc(db, 'referralStats', userId);
    const referrerStatsDoc = await getDoc(referrerStatsRef);
    
    if (referrerStatsDoc.exists()) {
      const data = referrerStatsDoc.data();
      return {
        totalReferrals: data.totalReferrals || 0,
        activeReferrals: data.activeReferrals || 0,
        earnings: data.earnings || 0
      };
    }
    
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      earnings: 0
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      earnings: 0
    };
  }
};

/**
 * Get referrals made by a user
 */
export const getUserReferrals = async (referrerId: string) => {
  try {
    const referralsQuery = query(
      collection(db, 'referrals'),
      where('referrerId', '==', referrerId)
    );
    
    const querySnapshot = await getDocs(referralsQuery);
    const referrals: any[] = [];
    
    querySnapshot.forEach((doc) => {
      referrals.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return referrals;
  } catch (error) {
    console.error('Error getting user referrals:', error);
    return [];
  }
}; 