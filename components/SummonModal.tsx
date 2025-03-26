import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Gender, GeneticType } from '@/types/spider';
import { SparklesIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { POWER_RANGES, generateUniqueSpiderId, RARITY_COLORS, RARITY_TEXT_COLORS } from '@/constants/game';
import { doc, getDoc, updateDoc, collection, addDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGameStore } from '@/store/useGameStore';

interface SummonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SummonModal({ isOpen, onClose }: SummonModalProps) {
  const { player, updateBalance, addSpider, addDress } = useGameStore();
  const { spiderTokenBalance, isBalanceLoading, user, refreshBalance } = useAuthContext();
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDegrees, setSpinDegrees] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState<'single' | 'multi'>('single');
  const [result, setResult] = useState<string | null>(null);
  const [summonType, setSummonType] = useState<'spider'>('spider');
  const [summonResults, setSummonResults] = useState<Array<{
    rarity: string;
    name: string;
    id: string;
    src?: string;
    type?: string;
    theme?: string;
  }>>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showRarityInfo, setShowRarityInfo] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingCost, setPendingCost] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const [pendingTransaction, setPendingTransaction] = useState(false);
  const [transactionLock, setTransactionLock] = useState(false);

  // Spider summon costs
  const spiderSingleSummonCost = 200;
  const spiderMultiSummonCost = 1800; // 10% discount for bulk summon

  // Spider rarities with their probabilities and colors - UPDATED VALUES
  const spiderWheelSegments = [
    { id: 'common', rarity: 'Common', color: RARITY_COLORS.Common, probability: 0.90 },
    { id: 'excellent', rarity: 'Excellent', color: RARITY_COLORS.Excellent, probability: 0.05 },
    { id: 'rare', rarity: 'Rare', color: RARITY_COLORS.Rare, probability: 0.0325 },
    { id: 'epic', rarity: 'Epic', color: RARITY_COLORS.Epic, probability: 0.01475 },
    { id: 'legendary', rarity: 'Legendary', color: RARITY_COLORS.Legendary, probability: 0.000225 },
    { id: 'mythical', rarity: 'Mythical', color: RARITY_COLORS.Mythical, probability: 0.000025 },
    { id: 'special', rarity: 'SPECIAL', color: RARITY_COLORS.SPECIAL, probability: 0.0000025 }
  ];

  // Multi-summon probabilities for spiders - UPDATED VALUES (4x lower for Excellent and up)
  const spiderMultiProbabilities = {
    'Common': 0.90,
    'Excellent': 0.045,
    'Rare': 0.04,
    'Epic': 0.03725,
    'Legendary': 0.0027,
    'Mythical': 0.00005,
    'SPECIAL': 0.000005 // 10x rarer than Mythical
  };

  // Calculate segment angles
  const getWheelSegments = () => spiderWheelSegments;
  const segmentAngle = 360 / getWheelSegments().length;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsSpinning(false);
      setSpinDegrees(0);
      setResult(null);
      setSummonResults([]);
      setShowConfetti(false);
    }
  }, [isOpen]);

  // Create confetti effect
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Function to get current SPIDER token balance
  const getSpiderBalance = (): number => {
    // We now use Firestore balance as the source of truth
    return player.balance.SPIDER;
  };

  // Add function to handle SPIDER balance deduction
  const deductSpiderBalance = async (amount: number) => {
    if (!user?.uid) throw new Error("User not authenticated");
    
    const referralCode = user.uid.slice(0, 8);
    const playerDoc = doc(db, 'players', referralCode);
    const playerSnap = await getDoc(playerDoc);
    
    if (!playerSnap.exists()) {
      throw new Error("Player document not found");
    }

    const currentBalance = playerSnap.data().spiderBalance || 0;
    if (currentBalance < amount) {
      throw new Error(`Insufficient SPIDER balance. Required: ${amount}, Available: ${currentBalance}`);
    }

    await updateDoc(playerDoc, {
      spiderBalance: currentBalance - amount,
      lastUpdated: new Date().toISOString()
    });

    // Update local balance state
    updateBalance('SPIDER', currentBalance - amount);
  };

  const handleSpin = async () => {
    if (isSpinning) return;
    
    const cost = selectedAmount === 'single' 
      ? spiderSingleSummonCost 
      : spiderMultiSummonCost;
    
    try {
      // Deduct SPIDER balance first
      await deductSpiderBalance(cost);
      
      setIsSpinning(true);
      setResult(null);
      setSummonResults([]);
      
      // Determine the result based on probabilities
      const wheelSegments = getWheelSegments();
      const randomValue = Math.random();
      let cumulativeProbability = 0;
      let selectedSegment = wheelSegments[0];
      
      for (const segment of wheelSegments) {
        cumulativeProbability += segment.probability;
        if (randomValue <= cumulativeProbability) {
          selectedSegment = segment;
          break;
        }
      }
      
      // Calculate the degrees to spin
      // We want to spin at least 5 full rotations (1800 degrees) plus the position of the selected segment
      const segmentIndex = wheelSegments.findIndex(s => s.id === selectedSegment.id);
      const segmentPosition = segmentIndex * segmentAngle;
      const spinTo = 1800 + (360 - segmentPosition);
      
      setSpinDegrees(spinTo);
      
      // Set the result after the animation completes
      setTimeout(async () => {
        setResult(selectedSegment.rarity);
        
        // Create new item(s) based on the result
        if (selectedAmount === 'single') {
          try {
            const newSpider = await createNewSpider(selectedSegment.rarity);
            setSummonResults([{
              rarity: selectedSegment.rarity,
              name: newSpider.name,
              id: newSpider.id
            }]);
          } catch (error) {
            console.error('Error creating spider:', error);
            // Still allow the UI to update even if there was an error
            setSummonResults([{
              rarity: selectedSegment.rarity,
              name: `${selectedSegment.rarity} Spider (Error)`,
              id: `error-${Date.now()}`
            }]);
          }
        } else {
          // For multi-summon, create 10 items with weighted probabilities
          const results = [];
          for (let i = 0; i < 10; i++) {
            try {
              const randomRarity = getRandomRarityWithProbabilities(spiderMultiProbabilities);
              const newSpider = await createNewSpider(randomRarity);
              results.push({
                rarity: randomRarity,
                name: newSpider.name,
                id: newSpider.id
              });
            } catch (error) {
              console.error('Error creating spider in multi-summon:', error);
              // Still add an entry to maintain the count
              results.push({
                rarity: 'Common',
                name: 'Error Spider',
                id: `error-${Date.now()}-${i}`
              });
            }
          }
          setSummonResults(results);
        }
        
        // Show confetti for rare results
        if (
          selectedSegment.rarity === 'Legendary' || 
          selectedSegment.rarity === 'Mythical' ||
          selectedSegment.rarity === 'SPECIAL' ||
          (selectedAmount === 'multi' && summonResults.some(r => 
            r.rarity === 'Legendary' || r.rarity === 'Mythical' || r.rarity === 'SPECIAL'
          ))
        ) {
          setShowConfetti(true);
        }
        
        setIsSpinning(false);
      }, 3000); // Match this with the CSS animation duration
    } catch (error: any) {
      console.error("Summon error:", error);
      alert(error.message || "Failed to summon. Please try again.");
      return;
    }
  };
  
  const getRandomRarityWithProbabilities = (probabilities: Record<string, number>): string => {
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    
    for (const [rarity, probability] of Object.entries(probabilities)) {
      cumulativeProbability += probability;
      if (randomValue <= cumulativeProbability) {
        return rarity;
      }
    }
    
    return 'Common'; // Fallback
  };
  
  // Generate a random basic genetic type (only S, A, or J for summoning)
  const generateRandomBasicGenetics = (): GeneticType => {
    const basicTypes: GeneticType[] = ['S', 'A', 'J'];
    return basicTypes[Math.floor(Math.random() * basicTypes.length)];
  };
  
  const createNewSpider = async (rarity: string) => {
    if (!user?.uid) throw new Error("User not authenticated");
    
    const genetics = generateRandomBasicGenetics();
    const gender = Math.random() < 0.5 ? 'Male' as Gender : 'Female' as Gender;
    
    // Keep all power and stats calculations
    const powerRange = POWER_RANGES[rarity as keyof typeof POWER_RANGES];
    const basePower = Math.floor(Math.random() * (powerRange.max - powerRange.min + 1)) + powerRange.min;
    
    let geneticBonus = 0;
    switch (genetics) {
      case 'S': geneticBonus = 10; break;
      case 'A': geneticBonus = 12; break;
      case 'J': geneticBonus = 15; break;
    }

    const newSpider = {
      uniqueId: generateUniqueSpiderId(),
      ownerId: user.uid,
      name: `${rarity} Spider (${genetics})`,
      rarity: rarity,
      genetics: genetics,
      gender: gender,
      level: 1,
      experience: 0,
      power: basePower + geneticBonus,
      stats: {
        attack: 10 + Math.floor(Math.random() * 5),
        defense: 10 + Math.floor(Math.random() * 5),
        agility: 10 + Math.floor(Math.random() * 5),
        luck: 10 + Math.floor(Math.random() * 5),
      },
      condition: {
        health: 100,
        hunger: 100,
        hydration: 100,
      },
      generation: 1,
      lastFed: new Date().toISOString(),
      lastHydrated: new Date().toISOString(),
      lastTokenGeneration: new Date().toISOString(),
      isHibernating: false,
      isAlive: true,
      createdAt: new Date().toISOString()
    };

    try {
      // Save spider to Firestore
      const spiderRef = collection(db, 'spiders');
      const docRef = await addDoc(spiderRef, newSpider);
      
      // Add spider ID to the object for local state
      const savedSpider = {
        ...newSpider,
        id: docRef.id
      };

      // Update local game state
      addSpider(savedSpider);
      
      return savedSpider;

    } catch (error) {
      console.error('Error saving spider:', error);
      throw new Error('Failed to save spider to database');
    }
  };

  const getRarityColor = (rarity: string): string => {
    return RARITY_TEXT_COLORS[rarity as keyof typeof RARITY_TEXT_COLORS] || RARITY_TEXT_COLORS.Common;
  };

  const getRarityBgColor = (rarity: string): string => {
    const color = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || RARITY_COLORS.Common;
    return `bg-[${color}]/10`;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl relative max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors z-10"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          
          {/* Modal Header */}
          <Dialog.Title className="text-2xl font-bold mb-6 text-center">
            <SparklesIcon className="w-6 h-6 inline-block mr-2 text-yellow-500" />
            Summoning Portal
          </Dialog.Title>

          {/* Modal Content */}
          <div className="space-y-4">
            {/* Balance Display */}
            <div className="text-sm text-gray-600">
              Balance: {isBalanceLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                getSpiderBalance()
              )} $SPIDER
            </div>

            {/* Amount Selection */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedAmount('single')}
                className={`flex-1 px-2 py-1 rounded-lg transition-all duration-200 border-2 text-xs font-medium ${
                  selectedAmount === 'single' 
                    ? 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                    : 'bg-white text-gray-800 border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                1x ({spiderSingleSummonCost} $SPIDER)
              </button>
              <button
                onClick={() => setSelectedAmount('multi')}
                className={`flex-1 px-2 py-1 rounded-lg transition-all duration-200 border-2 text-xs font-medium ${
                  selectedAmount === 'multi'
                    ? 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                    : 'bg-white text-gray-800 border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                10x ({spiderMultiSummonCost} $SPIDER)
              </button>
            </div>

            {/* Spin Button */}
            <div className="flex justify-center mt-4">
              <button
                onClick={handleSpin}
                className={`px-4 py-2 rounded-lg text-white font-semibold transition-all duration-200 ${
                  isSpinning 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                disabled={isSpinning}
              >
                {isSpinning ? 'Spinning...' : 'Summon'}
              </button>
            </div>

            {/* Wheel */}
            <div className="relative mt-6">
              <div 
                ref={wheelRef} 
                className="w-64 h-64 rounded-full border-4 border-gray-300 mx-auto relative transition-transform duration-[3s] ease-out"
                style={{ transform: `rotate(${spinDegrees}deg)` }}
              >
                {getWheelSegments().map((segment, index) => (
                  <div 
                    key={segment.id} 
                    className={`absolute w-1/2 h-1/2 bg-[${segment.color}]`}
                    style={{
                      transformOrigin: '100% 100%',
                      transform: `rotate(${index * segmentAngle}deg)`,
                      clipPath: 'polygon(0 0, 100% 0, 100% 100%)'
                    }}
                  />
                ))}
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <ArrowPathIcon className="w-8 h-8 text-gray-600" />
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className="mt-6 text-center">
                <h3 className={`text-xl font-bold ${getRarityColor(result)}`}>
                  {result} Spider Summoned!
                </h3>
                <div className="mt-4 space-y-2">
                  {summonResults.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-2 rounded-lg border ${getRarityBgColor(item.rarity)}`}
                    >
                      <div className="flex items-center gap-2">
                        {item.src && (
                          <img 
                            src={item.src} 
                            alt={item.name} 
                            className="w-10 h-10 object-cover rounded-full border"
                          />
                        )}
                        <div>
                          <div className={`font-semibold ${getRarityColor(item.rarity)}`}>
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {item.id}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confetti */}
            {showConfetti && (
              <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
                <div className="confetti"></div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}