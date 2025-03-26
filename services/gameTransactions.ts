import { updatePlayerBalance } from './playerService';

/**
 * Handle a summon transaction that deducts $SPIDER tokens
 * Now focused on just updating the Firestore balance
 * 
 * @param userId User ID for Firestore update
 * @param cost Amount of $SPIDER tokens to deduct
 * @param currentBalance Current balance from the UI
 * @param updateLocalBalance Function to update local state
 */
export const handleSummonTransaction = async (
  userId: string | null,
  cost: number,
  currentBalance: number,
  updateLocalBalance: (updates: { SPIDER: number }) => void
): Promise<boolean> => {
  try {
    if (currentBalance < cost) {
      console.error('Insufficient balance for transaction');
      return false;
    }

    const newBalance = currentBalance - cost;
    console.log(`Processing summon transaction: -${cost} $SPIDER. New balance: ${newBalance}`);
    
    // 1. Update the local state
    updateLocalBalance({ SPIDER: newBalance });
    
    // 2. Update Firestore directly if user is authenticated
    if (userId) {
      try {
        await updatePlayerBalance(userId, { SPIDER: newBalance });
        console.log('Firestore balance updated successfully');
      } catch (error) {
        console.error('Error updating Firestore balance:', error);
        // Continue with the transaction even if Firestore update fails
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error processing summon transaction:', error);
    return false;
  }
}; 