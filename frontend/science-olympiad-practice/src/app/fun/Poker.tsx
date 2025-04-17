'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
// Remove unused Firebase imports
// import { onAuthStateChanged, User } from 'firebase/auth'; 
// import { auth } from '@/lib/firebase';
// import { updateGamePoints } from '@/app/utils/gamepoints'; // We might add points later

// --- Card Definitions ---

type Suit = 'Physics' | 'Chemistry' | 'Biology' | 'Astronomy';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  themeName: string;
  suitIcon: string;
  // Poker value might be implicit based on rank for comparisons
}

// Poker Hand Rankings (Simplified for now)
type HandRank = 'High Card' | 'Pair' | 'Two Pair' | 'Three of a Kind' | 'Straight' | 'Flush' | 'Full House' | 'Four of a Kind' | 'Straight Flush' | 'Royal Flush';

interface HandValue {
  rank: HandRank;
  // Add kickers or rank values for comparison later
  description: string;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  chips: number;
  currentBet: number;
  isAllIn: boolean;
  isFolded: boolean;
  isBot: boolean;
  actedInRound: boolean; // New flag
  evaluatedHand?: HandValue & { value: number, kickers: number[] }; // Optional for display
}

type GameStage = 'Pre-flop' | 'Flop' | 'Turn' | 'River' | 'Showdown' | 'EndRound' | 'GameOver';

interface PokerGameProps {
  onGameEnd?: () => void; // Optional callback
}

// --- Game Constants ---

const SUITS: Suit[] = ['Physics', 'Chemistry', 'Biology', 'Astronomy'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_ICONS: Record<Suit, string> = {
  Physics: '⚛️', Chemistry: '🧪', Biology: '🧬', Astronomy: '🔭',
};
// Reusing themes, maybe adjust later if needed
const RANK_THEMES: Record<Rank, { themeName: string }> = {
  '2': { themeName: 'Helium (He)' }, '3': { themeName: 'Lithium (Li)' },
  '4': { themeName: 'Beryllium (Be)' }, '5': { themeName: 'Boron (B)' },
  '6': { themeName: 'Carbon (C)' }, '7': { themeName: 'Nitrogen (N)' },
  '8': { themeName: 'Oxygen (O)' }, '9': { themeName: 'Fluorine (F)' },
  '10': { themeName: 'Neon (Ne)' }, 'J': { themeName: 'Newton' },
  'Q': { themeName: 'Curie' }, 'K': { themeName: 'Darwin' },
  'A': { themeName: 'Microscope' },
};

const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

// --- Utility Functions ---

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  let idCounter = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const themeInfo = RANK_THEMES[rank];
      deck.push({
        id: `card-${idCounter++}`,
        suit, rank,
        themeName: themeInfo.themeName, suitIcon: SUIT_ICONS[suit],
      });
    }
  }
  return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// --- Poker Hand Evaluation Logic ---

// Map ranks to numerical values for comparison (A can be high or low for straights)
const RANK_VALUES: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Helper to get all combinations of 5 cards from 7
function getCombinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];

    const first = arr[0];
    const rest = arr.slice(1);

    const combsWithFirst = getCombinations(rest, k - 1).map(comb => [first, ...comb]);
    const combsWithoutFirst = getCombinations(rest, k);

    return [...combsWithFirst, ...combsWithoutFirst];
}

// Evaluate a single 5-card hand
const evaluateFiveCardHand = (hand: Card[]): { rank: HandRank, value: number, description: string, kickers: number[] } => {
    if (hand.length !== 5) throw new Error('Hand must have 5 cards');

    const sortedHand = [...hand].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    const ranks = sortedHand.map(c => RANK_VALUES[c.rank]);
    const suits = sortedHand.map(c => c.suit);
    const uniqueRanks = [...new Set(ranks)];
    const uniqueSuits = [...new Set(suits)];

    const isFlush = uniqueSuits.length === 1;
    // Check for straight (Ace low: A, 2, 3, 4, 5)
    const isAceLowStraight = uniqueRanks.length === 5 && ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2;
    // Regular straight check
    const isStraight = uniqueRanks.length === 5 && (ranks[0] - ranks[4] === 4);
    const finalIsStraight = isStraight || isAceLowStraight;
    const straightHighCard = isAceLowStraight ? 5 : ranks[0]; // Use 5 for A-5 straight

    const rankCounts: { [key: number]: number } = {};
    ranks.forEach(rank => { rankCounts[rank] = (rankCounts[rank] || 0) + 1; });
    const counts = Object.values(rankCounts).sort((a, b) => b - a); // [4, 1], [3, 2], [3, 1, 1], [2, 2, 1], [2, 1, 1, 1], [1, 1, 1, 1, 1]
    const countRanks = Object.entries(rankCounts).sort(([, countA], [, countB]) => countB - countA).map(([rank]) => parseInt(rank)); // Ranks sorted by count desc

    // Hand Ranking Logic
    if (finalIsStraight && isFlush) {
        const rankName = straightHighCard === 14 ? 'Royal Flush' : 'Straight Flush';
        return { rank: rankName, value: 900 + straightHighCard, description: `${rankName} (${RANKS[straightHighCard-2]})`, kickers: [] };
    }
    if (counts[0] === 4) {
        const fourRank = countRanks[0];
        const kicker = ranks.find(r => r !== fourRank)!;
        return { rank: 'Four of a Kind', value: 800 + fourRank, description: `Four of a Kind (${RANKS[fourRank-2]}s)`, kickers: [kicker] };
    }
    if (counts[0] === 3 && counts[1] === 2) {
        const threeRank = countRanks[0];
        const pairRank = countRanks[1];
        return { rank: 'Full House', value: 700 + threeRank + pairRank/100, description: `Full House (${RANKS[threeRank-2]}s over ${RANKS[pairRank-2]}s)`, kickers: [] };
    }
    if (isFlush) {
         const kickers = [...ranks]; // All 5 cards are kickers, highest first
        return { rank: 'Flush', value: 600 + ranks[0], description: `Flush (${SUITS.find(s => s === suits[0])})`, kickers };
    }
    if (finalIsStraight) {
        return { rank: 'Straight', value: 500 + straightHighCard, description: `Straight (to ${RANKS[straightHighCard-2]})`, kickers: [] };
    }
    if (counts[0] === 3) {
        const threeRank = countRanks[0];
        const kickers = ranks.filter(r => r !== threeRank).sort((a, b) => b - a);
        return { rank: 'Three of a Kind', value: 400 + threeRank, description: `Three of a Kind (${RANKS[threeRank-2]}s)`, kickers };
    }
    if (counts[0] === 2 && counts[1] === 2) {
        const pair1Rank = countRanks[0];
        const pair2Rank = countRanks[1];
        const kicker = ranks.find(r => r !== pair1Rank && r !== pair2Rank)!;
        return { rank: 'Two Pair', value: 300 + Math.max(pair1Rank, pair2Rank) + Math.min(pair1Rank, pair2Rank)/100, description: `Two Pair (${RANKS[Math.max(pair1Rank, pair2Rank)-2]}s and ${RANKS[Math.min(pair1Rank, pair2Rank)-2]}s)`, kickers: [kicker] };
    }
    if (counts[0] === 2) {
        const pairRank = countRanks[0];
        const kickers = ranks.filter(r => r !== pairRank).sort((a, b) => b - a);
        return { rank: 'Pair', value: 200 + pairRank, description: `Pair of ${RANKS[pairRank-2]}s`, kickers };
    }
    // High Card
    const kickers = [...ranks];
    return { rank: 'High Card', value: ranks[0], description: `High Card (${RANKS[ranks[0]-2]})`, kickers };
};


// Main evaluation function: Takes 7 cards (2 player + 5 community) and finds the best 5-card hand
const evaluateHand = (playerCards: Card[], communityCards: Card[]): HandValue & { value: number, kickers: number[] } => {
    const allCards = [...playerCards, ...communityCards];
    if (allCards.length < 5) {
        // Cannot evaluate with less than 5 cards, maybe return a placeholder or lowest possible value
         return { rank: 'High Card', value: 0, description: 'Not enough cards', kickers: [] };
    }

    const possibleHands = getCombinations(allCards, 5);
    let bestHand: HandValue & { value: number, kickers: number[] } = { rank: 'High Card', value: 0, description: 'High Card', kickers:[] }; // Initialize with lowest possible

    for (const fiveCardHand of possibleHands) {
        const evaluated = evaluateFiveCardHand(fiveCardHand);
        // Compare based on value, then kickers if values are equal
        if (evaluated.value > bestHand.value) {
            bestHand = evaluated;
        } else if (evaluated.value === bestHand.value) {
            // Compare kickers one by one
            for (let i = 0; i < Math.max(evaluated.kickers.length, bestHand.kickers.length); i++) {
                 const evalKicker = evaluated.kickers[i] || -1; // Use -1 if no kicker
                 const bestKicker = bestHand.kickers[i] || -1;
                 if (evalKicker > bestKicker) {
                     bestHand = evaluated;
                     break;
                 } else if (bestKicker > evalKicker) {
                     break; // Current best hand is better
                 }
                 // If kickers are equal, continue to next kicker
            }
         }
    }

    return bestHand;
};

// TODO: Implement Winner Determination Logic using evaluateHand
// NOTE: This simplified version does not handle side pots for multiple all-ins with varying stack sizes.
// It determines the best hand among all non-folded players and awards the entire pot.
const determineWinner = (players: Player[], communityCards: Card[]): { winners: string[], bestHandValue: HandValue & { value: number, kickers: number[] } } => {
    let winners: string[] = [];
    let bestHandValue: HandValue & { value: number, kickers: number[] } = { rank: 'High Card', value: -1, description: '', kickers:[] }; // Initialize lower than any possible hand

    const activePlayers = players.filter(p => !p.isFolded);
    if (activePlayers.length === 0) return { winners: [], bestHandValue }; // Should not happen if game logic is correct
    if (activePlayers.length === 1) return { winners: [activePlayers[0].id], bestHandValue }; // Last one standing wins

    for (const player of activePlayers) {
        const playerHandValue = evaluateHand(player.hand, communityCards);

        if (playerHandValue.value > bestHandValue.value) {
            winners = [player.id];
            bestHandValue = playerHandValue;
        } else if (playerHandValue.value === bestHandValue.value) {
            // Compare kickers for tie-breaking
            let tie = true;
             for (let i = 0; i < Math.max(playerHandValue.kickers.length, bestHandValue.kickers.length); i++) {
                 const playerKicker = playerHandValue.kickers[i] || -1;
                 const bestKicker = bestHandValue.kickers[i] || -1;
                 if (playerKicker > bestKicker) {
                     winners = [player.id]; // New sole winner found via kicker
                     bestHandValue = playerHandValue;
                     tie = false;
                     break;
                 } else if (bestKicker > playerKicker) {
                     tie = false; // Current best hand is better
                     break;
                 }
                 // If kickers are equal, continue
            }
            if (tie) {
                // It's a true tie (or kickers ran out), add player to winners
                winners.push(player.id);
            }
        }
    }

    // Update player objects with their evaluated hand (optional, useful for display)
    // players.forEach(p => { if (!p.isFolded) p.evaluatedHand = evaluateHand(p.hand, communityCards); });

    return { winners, bestHandValue };
};


// --- UI Components (Adapted from Blackjack) ---

const CardDisplay = ({ card, hidden, darkMode }: {
  card: Card | null;
  hidden?: boolean;
  darkMode: boolean;
}) => {
  const cardBaseStyle = `w-16 h-24 md:w-20 md:h-28 rounded-md border p-1 flex flex-col justify-between shadow-sm transition-all duration-300 relative overflow-hidden text-xs`; // Smaller cards
  const cardDarkStyle = 'bg-gray-700 border-gray-500 text-white';
  const cardLightStyle = 'bg-white border-gray-300 text-gray-900';
  const hiddenStyle = 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-700'; // Different back

  if (hidden || !card) {
    return (
      <div className={`${cardBaseStyle} ${darkMode ? 'bg-gray-600 border-gray-400' : hiddenStyle}`}> 
        {/* Hidden card back */}
      </div>
    );
  }

  const rankColor = ['Physics', 'Astronomy'].includes(card.suit)
    ? (darkMode ? 'text-blue-300' : 'text-blue-700')
    : (darkMode ? 'text-red-300' : 'text-red-700');

  return (
    <motion.div
      layoutId={card.id}
      className={`${cardBaseStyle} ${darkMode ? cardDarkStyle : cardLightStyle}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start text-[10px] md:text-xs"> 
        <div className={`font-bold ${rankColor}`}>{card.rank}</div>
        <div className="text-sm md:text-base">{card.suitIcon}</div>
      </div>
       <div className={`text-center text-[8px] md:text-[9px] font-semibold break-words leading-tight my-auto ${rankColor}`}> 
         {card.themeName}
       </div>
      <div className="flex justify-between items-end text-[10px] md:text-xs rotate-180"> 
        <div className={`font-bold ${rankColor}`}>{card.rank}</div>
        <div className="text-sm md:text-base">{card.suitIcon}</div>
      </div>
    </motion.div>
  );
};


// --- Main Game Component ---

export default function PokerGame({ onGameEnd }: PokerGameProps) {
  const { darkMode } = useTheme();
  // Comment out unused state for now
  // const [currentUser, setCurrentUser] = useState<User | null>(null); 

  const [currentDeck, setCurrentDeck] = useState<Card[]>([]); 
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [gameStage, setGameStage] = useState<GameStage>('Pre-flop'); // Initial stage before buy-in finishes
  const [message, setMessage] = useState('Enter Buy-in'); // Initial message
  const [dealerIndex, setDealerIndex] = useState(0); 
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0); 
  // --- Betting State ---
  const [highestBet, setHighestBet] = useState(0); 
  const [minRaise, setMinRaise] = useState(BIG_BLIND); 
  const [lastRaiserIndex, setLastRaiserIndex] = useState(-1); 
  // --- Human Player State ---
  const [isBuyingIn, setIsBuyingIn] = useState(true); // Start with buy-in screen
  const [buyInAmount, setBuyInAmount] = useState(STARTING_CHIPS); 
  const [raiseAmount, setRaiseAmount] = useState<string>(BIG_BLIND.toString()); 
  const humanPlayerId = 'human-player'; 

  // --- Initialization Function (defined inside component) ---
  const initializePlayers = useCallback((humanChips: number) => {
    console.log("Initializing players with human chips:", humanChips);
    setPlayers([
        { id: humanPlayerId, name: 'You', hand: [], chips: humanChips, currentBet: 0, isAllIn: false, isFolded: false, isBot: false, actedInRound: false }, 
        { id: 'player-2', name: 'Bot Bob', hand: [], chips: STARTING_CHIPS, currentBet: 0, isAllIn: false, isFolded: false, isBot: true, actedInRound: false }, 
    ]);
    setDealerIndex(Math.floor(Math.random() * 2)); 
    setMessage('Game initialized. Starting round...');
    setGameStage('Pre-flop'); 
    setCommunityCards([]);
    setPot(0);
    setCurrentPlayerIndex(0); 
    setHighestBet(0);
    setMinRaise(BIG_BLIND);
    setLastRaiserIndex(-1);
  }, []); 

  // --- Buy-in Handler (defined inside component) ---
   const handleBuyIn = useCallback(() => {
    if (buyInAmount >= BIG_BLIND * 2) { 
         setMessage('Initializing game...');
         setTimeout(() => {
            initializePlayers(buyInAmount);
            setIsBuyingIn(false); 
         }, 50); 
    } else {
        setMessage(`Buy-in must be at least ${BIG_BLIND * 2} chips.`);
    }
  }, [buyInAmount, initializePlayers]); 

  // --- Core Game Logic & Action Handlers (defined *before* useEffect) ---

  // Note: proceedToNextStage and handleShowdown are mutually dependent in some paths, 
  // but advanceTurn calls proceedToNextStage, and proceedToNextStage calls handleShowdown.
  // The main useEffect calls handleShowdown, startRound, handleBotAction.
  // Action handlers call advanceTurn.

  // Forward declaration for proceedToNextStage dependency in advanceTurn
  const proceedToNextStageRef = useRef<(() => void) | null>(null);
  // Forward declaration for handleShowdown dependency in proceedToNextStage
  const handleShowdownRef = useRef<(() => void) | null>(null);

   const advanceTurn = useCallback(() => {
       console.log("Advancing turn...");
       let nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
       let loopCheck = 0;
       // Skip folded players. Also skip players who are all-in unless someone else can still bet
       while (players[nextPlayerIndex]?.isFolded ||
             (players[nextPlayerIndex]?.isAllIn && players.some(p => !p.isFolded && !p.isAllIn))
           ) {
           if (!players[nextPlayerIndex]) {
               console.error("Player not found at index during turn advance", nextPlayerIndex);
               setGameStage('GameOver');
               return;
           }
           nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
           loopCheck++;
           if (loopCheck > players.length * 2) {
               console.error("Infinite loop detected in advanceTurn finding next player");
               setGameStage('GameOver');
               return;
           }
       }
       
       const activePlayers = players.filter(p => !p.isFolded);
       const nonAllInActivePlayers = activePlayers.filter(p => !p.isAllIn);
       
       // NEW CHECK: If only 1 or 0 players remain who can bet (non-all-in), and there are at least 2 active players overall,
       // then betting cannot continue. Proceed directly to the next stage.
       if (nonAllInActivePlayers.length <= 1 && activePlayers.length > 1) {
           console.log("AdvanceTurn detected situation where betting cannot continue (<=1 non-all-in players). Proceeding to next stage.");
           if (proceedToNextStageRef.current) {
               setTimeout(() => proceedToNextStageRef.current!(), 50);
           }
           setCurrentPlayerIndex(-1);
           return;
       }
       
       if (activePlayers.length <= 1) {
           console.log("AdvanceTurn detected only one active player left. Proceeding.");
           if (proceedToNextStageRef.current) proceedToNextStageRef.current();
           return;
       }
       
       const bettingRoundFinished = nonAllInActivePlayers.length > 0 &&
              nonAllInActivePlayers.every(p => p.actedInRound) &&
              nonAllInActivePlayers.every(p => p.currentBet === highestBet);
       
       const actionIsOnLastRaiserOrCheckedAround = nextPlayerIndex === lastRaiserIndex ||
           (lastRaiserIndex === -1 && nonAllInActivePlayers.every(p => p.actedInRound));
       
       const smallBlindIndex = dealerIndex;
       const bigBlindIndex = (dealerIndex + 1) % players.length;
       const bbPlayer = players[bigBlindIndex];
       const bbStillHasOption = gameStage === 'Pre-flop' &&
           bbPlayer && !bbPlayer.isFolded && !bbPlayer.isAllIn && !bbPlayer.actedInRound &&
           highestBet === BIG_BLIND &&
           currentPlayerIndex === smallBlindIndex;
       
       if (bettingRoundFinished && actionIsOnLastRaiserOrCheckedAround && !bbStillHasOption) {
           console.log("Betting round over. Proceeding to next stage.");
           if (proceedToNextStageRef.current) proceedToNextStageRef.current();
           return;
       }
       
       console.log(`Setting next player index to: ${nextPlayerIndex} (${players[nextPlayerIndex]?.name})`);
       setCurrentPlayerIndex(nextPlayerIndex);
   }, [players, currentPlayerIndex, highestBet, lastRaiserIndex, gameStage, dealerIndex]);

  const proceedToNextStage = useCallback(() => {
      console.log(`Proceeding from ${gameStage}...`);
      let currentPot = pot;
      // Important: Process bets and update pot *before* checking player states for next stage/showdown.
      const playersAfterBetting = players.map(p => {
          currentPot += p.currentBet;
          return { ...p, currentBet: 0, actedInRound: false }; // Reset bets and acted status
      });
      setPot(currentPot);
      setPlayers(playersAfterBetting); // Update player state immediately

      const activePlayersNow = playersAfterBetting.filter(p => !p.isFolded);
      if (activePlayersNow.length <= 1) {
           // If only one (or zero) player remains un-folded, they win. Trigger showdown/end.
           console.log("Only one player left un-folded. Proceeding to Showdown/End.");
           // Use the ref to call handleShowdown, which handles awarding the pot.
           // Set stage to Showdown before calling handleShowdown, ensuring the effect runs if needed.
           setGameStage('Showdown'); 
           if (handleShowdownRef.current) {
                // Use a small timeout to allow state update before showdown logic if needed,
                // although the effect might handle this better. Consider removing timeout if effect works.
                setTimeout(() => handleShowdownRef.current!(), 50); 
           }
           return;
      }

       // Check if further betting is possible
       const canStillBetCount = activePlayersNow.filter(p => !p.isAllIn).length;
       console.log(canStillBetCount)
       // If 0 or 1 players can still bet (i.e., everyone else is all-in or folded),
       // and we aren't already finished, deal remaining cards and go to Showdown.
       if (canStillBetCount <= 1 && gameStage !== 'Showdown' && gameStage !== 'EndRound' && gameStage !== 'GameOver') {
            console.log("All remaining players are all-in or only one can bet. Dealing remaining cards.");
            const tempDeck = [...currentDeck];
            const dealtCommunityCards: Card[] = [];
            const currentCommunityCardCount = communityCards.length;
            const cardsNeeded = 5 - currentCommunityCardCount;

            if (cardsNeeded > 0) {
                 console.log(`Dealing ${cardsNeeded} more community cards.`);
                 for (let i = 0; i < cardsNeeded; i++) {
                     if (tempDeck.length === 0) {
                          console.error("Deck empty during all-in dealing!");
                          setMessage("Error: Deck empty!");
                          setGameStage('GameOver');
                          // Update community cards with what *was* dealt before error
                          if(dealtCommunityCards.length > 0) {
                             setCommunityCards(prev => [...prev, ...dealtCommunityCards]);
                          }
                          setCurrentDeck(tempDeck); // Update deck (will be empty)
                          return;
                      }
                     const card = tempDeck.pop();
                     // Ensure card is valid before pushing
                     if (card) {
                         dealtCommunityCards.push(card);
                     } else {
                         // This case should theoretically be caught by the length check, but belt-and-suspenders
                         console.error("Popped undefined card from deck during all-in dealing!");
                         setMessage("Error: Deck error!");
                         setGameStage('GameOver');
                          if(dealtCommunityCards.length > 0) {
                             setCommunityCards(prev => [...prev, ...dealtCommunityCards]);
                          }
                          setCurrentDeck(tempDeck);
                         return;
                     }
                 }

                 // Update state after successfully dealing all needed cards
                 if (dealtCommunityCards.length > 0) {
                    setCurrentDeck(tempDeck);
                    setCommunityCards(prev => [...prev, ...dealtCommunityCards]);
                 }
            } else {
                 console.log("No more community cards needed.");
            }

            // After dealing, proceed directly to Showdown
            setGameStage('Showdown');
            setMessage('All remaining cards dealt due to all-in/fold. Proceeding to Showdown.');
            // Set current player index to -1 or an invalid index to prevent bot action trigger
            setCurrentPlayerIndex(-1);
            // Showdown logic will be triggered by the useEffect watching gameStage
            return; // IMPORTANT: Return here to prevent falling through to standard stage progression
        }

         // --- Standard Stage Progression (if betting is still possible, i.e. canStillBetCount > 1) ---
         let nextStage: GameStage = gameStage;
         const tempDeckForStage = [...currentDeck]; // Use a fresh copy for this block
         const cardsToDealForStage: Card[] = [];

        try {
            if (gameStage === 'Pre-flop') {
                nextStage = 'Flop';
                 if (tempDeckForStage.length < 3) throw new Error("Not enough cards for flop");
                 for (let i = 0; i < 3; i++) cardsToDealForStage.push(tempDeckForStage.pop()!); // Deal 3 for Flop
            } else if (gameStage === 'Flop') {
                nextStage = 'Turn';
                 if (tempDeckForStage.length < 1) throw new Error("Not enough cards for turn");
                 cardsToDealForStage.push(tempDeckForStage.pop()!); // Deal 1 for Turn
            } else if (gameStage === 'Turn') {
                nextStage = 'River';
                 if (tempDeckForStage.length < 1) throw new Error("Not enough cards for river");
                 cardsToDealForStage.push(tempDeckForStage.pop()!); // Deal 1 for River
            } else if (gameStage === 'River') {
                 // Betting round finished on the river, proceed to Showdown
                nextStage = 'Showdown';
                 // Don't deal cards here, just set stage. Showdown logic triggered by useEffect.
                 setGameStage(nextStage);
                 setMessage('River betting complete. Proceeding to Showdown.');
                 return;
            } else {
                // Should not happen if logic is correct (e.g., called during Showdown/EndRound)
                console.error("proceedToNextStage called in unexpected state:", gameStage);
                return;
            }
         } catch (e: unknown) {
             let errorMessage = 'Deck empty!';
             if (e instanceof Error) {
                 errorMessage = e.message;
             }
             console.error("Error dealing cards for next stage:", errorMessage);
             setGameStage('GameOver');
             setMessage(`Error: ${errorMessage}`);
             setCurrentDeck(tempDeckForStage); // Update deck state even on error
             // Update community cards dealt before error, if any
             if (cardsToDealForStage.length > 0 && cardsToDealForStage.every(c => c)) {
                  setCommunityCards(prev => [...prev, ...cardsToDealForStage]);
             }
             return;
         }

         // Validate dealt cards before state update
         if (cardsToDealForStage.some(card => card === undefined || card === null)) {
           console.error("Error dealing cards (Popped undefined from deck)");
           setGameStage('GameOver');
           setMessage("Error: Deck error!");
           setCurrentDeck(tempDeckForStage);
           return;
        }

         // Update state for the next standard betting round
         if (cardsToDealForStage.length > 0) {
           setCurrentDeck(tempDeckForStage);
           setCommunityCards(prev => [...prev, ...cardsToDealForStage]);
        }

        setGameStage(nextStage);
        setHighestBet(0); // Reset highest bet for the new round
        setMinRaise(BIG_BLIND); // Reset min raise for the new round
        setLastRaiserIndex(-1); // Reset last raiser for the new round

         // Determine the first player to act in the new betting round (usually player after dealer)
         // Skip folded or all-in players
         let firstToActIndex = (dealerIndex + 1) % playersAfterBetting.length;
         let loopCheck = 0;
         // Use the already updated playersAfterBetting state for this check
         while (playersAfterBetting[firstToActIndex]?.isFolded || playersAfterBetting[firstToActIndex]?.isAllIn) {
             if (!playersAfterBetting[firstToActIndex]) { // Safety check
                 console.error("Player not found at index finding first actor", firstToActIndex);
                 setGameStage('GameOver');
                 return;
             }
             firstToActIndex = (firstToActIndex + 1) % playersAfterBetting.length;
             loopCheck++;
             if (loopCheck > playersAfterBetting.length * 2) { // Prevent infinite loop
                 console.error("Infinite loop in proceedToNextStage finding first player");
                 setGameStage('GameOver');
                 return;
             }
         }

         // Check if anyone *can* actually act in the new round
         if (playersAfterBetting.filter(p => !p.isFolded && !p.isAllIn).length > 0) {
            setCurrentPlayerIndex(firstToActIndex);
            setMessage(`${nextStage} betting starts.`);
            console.log(`Next stage: ${nextStage}. First to act: ${playersAfterBetting[firstToActIndex]?.name} (Index: ${firstToActIndex})`);
         } else {
             // This case might occur if the only non-folded players went all-in during the *previous* round's actions
             // and proceedToNextStage was called. The check for `canStillBetCount <= 1` at the top should ideally
             // catch this, but as a fallback, we go to Showdown.
             console.log("No players left to bet after dealing cards for the new stage. Proceeding to Showdown.");
             setGameStage('Showdown');
         }

   }, [gameStage, pot, players, communityCards, currentDeck, dealerIndex]); // Added dependencies back

  const handleShowdown = useCallback(() => {
        console.log("Handling Showdown...");
        if (gameStage !== 'Showdown') {
            console.warn("handleShowdown called prematurely? Stage:", gameStage);
        }

        const currentPlayers = players;
        const activePlayers = currentPlayers.filter(p => !p.isFolded);

        // Define variables at the top of the scope
        let finalPot = pot;
        currentPlayers.forEach(p => finalPot += p.currentBet);
        let awardedPot = 0;
        let winnerMessage = "";
        const winnersData: { id: string, handValue: HandValue & { value: number, kickers: number[] } }[] = [];
        let leftover = 0; // Initialize leftover
        let firstWinnerId: string | null = null; // Initialize firstWinnerId

        if (activePlayers.length === 0) {
            setGameStage('EndRound');
            setMessage("Round ended: No active players.");
            if (onGameEnd) onGameEnd();
            return;
        }

        console.log("Final Pot at Showdown:", finalPot);

        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            awardedPot = finalPot;
            winnerMessage = `${winner.name} wins the pot (${finalPot})!`;
            winnersData.push({ id: winner.id, handValue: evaluateHand(winner.hand, communityCards) });
            firstWinnerId = winner.id; // Assign winner if only one
            leftover = 0; // No leftover if one winner gets all
        } else {
            const results = determineWinner(activePlayers, communityCards);
            const winnerIds = results.winners;
            const winningHandDesc = results.bestHandValue.description;
            console.log("Winners:", winnerIds, "with", winningHandDesc);

            const potShare = winnerIds.length > 0 ? Math.floor(finalPot / winnerIds.length) : 0;
            awardedPot = potShare * winnerIds.length;
            const winnerNames = currentPlayers.filter(p => winnerIds.includes(p.id)).map(p => p.name).join(' & ');
            winnerMessage = `${winnerNames} win${winnerIds.length > 1 ? '' : 's'} the pot (${awardedPot}) with ${winningHandDesc}!`;
            
            winnerIds.forEach(id => {
                const winnerPlayer = activePlayers.find(p => p.id === id);
                if (winnerPlayer) {
                    winnersData.push({ id: winnerPlayer.id, handValue: evaluateHand(winnerPlayer.hand, communityCards) });
                }
            });

            leftover = finalPot - awardedPot; // Calculate leftover
            firstWinnerId = winnerIds.length > 0 ? winnerIds[0] : null; // Assign firstWinnerId

            if (leftover > 0 && firstWinnerId) {
                 console.log(`Awarding ${leftover} leftover chips to ${firstWinnerId}`);
                 // We will add the leftover chips directly to the first winner in the setPlayers call below
             } else if (leftover > 0) {
                 console.warn("Leftover chips exist but no winner found?");
             }
        }
        
        // Update player chips and evaluated hands based on winnersData
        setPlayers(prev => prev.map(p => {
             const isWinner = winnersData.some(w => w.id === p.id);
             let potShare = isWinner && winnersData.length > 0 ? Math.floor(finalPot / winnersData.length) : 0;
             
             // Award leftover to the first winner found (defined outside this map scope now)
             if (p.id === firstWinnerId && leftover > 0) {
                 potShare += leftover;
             }
 
             const evaluatedHand = activePlayers.some(ap => ap.id === p.id) 
                                  ? winnersData.find(w=>w.id === p.id)?.handValue || evaluateHand(p.hand, communityCards)
                                  : undefined;

             return {
                 ...p,
                 chips: p.chips + potShare, // Award pot share (includes leftover for first winner)
                 currentBet: 0, 
                 evaluatedHand: evaluatedHand
             };
         }));

        setMessage(winnerMessage);
        setPot(prev => Math.max(0, prev - (awardedPot + leftover))); // Subtract full awarded amount (including leftover)
        setGameStage('EndRound');
        if (onGameEnd) onGameEnd();
    }, [gameStage, players, communityCards, pot, onGameEnd]);

   // Update refs after definitions
   useEffect(() => {
     proceedToNextStageRef.current = proceedToNextStage;
     handleShowdownRef.current = handleShowdown;
   }, [proceedToNextStage, handleShowdown]);

  const startRound = useCallback(() => {
    if (isBuyingIn || players.length < 2) {
        console.warn("Attempted to start round during buy-in or with insufficient players.");
        return;
    }
    console.log("Starting new round...");
    const newDeck = shuffleDeck(createDeck());

    const resetPlayers = players.map(p => ({
        ...p,
        hand: [] as Card[],
        currentBet: 0,
        isFolded: p.chips <= 0,
        isAllIn: false,
        actedInRound: false, 
        evaluatedHand: undefined, 
    })).filter(p => p.chips > 0); 

     if (resetPlayers.length < 2) {
         setMessage("Not enough players with chips to continue.");
         setGameStage("GameOver");
         if (onGameEnd) onGameEnd();
         return;
     }

     const nextDealerIndex = (dealerIndex + 1) % resetPlayers.length;
     setDealerIndex(nextDealerIndex);

     for (let i = 0; i < 2; i++) { 
        for (let j = 0; j < resetPlayers.length; j++) {
             const playerDealIndex = (nextDealerIndex + 1 + j) % resetPlayers.length;
             const targetPlayer = resetPlayers[playerDealIndex];
             if (targetPlayer && !targetPlayer.isFolded) { 
                 const card = newDeck.pop();
                 if (card) {
                    targetPlayer.hand.push(card);
                 } else {
                     console.error("Deck ran out during dealing!");
                     setGameStage("GameOver");
                     setMessage("Error: Deck empty!");
                     return;
                 }
             }
        }
     }

    setCurrentDeck(newDeck); 
    setCommunityCards([]);
    setPot(0); 
    setGameStage('Pre-flop');
    
    const smallBlindIndex = nextDealerIndex;
    const bigBlindIndex = (nextDealerIndex + 1) % resetPlayers.length;

    let currentPot = 0;
    let currentHighestBet = 0; 

    const sbPlayer = resetPlayers[smallBlindIndex];
    if (sbPlayer) {
        const sbAmount = Math.min(SMALL_BLIND, sbPlayer.chips);
        sbPlayer.chips -= sbAmount;
        sbPlayer.currentBet = sbAmount;
        if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;
        currentPot += sbAmount;
        currentHighestBet = Math.max(currentHighestBet, sbAmount);
    } else { console.error("SB Player not found"); }

    const bbPlayer = resetPlayers[bigBlindIndex];
    if (bbPlayer) {
        const bbAmount = Math.min(BIG_BLIND, bbPlayer.chips);
        bbPlayer.chips -= bbAmount;
        bbPlayer.currentBet = bbAmount;
        if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;
        currentPot += bbAmount;
        currentHighestBet = Math.max(currentHighestBet, bbAmount);
    } else { console.error("BB Player not found"); }

    setPot(currentPot);
    setPlayers(resetPlayers); 
    setHighestBet(currentHighestBet); 
    setMinRaise(BIG_BLIND); 

    const playerAfterBBIndex = (bigBlindIndex + 1) % resetPlayers.length;
    setCurrentPlayerIndex(playerAfterBBIndex);
    setLastRaiserIndex(bigBlindIndex); 

    setMessage('Pre-flop betting starts.');
  }, [players, dealerIndex, isBuyingIn, onGameEnd]); 

  const handleCheck = useCallback(() => {
      const currentPlayer = players[currentPlayerIndex];
      if (!currentPlayer || currentPlayer.isFolded || currentPlayer.isAllIn || currentPlayer.id !== humanPlayerId) return;
      if (currentPlayer.currentBet < highestBet) {
          console.warn("Cannot check, must call or raise."); 
          return;
      }
      console.log(`${currentPlayer.name} checks`);
      setPlayers(prev => prev.map((p, index) =>
            index === currentPlayerIndex ? { ...p, actedInRound: true } : p
        ));
      advanceTurn();
  }, [players, currentPlayerIndex, highestBet, advanceTurn]);

  const handleCall = useCallback(() => {
       const currentPlayer = players[currentPlayerIndex];
       if (!currentPlayer || currentPlayer.isFolded || currentPlayer.isAllIn || currentPlayer.id !== humanPlayerId) return;
       const amountToCall = highestBet - currentPlayer.currentBet;
       if (amountToCall <= 0) {
           handleCheck(); 
           return;
       }
       const callAmount = Math.min(amountToCall, currentPlayer.chips); 
       const isAllInCall = callAmount === currentPlayer.chips && amountToCall >= currentPlayer.chips;
       console.log(`${currentPlayer.name} calls ${callAmount}`);
       setPlayers(prev => prev.map((p, index) =>
            index === currentPlayerIndex ? {
                ...p,
                chips: p.chips - callAmount,
                currentBet: p.currentBet + callAmount,
                actedInRound: true,
                isAllIn: isAllInCall || p.isAllIn 
             } : p
        ));
       advanceTurn();
  }, [players, currentPlayerIndex, highestBet, advanceTurn, handleCheck]);

   const handleRaise = useCallback((raiseAmountInput: number) => {
       const currentPlayer = players[currentPlayerIndex];
       if (!currentPlayer || currentPlayer.isFolded || currentPlayer.isAllIn || currentPlayer.id !== humanPlayerId) return;

       const amountToCall = highestBet - currentPlayer.currentBet;
       const isAllInRaise = (amountToCall + raiseAmountInput) >= currentPlayer.chips;

       // Check if raise is valid BEFORE calculating totalBetIncrease
       // A raise must be at least minRaise UNLESS it's an all-in raise
       // Also check if the input was actually positive
       if (raiseAmountInput <= 0 || (raiseAmountInput < minRaise && !isAllInRaise)) {
            // Don't automatically reset the input here, just prevent the action.
            // The button disable logic should prevent this, but added as safety.
           console.warn(`Invalid raise amount attempted: ${raiseAmountInput}. Min raise is ${minRaise} unless all-in.`);
           // Optional: Reset input? Let's not, user might be typing.
           // setRaiseAmount(minRaise.toString());
           return; // Don't proceed
       }

       const totalBetIncrease = amountToCall + raiseAmountInput;

        // Check if trying to bet more than available (should be handled by all-in logic)
        if (totalBetIncrease > currentPlayer.chips && !isAllInRaise) {
           console.warn(`Attempting to bet ${totalBetIncrease} with only ${currentPlayer.chips} chips, but not calculated as all-in. Forcing all-in.`);
           // Force it to be an all-in raise
            const allInBet = currentPlayer.chips;
            const actualRaiseAmount = Math.max(0, allInBet - amountToCall); // Raise can't be negative if calling covers chips
            console.log(`${currentPlayer.name} raises ALL-IN (${allInBet}) - Corrected`);
            const finalBet = currentPlayer.currentBet + allInBet;
             setPlayers(prev => prev.map((p, index) =>
                 index === currentPlayerIndex ? {
                     ...p,
                     chips: 0,
                     currentBet: finalBet,
                     actedInRound: true,
                     isAllIn: true
                  } : { ...p, actedInRound: false } // Reset actedInRound for others on raise
             ));
             setHighestBet(finalBet); // Keep as number
             // Only update minRaise if the all-in raise amount itself is >= the previous minRaise
             if (actualRaiseAmount >= minRaise) {
                 setMinRaise(actualRaiseAmount); // Keep as number
             }
             setLastRaiserIndex(currentPlayerIndex);
             advanceTurn();
             return; // Exit after handling corrected all-in
        }


       if (isAllInRaise) {
            // All-in raise (betting exactly all remaining chips)
            const allInBet = currentPlayer.chips;
            // The actual amount raised is the difference between the all-in bet and the call amount
            const actualRaiseAmount = Math.max(0, allInBet - amountToCall);
            console.log(`${currentPlayer.name} raises ALL-IN (${allInBet})`);
            const finalBet = currentPlayer.currentBet + allInBet; // The total bet this player has in
            setPlayers(prev => prev.map((p, index) =>
                index === currentPlayerIndex ? {
                    ...p,
                    chips: 0,
                    currentBet: finalBet,
                    actedInRound: true,
                    isAllIn: true
                 } : { ...p, actedInRound: false } // Reset actedInRound for others on raise
            ));
            setHighestBet(finalBet); // Update highest total bet for this round - Keep as number
            // Update the minimum *next* raise only if this all-in raise amount was larger than the current minimum raise required
            if (actualRaiseAmount >= minRaise) {
                setMinRaise(actualRaiseAmount); // Keep as number
            }
            setLastRaiserIndex(currentPlayerIndex);
       } else {
            // Standard raise (not all-in)
            console.log(`${currentPlayer.name} raises by ${raiseAmountInput} (total bet: ${currentPlayer.currentBet + totalBetIncrease})`);
            setPlayers(prev => prev.map((p, index) =>
                index === currentPlayerIndex ? {
                    ...p,
                    chips: p.chips - totalBetIncrease,
                    currentBet: p.currentBet + totalBetIncrease,
                    actedInRound: true,
                    isAllIn: false
                 } : { ...p, actedInRound: false } // Reset actedInRound for others on raise
            ));
            const newHighestBet = currentPlayer.currentBet + totalBetIncrease;
            setHighestBet(newHighestBet); // Keep as number
            setMinRaise(raiseAmountInput); // The amount *raised* becomes the new minimum raise for the next player - Keep as number
            setLastRaiserIndex(currentPlayerIndex);
       }
       // Reset the input field to the new minimum raise for convenience, maybe?
       // setRaiseAmount(minRaise.toString()); // Or keep it as is? Let's keep it as is for now.
       advanceTurn();
   }, [players, currentPlayerIndex, highestBet, minRaise, advanceTurn]);

  const handleFold = useCallback(() => {
       const currentPlayer = players[currentPlayerIndex];
       if (!currentPlayer || currentPlayer.isFolded || currentPlayer.isAllIn || currentPlayer.id !== humanPlayerId) return;
       console.log(`${currentPlayer.name} folds`);
       // Create a new players array with the current player marked as folded
       const newPlayers = players.map((p, index) =>
           index === currentPlayerIndex ? { ...p, isFolded: true, actedInRound: true, hand: [] } : p
       );
       setPlayers(newPlayers);
       // Immediately check how many active (non-folded) players remain
       const activePlayersLeft = newPlayers.filter(p => !p.isFolded);
       if (activePlayersLeft.length <= 1) {
           console.log("Only one active player left after fold. Ending round immediately.");
           if (proceedToNextStageRef.current) {
               setTimeout(() => proceedToNextStageRef.current!(), 50);
           }
       } else {
           advanceTurn();
       }
   }, [players, currentPlayerIndex, advanceTurn, proceedToNextStageRef]);

   const handleBotAction = useCallback(() => {
       const currentPlayer = players[currentPlayerIndex];
       if (!currentPlayer || !currentPlayer.isBot || currentPlayer.isFolded || currentPlayer.isAllIn ||
           gameStage === 'Showdown' || gameStage === 'EndRound' || gameStage === 'GameOver') {
           return;
       }
       console.log(`${currentPlayer.name}'s turn (Bot) - Stage: ${gameStage}, Highest Bet: ${highestBet}, My Bet: ${currentPlayer.currentBet}`);
       
       // Determine hand strength based on game stage.
       let handStrength = 0;
       if (gameStage === 'Pre-flop') {
           const myCards = currentPlayer.hand;
           if (myCards.length < 2) {
               handStrength = 0.3;
           } else if (myCards[0].rank === myCards[1].rank) {
               handStrength = 0.8;
           } else {
               const value1 = RANK_VALUES[myCards[0].rank];
               const value2 = RANK_VALUES[myCards[1].rank];
               if (value1 >= 10 && value2 >= 10) {
                   handStrength = 0.6;
               } else {
                   handStrength = 0.4;
               }
           }
       } else {
           // If community cards exist, evaluate hand using evaluateHand; otherwise assign a default middling value.
           if (communityCards.length >= 3) {
               const evalResult = evaluateHand(currentPlayer.hand, communityCards);
               if (evalResult.value >= 600) {
                   handStrength = 0.9;
               } else if (evalResult.value >= 400) {
                   handStrength = 0.6;
               } else {
                   handStrength = 0.3;
               }
           } else {
               handStrength = 0.5;
           }
       }
       
       const amountToCall = highestBet - currentPlayer.currentBet;
       console.log(`${currentPlayer.name} hand strength: ${handStrength}, amount to call: ${amountToCall}`);
       
       if (amountToCall <= 0) {
           console.log(`${currentPlayer.name} checks`);
           setPlayers(prev => prev.map((p, index) =>
               index === currentPlayerIndex ? { ...p, actedInRound: true } : p
           ));
       } else if (handStrength >= 0.8 && currentPlayer.chips > amountToCall * 2) {
           // Strong hand: raise by at least minRaise or 50% of chips.
           const raiseAmount = Math.max(minRaise, Math.floor(currentPlayer.chips * 0.5));
           const totalBet = amountToCall + raiseAmount;
           if (totalBet >= currentPlayer.chips) {
              console.log(`${currentPlayer.name} goes ALL-IN with ${currentPlayer.chips} (strong hand raise)`);
              setPlayers(prev => prev.map((p, index) =>
                  index === currentPlayerIndex ? {
                        ...p,
                        currentBet: p.currentBet + currentPlayer.chips,
                        chips: 0,
                        actedInRound: true,
                        isAllIn: true
                    } : p
              ));
           } else {
              console.log(`${currentPlayer.name} raises by ${raiseAmount} (strong hand)`);
              setPlayers(prev => prev.map((p, index) =>
                  index === currentPlayerIndex ? {
                        ...p,
                        chips: p.chips - totalBet,
                        currentBet: p.currentBet + totalBet,
                        actedInRound: true
                    } : p
              ));
              setHighestBet(prev => Math.max(prev, currentPlayer.currentBet + totalBet));
              setMinRaise(raiseAmount);
           }
       } else if (handStrength >= 0.5 || amountToCall < Math.floor(currentPlayer.chips * 0.1)) {
           // Moderate hand or a very cheap call: opt to call.
           const callAmount = Math.min(amountToCall, currentPlayer.chips);
           const isAllInCall = callAmount === currentPlayer.chips;
           console.log(`${currentPlayer.name} calls ${callAmount}${isAllInCall ? ' (All-in)' : ''}`);
           setPlayers(prev => prev.map((p, index) =>
               index === currentPlayerIndex ? {
                        ...p,
                        chips: p.chips - callAmount,
                        currentBet: p.currentBet + callAmount,
                        actedInRound: true,
                        isAllIn: isAllInCall
                    } : p
           ));
       } else {
           console.log(`${currentPlayer.name} folds (weak hand)`);
           setPlayers(prev => prev.map((p, index) =>
               index === currentPlayerIndex ? { ...p, isFolded: true, actedInRound: true, hand: [] } : p
           ));
       }
       
       setTimeout(advanceTurn, 50);
   }, [players, currentPlayerIndex, highestBet, gameStage, communityCards, minRaise, advanceTurn]);

   // --- useEffect Hooks (defined *after* useCallback functions) ---

   // Game Flow Effect 
   useEffect(() => {
     if (isBuyingIn || players.length === 0) return; 
     if (gameStage === 'Showdown') {
         const timer = setTimeout(() => handleShowdownRef.current && handleShowdownRef.current(), 500); 
         return () => clearTimeout(timer);
     }
     if (gameStage === 'EndRound' || gameStage === 'GameOver') {
         return;
     }
     if (gameStage === 'Pre-flop' && communityCards.length === 0 && players.every(p => p.hand.length === 0)) {
        startRound();
        return; 
     } 
     const currentPlayer = players[currentPlayerIndex];
     if (currentPlayer?.isBot && !currentPlayer.isFolded && !currentPlayer.isAllIn) { 
        const timer = setTimeout(() => {
            handleBotAction();
        }, 1200); 
        return () => clearTimeout(timer); 
     }
   }, [gameStage, players, currentPlayerIndex, communityCards.length, isBuyingIn, startRound, handleBotAction]); // Removed handleShowdown dep, uses ref

   // --- Render Logic ---
   const renderPlayer = useCallback((player: Player, index: number) => (
     // Added useCallback with dependencies
     <div key={player.id} className={`p-3 border rounded-lg ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300 shadow-sm'} relative min-h-[10rem]`}>
       <div className="flex justify-between items-center mb-2">
          <span className={`font-semibold text-sm md:text-base ${index === currentPlayerIndex ? 'text-yellow-400' : ''}`}>{player.name} {index === dealerIndex ? '(D)' : ''}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${player.isFolded ? 'bg-red-600 text-white' : player.isAllIn ? 'bg-yellow-500 text-black' : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
              {player.isFolded ? 'Folded' : player.isAllIn ? `All In (${player.chips + player.currentBet})` : `Chips: ${player.chips}`}
          </span>
       </div>
       <div className="flex justify-center items-center gap-1 min-h-[7rem] mb-1"> 
         <AnimatePresence>
           {player.hand.map((card) => (
             <CardDisplay key={card.id} card={card} darkMode={darkMode} hidden={player.isFolded || (gameStage !== 'Showdown' && gameStage !== 'EndRound' && player.id !== humanPlayerId)}/>
           ))}
           {(player.hand.length === 0 || (player.isFolded && gameStage !== 'Showdown')) && !player.isAllIn && Array(2).fill(0).map((_, i) => (
              <div key={`placeholder-${player.id}-${i}`} className={`w-16 h-24 md:w-20 md:h-28 rounded-md border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-100/50'} opacity-40`}></div>
           ))}
         </AnimatePresence>
       </div>
        {player.currentBet > 0 && !player.isFolded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-md z-10"
             >
              Bet: {player.currentBet}
            </motion.div>
        )}
        {index === currentPlayerIndex && !player.isFolded && !player.isAllIn && gameStage !== 'Showdown' && gameStage !== 'EndRound' && gameStage !== 'GameOver' && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
        )}
         {(gameStage === 'Showdown' || gameStage === 'EndRound') && !player.isFolded && player.evaluatedHand && (
             <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.5 }}
                 className="text-center text-xs mt-1 font-medium text-purple-400">
                     {player.evaluatedHand.description}
                 </motion.div>
          )}
     </div>
   ), [darkMode, dealerIndex, currentPlayerIndex, gameStage, humanPlayerId]); // Added dependencies

    const buttonStyle = `px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm shadow`;
    const primaryButtonStyle = darkMode
      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-500 hover:to-cyan-500'
      : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-400 hover:to-cyan-400';
    const secondaryButtonStyle = darkMode
      ? 'bg-gray-600 hover:bg-gray-500 text-white'
      : 'bg-gray-200 hover:bg-gray-300 text-gray-800';
     const foldButtonStyle = darkMode
         ? 'bg-red-700 hover:bg-red-600 text-white'
         : 'bg-red-500 hover:bg-red-600 text-white';


    // --- Conditional Rendering: Buy-in or Game --- 

    if (isBuyingIn) {
        // --- Buy-in Screen --- 
        return (
          <div className={`flex flex-col items-center justify-center h-full p-4 ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
              <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} text-center w-full max-w-sm`}>
                  <h2 className="text-xl md:text-2xl font-semibold mb-4">Welcome to Texas Hold&apos;em!</h2>
                  <p className="mb-4">Enter your buy-in amount (min {BIG_BLIND * 2})</p>
                  <div className="flex justify-center items-center gap-2 mb-5">
                      <label htmlFor="buyInAmount" className="font-medium">Chips:</label>
                      <input
                          id="buyInAmount"
                          type="number"
                          value={buyInAmount}
                          onChange={(e) => setBuyInAmount(Math.max(0, parseInt(e.target.value) || 0))}
                          min={BIG_BLIND * 2}
                          step={BIG_BLIND}
                          className={`px-3 py-1 rounded border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'} w-32 text-center`}
                       />
                  </div>
                  <button onClick={handleBuyIn} className={`${buttonStyle} ${primaryButtonStyle} w-full`}>
                      Join Game
                  </button>
                   {message && message !== 'Initializing game...' && !message.startsWith('Game initialized') && <p className="text-red-500 text-sm mt-3">{message}</p>}
              </div>
          </div>
        );
    } else if (players.length === 0) {
       // Loading state or handle error if players didn't initialize
       return <div className="flex items-center justify-center h-full">Loading...</div>;
    } else {
       // --- Main Game Screen --- 
       const humanPlayer = players.find(p => p.id === humanPlayerId);
       const isHumanTurn = players[currentPlayerIndex]?.id === humanPlayerId && gameStage !== 'Showdown' && gameStage !== 'EndRound' && gameStage !== 'GameOver';
       const canHumanCheck = isHumanTurn && humanPlayer && humanPlayer.currentBet === highestBet;
       const canHumanCall = isHumanTurn && humanPlayer && humanPlayer.currentBet < highestBet && humanPlayer.chips > 0;
       const amountToCall = humanPlayer ? Math.min(highestBet - humanPlayer.currentBet, humanPlayer.chips) : 0;
       const canHumanRaise = isHumanTurn && humanPlayer && humanPlayer.chips > amountToCall;
       const currentRaiseNum = parseInt(raiseAmount) || 0; // PARSE HERE FOR VALIDATION AND USE

       return (
         <div className={`flex flex-col h-full p-2 md:p-4 ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gradient-to-br from-gray-50 to-gray-200 text-gray-900'} overflow-y-auto`}>
            {/* Game Info Area */}
           <div className={`w-full text-center mb-3 p-2 rounded-lg sticky top-0 z-20 ${darkMode ? 'bg-gray-800/90' : 'bg-white/90 shadow'}`}>
             <p className="text-base md:text-lg font-medium">{message}</p>
              <p className="text-sm md:text-base font-semibold mt-1">Pot: {pot} Chips</p>
              <p className="text-xs md:text-sm uppercase tracking-wide">{gameStage}</p>
           </div>

             {/* Player Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 flex-shrink-0">
              {players.map(renderPlayer)}
            </div>


           {/* Community Card Area */}
           <div className="w-full mb-4 flex-shrink-0">
             <h3 className="text-base md:text-lg font-semibold mb-2 text-center">Community Cards</h3>
             <div className={`flex justify-center items-center gap-2 min-h-[8rem] p-3 rounded-lg ${darkMode ? 'bg-green-900/50' : 'bg-green-600/20'}`}>
               <AnimatePresence>
                 {communityCards.map((card) => (
                   <CardDisplay key={card.id} card={card} darkMode={darkMode} />
                 ))}
                  {Array(Math.max(0, 5 - communityCards.length)).fill(0).map((_, i) => (
                      <div key={`comm-placeholder-${i}`} className={`w-16 h-24 md:w-20 md:h-28 rounded-md border-dashed border-2 ${darkMode ? 'border-gray-600/50' : 'border-gray-400/50'} `}></div>
                  ))}
               </AnimatePresence>
             </div>
           </div>

           {/* Action Area - Enabled for human player */} 
           {isHumanTurn && humanPlayer && (
             <div className={`mt-auto w-full flex flex-wrap justify-center items-center gap-2 md:gap-3 p-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'} flex-shrink-0`}> 
                 <button onClick={handleFold} className={`${buttonStyle} ${foldButtonStyle}`} disabled={!isHumanTurn || humanPlayer.isAllIn}>Fold</button>
                 <button onClick={handleCheck} className={`${buttonStyle} ${secondaryButtonStyle}`} disabled={!canHumanCheck || humanPlayer.isAllIn}>Check</button>
                 <button onClick={handleCall} className={`${buttonStyle} ${secondaryButtonStyle}`} disabled={!canHumanCall || humanPlayer.isAllIn}>Call {amountToCall > 0 ? amountToCall : ''}</button>
                  <div className="flex items-center gap-1">
                      <button
                         onClick={() => handleRaise(currentRaiseNum)} // PASS PARSED NUMBER
                          className={`${buttonStyle} ${primaryButtonStyle}`}
                          disabled={
                              !canHumanRaise || // Base condition: Can the player physically raise? (Chips > amountToCall)
                              humanPlayer.isAllIn || // Already all-in
                              isNaN(parseInt(raiseAmount)) || // Check if input is actually a number (catches empty string, letters)
                              currentRaiseNum <= 0 || // Raise amount must be positive
                              (amountToCall + currentRaiseNum > humanPlayer.chips) || // Total bet (call + raise) exceeds available chips
                              (currentRaiseNum < minRaise && (amountToCall + currentRaiseNum) < humanPlayer.chips) // Raise is less than minRaise AND it's NOT an all-in situation
                          }
                      >
                          Raise
                      </button>
                      <input
                          type="number" // Keep for browser UI hints like arrows/mobile keyboard
                          value={raiseAmount} // Bind to STRING state
                         onChange={(e) => setRaiseAmount(e.target.value)} // Set STRING state directly
                          // No min attribute needed, validation handled by button disable/handleRaise
                          step={BIG_BLIND}
                          className={`px-2 py-1 rounded border ${darkMode ? 'bg-gray-700 border-gray-500' : 'bg-white border-gray-300'} w-20 text-center text-sm`}
                          disabled={!canHumanRaise || humanPlayer.isAllIn} // Disable input if cannot raise at all
                      />
                  </div>
             </div>
           )}

             {/* Temporary Bot Action Button commented out */}
              {/* {gameStage !== 'EndRound' && gameStage !== 'Showdown' && gameStage !== 'GameOver' && players[currentPlayerIndex]?.isBot && (
                   <div className="mt-auto text-center p-4 flex-shrink-0">
                      <button
                          onClick={handleBotAction}
                          className={`${buttonStyle} ${primaryButtonStyle}`}
                          disabled={!players[currentPlayerIndex]?.isBot || players[currentPlayerIndex]?.isFolded || players[currentPlayerIndex]?.isAllIn}
                      >
                          TEMP: Trigger {players[currentPlayerIndex]?.name}&apos;s Action
                      </button>
                   </div>
              )} */}


           {/* "New Round" button */}
           {(gameStage === 'EndRound' || gameStage === 'GameOver') && (
              <div className="mt-auto text-center p-4 flex-shrink-0">
                 <button
                     onClick={startRound} 
                     className={`${buttonStyle} ${primaryButtonStyle}`}
                     disabled={players.filter(p => p.chips > 0).length < 2} 
                 >
                     New Round
                 </button>
              </div>
           )}

        </div>
      );
    }
}

