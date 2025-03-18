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
import { createClient } from '@supabase/supabase-js';

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

// Safely set up Supabase client with error handling
let supabase: any;
try {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      realtime: {
        params: {
          eventsPerSecond: 1 // Limit to avoid rate limiting issues
        }
      }
    }
  );
} catch (error) {
  console.error("Error initializing Supabase client:", error);
  // Create a stub for Supabase that returns empty data with no errors
  supabase = {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            single: async () => ({ data: null, error: null }),
            then: (callback: any) => Promise.resolve(callback({ data: [], error: null }))
          })
        })
      }),
      upsert: async () => ({ error: null }),
      insert: async () => ({ error: null })
    })
  };
}

interface Referral {
  referrer: string;
  totalAmount: number;
  referralCount: number;
  invalidInvites?: number;
  validInvites?: number;
  eligibleInvites?: number;
  referralUsers?: string[]; // New field for tracking referred users
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
        // Check if wallet is connected
        const isConnected = tonConnectUI.connected;
        setConnected(isConnected);
        
        if (isConnected && tonConnectUI.wallet) {
          const walletInfo = tonConnectUI.wallet;
          setWalletAddress(walletInfo.account.address);
          // Generate referral code from wallet address
          setUserReferralCode(walletInfo.account.address.slice(0, 8));
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
      // Add a timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Leaderboard fetch timeout')), 15000)
      );
      
      const fetchPromise = supabase
        .from('referrals')
        .select('*')
        .order('validInvites', { ascending: false })
        .order('eligibleInvites', { ascending: false })
        .limit(10);
      
      // Race between the fetch and the timeout
      const { data, error: supabaseError } = await Promise.race([
        fetchPromise,
        timeoutPromise.then(() => ({ data: null, error: new Error('Timeout') }))
      ]) as any;

      if (supabaseError) {
        console.error("Supabase error when fetching leaderboard:", supabaseError);
        // Check if the table exists - this is a common issue
        const { data: tableExists } = await supabase
          .from('referrals')
          .select('referrer')
          .limit(1)
          .maybeSingle();
        
        if (tableExists === null && !supabaseError.message?.includes('does not exist')) {
          toast({
            message: "No referrals found. Be the first to refer someone!",
            type: "info"
          });
          setLeaderboard([]);
        } else {
          throw supabaseError;
        }
      } else {
        console.log("Leaderboard data:", data);
        // Process data to include only valid and eligible invites for ranking
        const processedData = data?.map((entry: any) => ({
          ...entry,
          // Calculate total points for display (sum of valid and eligible invites)
          referralCount: (entry.validInvites || 0) + (entry.eligibleInvites || 0)
        })) || [];
        
        setLeaderboard(processedData);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      // Just set empty leaderboard without showing error toast
      setLeaderboard([]);
    } finally {
      setIsFetchingLeaderboard(false);
    }
  };

  // Function to check if user has a referrer
  const checkUserReferrer = async () => {
    if (!walletAddress) return null;
    
    try {
      const { data, error: supabaseError } = await supabase
        .from('user_referrals')
        .select('referrer')
        .eq('user', walletAddress)
        .single();
        
      if (supabaseError && supabaseError.code !== 'PGRST116') throw supabaseError;
      return data?.referrer || null;
    } catch (error) {
      console.error("Error checking user referrer:", error);
      return null;
    }
  };

  // Function to verify if a referral code is valid
  const verifyReferralCode = async (code: string) => {
    if (!code || code.length < 8) {
      return false;
    }
  
    // Prevent self-referral
    if (code === userReferralCode) {
      toast({
        message: "You cannot use your own referral code",
        type: "error"
      });
      return false;
    }
  
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('referrer')
        .eq('referrer', code)
        .maybeSingle();
      
      if (error) throw error;
      
      // Only return true if the code exists in the referrals table
      return !!data;
    } catch (error) {
      console.error("Error verifying referral code:", error);
      return false;
    }
  };

  // Function to check user's referral stats
  const fetchReferralStats = async () => {
    if (!connected || !userReferralCode) return;
    
    try {
      // Get all users who used this user's referral code
      const { data, error } = await supabase
        .from('user_referrals')
        .select('user, timestamp')
        .eq('referrer', userReferralCode);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setReferralStats({
          invalidInvites: 0,
          validInvites: 0,
          eligibleInvites: 0
        });
        return;
      }
      
      // For each referred user, check their purchase amount to categorize them
      let invalidCount = 0;
      let validCount = 0;
      let eligibleCount = 0;
      
      // For simplicity, we'll just check if they have any purchase record
      for (const referral of data) {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('purchases')
          .select('amount')
          .eq('user', referral.user)
          .order('timestamp', { ascending: false })
          .limit(1);
          
        if (purchaseError) continue;
        
        if (!purchaseData || purchaseData.length === 0) {
          invalidCount++;
        } else {
          const totalPurchase = purchaseData[0].amount;
          if (totalPurchase >= 100) {
            eligibleCount++;
          } else if (totalPurchase > 0) {
            validCount++;
          } else {
            invalidCount++;
          }
        }
      }
      
      setReferralStats({
        invalidInvites: invalidCount,
        validInvites: validCount,
        eligibleInvites: eligibleCount
      });
      
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    }
  };

  // Function to fetch user's feeders balance
  const fetchFeedersBalance = async () => {
    if (!walletAddress) return;
    
    try {
      const { data, error } = await supabase
        .from('feeders_balances')
        .select('balance')
        .eq('user', walletAddress)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching feeders balance:", error);
        return;
      }
      
      setFeedersBalance(data?.balance || 0);
    } catch (error) {
      console.error("Error fetching feeders balance:", error);
    }
  };

  // Function to distribute rewards for referrals
  const distributeReferralRewards = async (referrerCode: string, amount: number) => {
    if (!walletAddress || !referrerCode) return;
    
    try {
      // First, verify the referrer exists
      const { data: referrerData, error: referrerError } = await supabase
        .from('referrals')
        .select('referrer')
        .eq('referrer', referrerCode)
        .maybeSingle();
      
      if (referrerError || !referrerData) {
        console.error("Could not find referrer:", referrerError);
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
        supabase.from('rewards').insert([{
          user: referrerCode,
          amount: FEEDERS_REWARD,
          type: 'referrer_feeders',
          timestamp: new Date().toISOString()
        }]),
        
        // Record invited user reward
        supabase.from('rewards').insert([{
          user: walletAddress,
          amount: FEEDERS_REWARD,
          type: 'invited_feeders',
          timestamp: new Date().toISOString()
        }])
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
      // First check if the user has an existing balance
      const { data, error } = await supabase
        .from('feeders_balances')
        .select('balance')
        .eq('user', userAddress)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error checking feeders balance:", error);
        return;
      }
      
      // If user has an existing balance, update it
      if (data) {
        await supabase
          .from('feeders_balances')
          .update({ 
            balance: data.balance + amount,
            last_updated: new Date().toISOString()
          })
          .eq('user', userAddress);
      } else {
        // Otherwise, create a new record
        await supabase
          .from('feeders_balances')
          .insert([{
            user: userAddress,
            balance: amount,
            last_updated: new Date().toISOString()
          }]);
      }
    } catch (error) {
      console.error("Error updating feeders balance:", error);
    }
  };

  const handleBuy = async () => {
    setError(null);
    setIsLoading(true);

    if (!connected || !walletAddress) {
      setError("Please connect your wallet first.");
      toast({
        message: "Please connect your wallet first.",
        type: "error"
      });
      setIsLoading(false);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.");
      toast({
        message: "Please enter a valid amount.",
        type: "error"
      });
      setIsLoading(false);
      return;
    }

    try {
      // Check if user already has a referrer registered
      const existingReferrer = await checkUserReferrer();
      
      // Use existing referrer, or the input referral code, or the saved referrer
      const referrerToUse = existingReferrer || referralCode || savedReferrer;
      
      // If new referral code is provided and different from saved, store it
      if (referralCode && referralCode !== savedReferrer && !existingReferrer) {
        try {
          localStorage.setItem('spiderReferrer', referralCode);
          setSavedReferrer(referralCode);
        } catch (err) {
          console.error("Error saving to local storage:", err);
        }
      }
      
      // Record the purchase with referral
      if (referrerToUse) {
        // Update referrer stats
        const purchaseAmount = parseFloat(amount);
        const isEligible = purchaseAmount >= 2; // 100 SPIDER = 2 TON
        
        const { data: referralData, error: statsCheckError } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer', referrerToUse)
          .maybeSingle();
          
        if (statsCheckError && statsCheckError.code !== 'PGRST116') throw statsCheckError;
        
        // Update referrer stats with proper invite categorization
        const { error: statsError } = await supabase.from('referrals').upsert([{
          referrer: referrerToUse,
          totalAmount: referralData ? referralData.totalAmount + purchaseAmount : purchaseAmount,
          referralCount: referralData ? referralData.referralCount + 1 : 1,
          validInvites: referralData ? (referralData.validInvites || 0) + 1 : 1,
          eligibleInvites: referralData ? 
            (referralData.eligibleInvites || 0) + (isEligible ? 1 : 0) : 
            (isEligible ? 1 : 0),
        }], {
          onConflict: 'referrer',
          ignoreDuplicates: false
        });

        if (statsError) throw statsError;
        
        // Record the purchase
        const { error: purchaseError } = await supabase.from('purchases').insert([{
          user: walletAddress,
          amount: purchaseAmount,
          timestamp: new Date().toISOString()
        }]);
        
        if (purchaseError) {
          console.error("Error recording purchase:", purchaseError);
        }
        
        // If this is a new referral relationship, record it
        if (referralCode && !existingReferrer) {
          const { error: referralError } = await supabase.from('user_referrals').insert([
            {
              user: walletAddress,
              referrer: referralCode,
              timestamp: new Date().toISOString()
            }
          ]);
          
          if (referralError) {
            console.error("Error recording referral relationship:", referralError);
            toast({
              message: "Referral recorded, but there was an issue storing the relationship.",
              type: "info"
            });
          } else {
            toast({
              message: "Referral successfully recorded!",
              type: "success"
            });
            
            // Distribute rewards for the successful referral
            await distributeReferralRewards(referralCode, purchaseAmount);
          }
        }
      }
      
      // Handle TON transaction
      try {
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [
            {
              address: receiverAddress,
              amount: (parseFloat(amount) * 1e9).toString(),
            }
          ]
        });
        
        // Transaction was sent, refresh data
        toast({
          message: "Transaction sent successfully!",
          type: "success"
        });
        
        // Refresh all data
        await Promise.all([
          fetchBalances(), 
          fetchLeaderboard(),
          fetchReferralStats() // Refresh referral stats after purchase
        ]);
        
        // Clear input fields after successful transaction
        setAmount("");
        setReferralCode("");
      } catch (txError) {
        console.error("Transaction error:", txError);
        toast({
          message: "Transaction failed. Please try again.",
          type: "error"
        });
        throw new Error("Transaction failed. Please try again.");
      }
      
    } catch (error) {
      console.error("Error processing purchase:", error);
      setError("Transaction failed. Please try again.");
      toast({
        message: "Transaction failed. Please try again.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Use toast notification instead of alert
        toast({
          message: "Referral code copied to clipboard!",
          type: "success"
        });
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast({
          message: "Failed to copy text. Please try again.",
          type: "error"
        });
      });
  };

  const handleBindReferralCode = async () => {
    if (!referralCode) {
      toast({
        message: "Please enter a referral code",
        type: "error"
      });
      return;
    }
  
    if (!connected || !walletAddress) {
      toast({
        message: "Please connect your wallet first",
        type: "error"
      });
      return;
    }
  
    // Check if user already has a referrer
    const existingReferrer = await checkUserReferrer();
    if (existingReferrer) {
      toast({
        message: "You already have a referrer bound",
        type: "error"
      });
      return;
    }
  
    // Verify the referral code
    const isValid = await verifyReferralCode(referralCode);
    if (!isValid) {
      toast({
        message: "Invalid referral code. Please check and try again",
        type: "error"
      });
      return;
    }
  
    try {
      // Record the referral relationship in the database
      const { error } = await supabase.from('user_referrals').insert([{
        user: walletAddress,
        referrer: referralCode,
        timestamp: new Date().toISOString()
      }]);
  
      if (error) throw error;
  
      // Save to localStorage only after successful database insert
      localStorage.setItem('spiderReferrer', referralCode);
      setSavedReferrer(referralCode);
      
      toast({
        message: "Referral code bound successfully!",
        type: "success"
      });
  
      // Refresh referral stats
      await fetchReferralStats();
    } catch (err) {
      console.error("Error binding referral code:", err);
      toast({
        message: "Failed to bind referral code. Please try again",
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
                  <>
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
                  </>
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
