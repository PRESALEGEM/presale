"use client";

import { useEffect, useState } from "react";
import { Sliders as Spider, Trophy, Users, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TonConnectButton, useTonConnectUI } from "@tonconnect/ui-react";
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  increment,
  runTransaction
} from 'firebase/firestore';

// Create a simple toast interface for this component
interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

// Simplified toast function
const toast = ({ message, type = "info" }: ToastProps) => {
  alert(`${type.toUpperCase()}: ${message}`);
};

interface Referral {
  referrer: string;
  totalAmount: number;
  referralCount: number;
  validInvites: number;
  eligibleInvites: number;
}

// Add this new interface after the existing interfaces
interface ReferrerStats {
  referrer: string;
  totalAmount: number;
  referralCount: number;
  validInvites: number;
  eligibleInvites: number;
}

// Add these interfaces at the top with other interfaces
interface InviteData {
  total: number;
  referrals: string[];
}

interface PlayerData {
  walletAddress: string;
  feeders: number;
  totalInvites: number;
  eligibleInvites: InviteData;
  validInvites: InviteData;
  invalidInvites: InviteData;
}

export default function Home() {
  const [tonConnectUI] = useTonConnectUI();
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tonBalance, setTonBalance] = useState("0");
  const [spiderBalance, setSpiderBalance] = useState("0");
  const [amount, setAmount] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [leaderboard, setLeaderboard] = useState<Referral[]>([]);
  const [userReferralCode, setUserReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isFetchingLeaderboard, setIsFetchingLeaderboard] = useState(false);
  const [savedReferrer, setSavedReferrer] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<{
    invalidInvites: number;
    validInvites: number;
    eligibleInvites: number;
  }>({ invalidInvites: 0, validInvites: 0, eligibleInvites: 0 });
  const [feedersBalance, setFeedersBalance] = useState<number>(0);

  const contractAddress = "EQBUMjg7ROfjh_ou3Lz1lpNrTJN59h2S-Wm-ZPsWWVzn-xc9";
  const receiverAddress = "UQAVhdnM_-BLbS6W4b1BF5UyGWuIapjXRZjNJjfve7StCqST";

  // Monitor wallet connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = tonConnectUI.connected;
        setConnected(isConnected);
        
        if (isConnected && tonConnectUI.wallet) {
          const walletInfo = tonConnectUI.wallet;
          const walletAddress = walletInfo.account.address;
          setWalletAddress(walletAddress);
          setUserReferralCode(walletAddress.slice(0, 8));

          // Initialize user data in Firestore
          try {
            const userDoc = doc(db, 'users', walletAddress);
            const userSnap = await getDoc(userDoc);

            if (!userSnap.exists()) {
              await setDoc(userDoc, {
                address: walletAddress,
                referralCode: walletAddress.slice(0, 8),
                createdAt: new Date().toISOString(),
                totalPurchases: 0,
                lastActive: new Date().toISOString()
              });

              // Initialize referrals document
              const referralDoc = doc(db, 'referrals', walletAddress.slice(0, 8));
              const referralSnap = await getDoc(referralDoc);

              if (!referralSnap.exists()) {
                await setDoc(referralDoc, {
                  totalAmount: 0,
                  referralCount: 0,
                  validInvites: 0,
                  eligibleInvites: 0,
                  invalidInvites: 0,
                  lastUpdated: new Date().toISOString()
                });
              }

              // Initialize feeders balance
              const balanceDoc = doc(db, 'feeders_balances', walletAddress);
              const balanceSnap = await getDoc(balanceDoc);

              if (!balanceSnap.exists()) {
                await setDoc(balanceDoc, {
                  balance: 0,
                  last_updated: new Date().toISOString()
                });
              }
            } else {
              // Update last active timestamp
              await updateDoc(userDoc, {
                lastActive: new Date().toISOString()
              });
            }

            const playerDoc = doc(db, 'players', walletAddress.slice(0, 8));
            const playerSnap = await getDoc(playerDoc);

            if (!playerSnap.exists()) {
              await setDoc(playerDoc, {
                walletAddress: walletAddress,
                feeders: 0,
                totalInvites: 0,
                eligibleInvites: { total: 0, referrals: [] },
                validInvites: { total: 0, referrals: [] },
                invalidInvites: { total: 0, referrals: [] }
              });
            }
          } catch (err) {
            console.error("Error initializing user data:", err);
          }
        } else {
          setWalletAddress(null);
          setUserReferralCode("");
        }
      } catch (err) {
        console.error("Error checking wallet connection:", err);
        setConnected(false);
        setWalletAddress(null);
      }
    };

    checkConnection();

    // Set up event listener for wallet connection changes
    tonConnectUI.onStatusChange(async (wallet) => {
      setConnected(!!wallet);
      if (wallet) {
        setWalletAddress(wallet.account.address);
        setUserReferralCode(wallet.account.address.slice(0, 8));
        await fetchBalances(wallet.account.address);
        await fetchLeaderboard();
      } else {
        setWalletAddress(null);
        setUserReferralCode("");
        setTonBalance("0");
        setSpiderBalance("0");
      }
    });
  }, [tonConnectUI]);

  // Initial data fetch when wallet is connected
  useEffect(() => {
    if (connected && walletAddress) {
      fetchBalances(walletAddress);
      fetchLeaderboard();
    }
  }, [connected, walletAddress]);

  // Load saved referrer from local storage on component mount
  useEffect(() => {
    try {
      const storedReferrer = localStorage.getItem('spiderReferrer');
      if (storedReferrer) {
        setSavedReferrer(storedReferrer);
      }
    } catch (err) {
      console.error("Error reading from local storage:", err);
    }
  }, []);

  // Set referrer in input field if saved
  useEffect(() => {
    if (savedReferrer && referralCode === '') {
      setReferralCode(savedReferrer);
    }
  }, [savedReferrer, referralCode]);

  // After the initial effects, add an effect to fetch feeders balance
  useEffect(() => {
    if (connected && walletAddress) {
      fetchFeedersBalance();
    }
  }, [connected, walletAddress]);

  const fetchBalances = async (address?: string) => {
    if (!address && !walletAddress) return;
    
    const addressToUse = address || walletAddress;
    if (!addressToUse) return;

    setIsFetchingBalances(true);
    try {
      // Use Promise.all to fetch both balances in parallel
      const [tonResponse, jettonResponse] = await Promise.all([
        fetch(`https://tonapi.io/v2/accounts/${addressToUse}`, {
          headers: { 'Accept': 'application/json' }
        }),
        fetch(`https://tonapi.io/v2/accounts/${addressToUse}/jettons`, {
          headers: { 'Accept': 'application/json' }
        })
      ]);

      if (!tonResponse.ok) {
        console.error("TON API error:", tonResponse.status);
        setTonBalance("Error");
      } else {
        const tonData = await tonResponse.json();
        setTonBalance((tonData.balance / 1e9).toFixed(2));
      }

      if (!jettonResponse.ok) {
        console.error("Jetton API error:", jettonResponse.status);
        setSpiderBalance("Error");
      } else {
        const jettonData = await jettonResponse.json();
        const jetton = jettonData.balances?.find((j: any) => j.jetton.address === contractAddress);
        setSpiderBalance(jetton ? (jetton.balance / 1e9).toFixed(2) : "0");
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      setError("Failed to fetch balances. Please try again.");
    } finally {
      setIsFetchingBalances(false);
    }
  };

  const fetchLeaderboard = async () => {
    setIsFetchingLeaderboard(true);
    try {
      // Get all purchases first to calculate total amounts
      const purchasesRef = collection(db, 'purchases');
      const purchasesSnap = await getDocs(purchasesRef);
      const purchasesByReferrer = new Map<string, number>();

      // Calculate total amounts from purchases
      for (const doc of purchasesSnap.docs) {
        const purchase = doc.data();
        if (purchase.referrer && purchase.amount) {
          purchasesByReferrer.set(
            purchase.referrer, 
            (purchasesByReferrer.get(purchase.referrer) || 0) + purchase.amount
          );
        }
      }

      // Get all players
      const playersRef = collection(db, 'players');
      const playersSnap = await getDocs(playersRef);
      
      const leaderboardData = playersSnap.docs
        .map(doc => {
          const data = doc.data();
          return {
            referrer: doc.id,
            totalAmount: purchasesByReferrer.get(doc.id) || 0,
            validInvites: data.validInvites?.total || 0,
            eligibleInvites: data.eligibleInvites?.total || 0,
            referralCount: data.totalInvites || 0
          };
        })
        // Only include players who have valid invites
        .filter(player => player.validInvites > 0)
        // Sort by total amount spent by referrals
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setLeaderboard([]);
    } finally {
      setIsFetchingLeaderboard(false);
    }
  };

  // Function to check if user has a referrer
  const checkUserReferrer = async () => {
    if (!walletAddress) return null;
    
    try {
      const userRefDoc = doc(db, 'user_referrals', walletAddress);
      const docSnap = await getDoc(userRefDoc);
      return docSnap.exists() ? docSnap.data().referrer : null;
    } catch (error) {
      console.error("Error checking user referrer:", error);
      return null;
    }
  };

  // Function to verify if a referral code is valid
  const verifyReferralCode = async (code: string) => {
    // Prevent self-referral
    if (code === userReferralCode) {
      toast({
        message: "You cannot use your own referral code",
        type: "error"
      });
      return false;
    }

    // Check format: 8 characters long
    if (code.length !== 8) {
      toast({
        message: "Invalid referral code format. Must be 8 characters long.",
        type: "error"
      });
      return false;
    }

    return true;
  };

  // Function to create referral record if it doesn't exist
  const createReferralIfNeeded = async (code: string) => {
    try {
      const referralDoc = doc(db, 'referrals', code);
      const referralSnap = await getDoc(referralDoc);
      
      if (!referralSnap.exists()) {
        await setDoc(referralDoc, {
          totalAmount: 0,
          referralCount: 0,
          validInvites: 0,
          eligibleInvites: 0,
          invalidInvites: 0,
          lastUpdated: new Date().toISOString()
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error creating referral:", error);
      return false;
    }
  };

  // Function to check user's referral stats
  const fetchReferralStats = async () => {
    if (!connected || !userReferralCode) return;
    
    try {
      const playerDoc = doc(db, 'players', userReferralCode);
      const playerSnap = await getDoc(playerDoc);
      
      if (playerSnap.exists()) {
        const data = playerSnap.data();
        setReferralStats({
          invalidInvites: data.invalidInvites?.total || 0,
          validInvites: data.validInvites?.total || 0,
          eligibleInvites: data.eligibleInvites?.total || 0
        });
        setFeedersBalance(data.feeders || 0);
      } else {
        // Initialize player document if it doesn't exist
        await setDoc(playerDoc, {
          walletAddress: walletAddress,
          feeders: 0,
          totalInvites: 0,
          eligibleInvites: { total: 0, referrals: [] },
          validInvites: { total: 0, referrals: [] },
          invalidInvites: { total: 0, referrals: [] }
        });
        
        setReferralStats({
          invalidInvites: 0,
          validInvites: 0,
          eligibleInvites: 0
        });
        setFeedersBalance(0);
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    }
  };

  // Function to fetch user's feeders balance
  const fetchFeedersBalance = async () => {
    if (!walletAddress) return;
    
    try {
      const balanceDoc = doc(db, 'feeders_balances', walletAddress);
      const docSnap = await getDoc(balanceDoc);
      
      setFeedersBalance(docSnap.exists() ? docSnap.data().balance : 0);
    } catch (error) {
      console.error("Error fetching feeders balance:", error);
    }
  };

  // Function to distribute rewards for referrals
  const distributeReferralRewards = async (referrerCode: string, amount: number) => {
    if (!walletAddress || !referrerCode) return;
    
    try {
      // First, verify the referrer exists
      const referrerDoc = doc(db, 'referrals', referrerCode);
      const referrerSnap = await getDoc(referrerDoc);
      
      if (!referrerSnap.exists()) {
        console.error("Could not find referrer");
        return;
      }
      
      // Award 5 feeders to both parties
      const FEEDERS_REWARD = 5;
      
      // Update referrer's feeders balance
      await updateFeedersBalance(referrerCode, FEEDERS_REWARD);
      
      // Update invited user's feeders balance
      await updateFeedersBalance(walletAddress, FEEDERS_REWARD);
      
      // Record the rewards
      await Promise.all([
        // Record referrer reward
        setDoc(doc(db, 'rewards', `${referrerCode}_referrer_feeders`), {
          user: referrerCode,
          amount: FEEDERS_REWARD,
          type: 'referrer_feeders',
          timestamp: new Date().toISOString()
        }),
        
        // Record invited user reward
        setDoc(doc(db, 'rewards', `${walletAddress}_invited_feeders`), {
          user: walletAddress,
          amount: FEEDERS_REWARD,
          type: 'invited_feeders',
          timestamp: new Date().toISOString()
        })
      ]);
      
      // Refresh the feeders balance
      await fetchFeedersBalance();
      
      toast({
        message: `Referral bonus: You received ${FEEDERS_REWARD} feeders, and ${referrerCode} received ${FEEDERS_REWARD} feeders!`,
        type: "success"
      });
      
    } catch (error) {
      console.error("Error distributing referral rewards:", error);
    }
  };
  
  // Helper function to update feeders balance
  const updateFeedersBalance = async (userAddress: string, amount: number) => {
    try {
      const balanceDoc = doc(db, 'feeders_balances', userAddress);
      const docSnap = await getDoc(balanceDoc);
      
      if (docSnap.exists()) {
        await updateDoc(balanceDoc, {
          balance: docSnap.data().balance + amount,
          last_updated: new Date().toISOString()
        });
      } else {
        await setDoc(balanceDoc, {
          balance: amount,
          last_updated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error updating feeders balance:", error);
    }
  };

  // Update the existing handleBuy function to track purchases
  const handleBuy = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (!connected || !walletAddress) {
        throw new Error("Please connect your wallet first.");
      }

      // Validate amount
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error("Please enter a valid amount.");
      }

      // Use transaction instead of batch for atomicity
      await runTransaction(db, async (transaction) => {
        // Create purchase record
        const purchaseRef = doc(db, 'purchases', `${walletAddress}_${Date.now()}`);
        transaction.set(purchaseRef, {
          buyer: walletAddress,
          amount: parseFloat(amount),
          timestamp: new Date().toISOString(),
          status: 'pending',
          referrer: savedReferrer || null // Track referrer in purchase
        });

        // Update referral stats if there's a referrer
        if (savedReferrer) {
          const referrerDoc = doc(db, 'referrals', savedReferrer);
          const referrerSnap = await transaction.get(referrerDoc);

          if (referrerSnap.exists()) {
            const currentStats = referrerSnap.data();
            transaction.update(referrerDoc, {
              totalAmount: (currentStats.totalAmount || 0) + parseFloat(amount),
              validInvites: (currentStats.validInvites || 0) + 1,
              eligibleInvites: (currentStats.eligibleInvites || 0) + (parseFloat(amount) >= 100 ? 1 : 0),
              lastUpdated: new Date().toISOString()
            });
          }
        }
      });

      // Proceed with blockchain transaction
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: receiverAddress,
            amount: (parseFloat(amount) * 1e9).toString(),
          }
        ]
      });

      // Refresh all data after successful transaction
      await Promise.all([
        fetchBalances(),
        fetchLeaderboard(),
        fetchReferralStats()
      ]);

      // Clear form
      setAmount("");
      toast({
        message: "Purchase successful!",
        type: "success"
      });

    } catch (error: any) {
      console.error("Transaction error:", error);
      toast({
        message: error.message || "Transaction failed. Please try again.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        message: "Referral code copied to clipboard!",
        type: "success"
      });
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          message: "Referral code copied to clipboard!",
          type: "success"
        });
      } catch (err) {
        toast({
          message: "Failed to copy code. Please try manually copying.",
          type: "error"
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const handleBindReferralCode = async () => {
    if (!referralCode || !connected || !walletAddress) {
      toast({
        message: "Please connect your wallet and enter a referral code",
        type: "error"
      });
      return;
    }
  
    try {
      // First perform all reads
      const [userRefDoc, playerDoc] = await Promise.all([
        getDoc(doc(db, 'user_referrals', walletAddress)),
        getDoc(doc(db, 'players', referralCode))
      ]);
  
      // Check existing referrer
      if (userRefDoc.exists()) {
        toast({
          message: "You already have a referrer bound",
          type: "error"
        });
        return;
      }
  
      // Verify referral code
      const isValid = await verifyReferralCode(referralCode);
      if (!isValid) return;
  
      // Now perform the writes in a transaction
      await runTransaction(db, async (transaction) => {
        // Create or update player document
        const playerRef = doc(db, 'players', referralCode);
        const playerData = playerDoc.exists() ? playerDoc.data() as PlayerData : {
          walletAddress: '',
          feeders: 0,
          totalInvites: 0,
          eligibleInvites: { total: 0, referrals: [] },
          validInvites: { total: 0, referrals: [] },
          invalidInvites: { total: 0, referrals: [] }
        };
  
        // Update invalid invites
        const updatedInvalidInvites: InviteData = {
          total: (playerData.invalidInvites?.total || 0) + 1,
          referrals: [...(playerData.invalidInvites?.referrals || []), walletAddress]
        };
  
        transaction.set(playerRef, {
          ...playerData,
          invalidInvites: updatedInvalidInvites
        }, { merge: true });
  
        // Record referral relationship
        transaction.set(doc(db, 'user_referrals', walletAddress), {
          user: walletAddress,
          referrer: referralCode,
          timestamp: new Date().toISOString()
        });
      });
  
      localStorage.setItem('spiderReferrer', referralCode);
      setSavedReferrer(referralCode);
      
      toast({
        message: "Referral code bound successfully!",
        type: "success"
      });
  
      await fetchReferralStats();
    } catch (err) {
      console.error("Error binding referral code:", err);
      toast({
        message: "Failed to bind referral code. Please try again",
        type: "error"
      });
    }
  };

  const handlePurchase = async () => {
    if (!connected || !walletAddress) {
      toast({
        message: "Please connect your wallet first",
        type: "error"
      });
      return;
    }
  
    try {
      const purchaseAmount = parseFloat(amount);
      if (!purchaseAmount || purchaseAmount <= 0) {
        throw new Error("Please enter a valid amount.");
      }
  
      // First perform all reads
      const playerDoc = savedReferrer ? 
        await getDoc(doc(db, 'players', savedReferrer)) : null;
  
      // Perform the transaction
      await runTransaction(db, async (transaction) => {
        // Create purchase record
        const purchaseRef = doc(db, 'purchases', `${walletAddress}_${Date.now()}`);
        transaction.set(purchaseRef, {
          buyer: walletAddress,
          amount: purchaseAmount,
          timestamp: new Date().toISOString(),
          status: 'pending',
          referrer: savedReferrer
        });
  
        if (savedReferrer && playerDoc) {
          const playerRef = doc(db, 'players', savedReferrer);
          const playerData = playerDoc.exists() ? playerDoc.data() as PlayerData : {
            walletAddress: '',
            feeders: 0,
            totalInvites: 0,
            eligibleInvites: { total: 0, referrals: [] },
            validInvites: { total: 0, referrals: [] },
            invalidInvites: { total: 0, referrals: [] }
          };
  
          // Update stats
          const updatedData: Partial<PlayerData> = {
            totalInvites: (playerData.totalInvites || 0) + 1,
            validInvites: {
              total: (playerData.validInvites?.total || 0) + 1,
              referrals: [...(playerData.validInvites?.referrals || []), walletAddress]
            }
          };
  
          // If purchase amount >= 100, update eligible invites
          if (purchaseAmount >= 100) {
            updatedData.eligibleInvites = {
              total: (playerData.eligibleInvites?.total || 0) + 1,
              referrals: [...(playerData.eligibleInvites?.referrals || []), walletAddress]
            };
          }
  
          // Remove from invalid invites if present
          if (playerData.invalidInvites?.referrals?.includes(walletAddress)) {
            updatedData.invalidInvites = {
              total: Math.max(0, (playerData.invalidInvites.total || 1) - 1),
              referrals: playerData.invalidInvites.referrals.filter(r => r !== walletAddress)
            };
          }
  
          transaction.set(playerRef, updatedData, { merge: true });
        }
      });
  
      // Proceed with blockchain transaction
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: receiverAddress,
            amount: (purchaseAmount * 1e9).toString(),
          }
        ]
      });
  
      if (savedReferrer) {
        await distributeReferralRewards(savedReferrer, purchaseAmount);
      }
  
      // Refresh all data
      await Promise.all([
        fetchBalances(),
        fetchLeaderboard(),
        fetchReferralStats()
      ]);
  
      setAmount("");
      toast({
        message: "Purchase successful!",
        type: "success"
      });
  
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast({
        message: error.message || "Transaction failed. Please try again.",
        type: "error"
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1b3b] to-[#2a2b5b] flex items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-lg border-none text-white max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-center mb-4 text-red-400">
              <AlertCircle className="mr-2 h-6 w-6" />
            </div>
            <p className="text-red-400 text-center">{error}</p>
            <Button 
              onClick={() => setError(null)} 
              className="w-full mt-4 bg-[#28a745] hover:bg-[#28a745]/90"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1a1b3b] to-[#2a2b5b] flex items-center justify-center p-4">
      <div className="max-w-[800px] w-full text-center p-5">
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-6">
            {/* Use the SVG logo from the public folder */}
            <img 
              src="/logo.png" 
              alt="Gem Spider Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to Spider icon if image fails to load
                e.currentTarget.style.display = 'none';
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = 'text-[#00A3FF]';
                fallbackDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>';
                e.currentTarget.parentNode?.appendChild(fallbackDiv);
              }}
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Gem Spider</h1>
          <p className="text-xl text-white/90">
            Token Pre Sale - Get your $SPIDER tokens now!
          </p>
          
          {/* Debug Info - Remove in production */}
          <div className="mt-2 p-2 bg-white/5 rounded text-xs text-white/50">
            Wallet Status: {connected ? "Connected" : "Disconnected"} | 
            Address: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "None"}
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <TonConnectButton />
        </div>

        <Tabs defaultValue="buy" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="buy">Buy Tokens</TabsTrigger>
            <TabsTrigger value="referral">Referral</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="buy">
            <Card className="bg-white/10 backdrop-blur-lg border-none text-white">
              <CardHeader>
                <CardTitle className="text-2xl">Token Pre-sale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2 text-lg">
                    <div className="flex items-center justify-between">
                      <p>TON Balance:</p>
                      {isFetchingBalances ? (
                        <div className="flex items-center">
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <p className="mr-2">{tonBalance} TON</p>
                          {connected && (
                            <Button 
                              onClick={() => fetchBalances()} 
                              variant="outline" 
                              size="sm" 
                              className="h-7 w-7 rounded-full p-0 bg-white/20 hover:bg-white/30 border-white/20 flex items-center justify-center"
                              disabled={isFetchingBalances}
                            >
                              {isFetchingBalances ? 
                                <RefreshCw className="h-3 w-3 animate-spin" /> : 
                                <RefreshCw className="h-3 w-3" />
                              }
                              <span className="sr-only">Refresh Balances</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p>$SPIDER Balance:</p>
                      {isFetchingBalances ? (
                        <div className="flex items-center">
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <p>{spiderBalance} $SPIDER</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Buy $SPIDER Tokens</h3>
                    <p className="text-lg">0.02 TON = 1 $SPIDER</p>
                    <Input
                      type="number"
                      placeholder="Enter TON amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleBuy}
                      className="w-full bg-[#28a745] hover:bg-[#28a745]/90"
                      disabled={isLoading || !connected}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Buy $SPIDER'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referral">
            <Card className="bg-white/10 backdrop-blur-lg border-none text-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Users className="h-6 w-6" />
                  Your Referral Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {connected && userReferralCode ? (
                  <div className="space-y-4">
                    <p className="text-lg">Your Referral Code:</p>
                    <div className="bg-white/20 p-4 rounded-lg text-2xl font-mono flex justify-between items-center">
                      <span>{userReferralCode}</span>
                      <Button 
                        onClick={() => {
                          // Use a more reliable clipboard approach
                          try {
                            const textArea = document.createElement('textarea');
                            textArea.value = userReferralCode;
                            textArea.style.position = 'fixed';  // Avoid scrolling to bottom
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            const successful = document.execCommand('copy');
                            document.body.removeChild(textArea);
                            
                            if (successful) {
                              toast({
                                message: "Referral code copied to clipboard!",
                                type: "success"
                              });
                            } else {
                              throw new Error('Copy command was unsuccessful');
                            }
                          } catch (err) {
                            console.error('Failed to copy text: ', err);
                            toast({
                              message: "Failed to copy text. Please try again.",
                              type: "error"
                            });
                          }
                        }} 
                        variant="default" 
                        size="sm"
                        className="bg-gradient-to-r from-[#3c28a7] to-[#9f2dfd] hover:from-[#3c28a7]/80 hover:to-[#9f2dfd]/80 text-white border-none"
                      >
                        Copy
                      </Button>
                    </div>
                    
                    <div className="mt-6 mb-8 space-y-4">
                      <h3 className="text-xl font-semibold">Bind a Referral Code</h3>
                      <div className="space-y-3">
                        <p className="text-sm opacity-80">Enter someone's referral code to give them credit for your purchases.</p>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Enter Referral Code"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            disabled={!!savedReferrer}
                          />
                          <Button 
                            onClick={handleBindReferralCode}
                            variant="default"
                            className="whitespace-nowrap bg-gradient-to-r from-[#3c28a7] to-[#9f2dfd] hover:from-[#3c28a7]/80 hover:to-[#9f2dfd]/80 text-white border-none"
                            disabled={!!savedReferrer || isLoading}
                          >
                            {isLoading ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Binding...
                              </>
                            ) : (
                              'Bind Code'
                            )}
                          </Button>
                        </div>
                        {savedReferrer && (
                          <div className="p-3 bg-green-500/20 rounded-lg text-sm">
                            <div className="flex justify-between items-center">
                              <p>You are using referral code: <span className="font-mono font-semibold">{savedReferrer}</span></p>
                            </div>
                          </div>
                        )}
                      </div>
                    
                    {/* Display Referral Stats with Feeders Balance */}
                    <div className="mt-6 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold">Your Referral Stats</h3>
                        <div className="bg-gradient-to-r from-[#ffb347] to-[#ffcc33] px-4 py-2 rounded-lg flex items-center">
                          <span className="font-bold text-black">{feedersBalance}</span>
                          <span className="ml-2 text-black font-medium">Feeders</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/10 p-3 rounded-lg text-center">
                          <p className="font-medium text-yellow-400">Invalid Invites</p>
                          <p className="text-2xl font-bold">{referralStats.invalidInvites}</p>
                          <p className="text-xs opacity-80">Bound but no purchase</p>
                        </div>
                        <div className="bg-white/10 p-3 rounded-lg text-center">
                          <p className="font-medium text-blue-400">Valid Invites</p>
                          <p className="text-2xl font-bold">{referralStats.validInvites}</p>
                          <p className="text-xs opacity-80">Any purchase amount</p>
                        </div>
                        <div className="bg-white/10 p-3 rounded-lg text-center">
                          <p className="font-medium text-green-400">Eligible Invites</p>
                          <p className="text-2xl font-bold">{referralStats.eligibleInvites}</p>
                          <p className="text-xs opacity-80">100+ $SPIDER purchased</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          fetchReferralStats();
                          fetchFeedersBalance();
                        }}
                        variant="default"
                        size="sm"
                        className="w-full bg-gradient-to-r from-[#3c28a7] to-[#9f2dfd] hover:from-[#3c28a7]/80 hover:to-[#9f2dfd]/80 text-white border-none"
                      >
                        Refresh Referral Stats
                      </Button>
                    </div>
                    
                      <div className="mt-6 space-y-4">
                        <h3 className="text-xl font-semibold">How it works</h3>
                        <div className="space-y-3">
                          <div className="bg-white/10 p-3 rounded-lg">
                            <p className="font-medium">1. Share your referral code</p>
                            <p className="text-sm opacity-80">Share your unique code with friends</p>
                          </div>
                          <div className="bg-white/10 p-3 rounded-lg">
                            <p className="font-medium">2. Friends buy $SPIDER</p>
                            <p className="text-sm opacity-80">They enter your code during purchase</p>
                          </div>
                          <div className="bg-white/10 p-3 rounded-lg">
                            <p className="font-medium">3. Both earn Feeders rewards</p>
                            <p className="text-sm opacity-80">
                              Both you and your friend get 5 Feeders<br />
                              when they purchase any amount of $SPIDER
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="mb-4">Connect your wallet to get your referral code</p>
                    <TonConnectButton />
                    {connected && !userReferralCode && (
                      <div className="mt-4 p-2 bg-red-500/20 rounded text-sm">
                        <p>Wallet connected but referral code not generated.</p>
                        <Button
                          onClick={() => {
                            if (walletAddress) {
                              setUserReferralCode(walletAddress.slice(0, 8));
                            }
                          }}
                          variant="default"
                          size="sm"
                          className="mt-2 bg-gradient-to-r from-[#3c28a7] to-[#9f2dfd] hover:from-[#3c28a7]/80 hover:to-[#9f2dfd]/80 text-white border-none"
                        >
                          Generate Manually
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card className="bg-white/10 backdrop-blur-lg border-none text-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Trophy className="h-6 w-6" />
                  Referral Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isFetchingLeaderboard ? (
                  <div className="flex justify-center items-center py-8">
                    <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
                    <span>Loading leaderboard...</span>
                  </div>
                ) : leaderboard.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white">Rank</TableHead>
                        <TableHead className="text-white">Referrer</TableHead>
                        <TableHead className="text-white text-right">Total TON</TableHead>
                        <TableHead className="text-white text-right">Invites</TableHead>
                        <TableHead className="text-white text-right">Eligible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry, index) => (
                        <TableRow key={entry.referrer}>
                          <TableCell className="text-white">{index + 1}</TableCell>
                          <TableCell className="text-white font-mono">
                            {entry.referrer}
                          </TableCell>
                          <TableCell className="text-white text-right">
                            {entry.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-white text-right">
                            {entry.validInvites || 0}
                          </TableCell>
                          <TableCell className="text-white text-right">
                            {entry.eligibleInvites || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p>No referrals recorded yet. Be the first!</p>
                  </div>
                )}
                
                <div className="mt-4">
                  <Button 
                    onClick={() => {
                      // Clear any previous errors
                      setError(null);
                      
                      // Reset leaderboard state before fetching to avoid showing stale data
                      if (isFetchingLeaderboard) return;
                      
                      setIsFetchingLeaderboard(true);
                      fetchLeaderboard().catch(() => {
                        // Silently handle any errors here
                        setIsFetchingLeaderboard(false);
                      });
                    }}
                    variant="default"
                    size="sm" 
                    className="w-full bg-gradient-to-r from-[#3c28a7] to-[#9f2dfd] hover:from-[#3c28a7]/80 hover:to-[#9f2dfd]/80 text-white border-none"
                    disabled={isFetchingLeaderboard}
                  >
                    {isFetchingLeaderboard ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh Leaderboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
