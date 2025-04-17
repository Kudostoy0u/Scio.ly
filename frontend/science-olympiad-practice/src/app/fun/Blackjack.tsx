'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
// import { useRouter } from 'next/navigation'; // Removed unused import
import { motion, AnimatePresence } from 'framer-motion'; // For animations & Added AnimatePresence
import { onAuthStateChanged, User } from 'firebase/auth'; // Import Firebase Auth
import { auth } from '@/lib/firebase'; // Import auth instance
import { updateGamePoints } from '@/app/utils/gamepoints'; // Import game points utility

// --- Card Definitions ---

type Suit = 'Physics' | 'Chemistry' | 'Biology' | 'Astronomy';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  id: string; // Unique ID for each card instance
  suit: Suit;
  rank: Rank;
  value: number; // Blackjack value
  themeName: string;
  suitIcon: string;
}

interface BlackjackGameProps {
  onGameEnd: () => void; // Callback to notify parent when a game round ends (e.g., to refetch balance)
}

// --- Game Constants ---

const SUITS: Suit[] = ['Physics', 'Chemistry', 'Biology', 'Astronomy'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_ICONS: Record<Suit, string> = {
  Physics: '⚛️', Chemistry: '🧪', Biology: '🧬', Astronomy: '🔭',
};
const RANK_THEMES: Record<Rank, { themeName: string; value: number }> = {
  '2': { themeName: 'Helium (He)', value: 2 }, '3': { themeName: 'Lithium (Li)', value: 3 },
  '4': { themeName: 'Beryllium (Be)', value: 4 }, '5': { themeName: 'Boron (B)', value: 5 },
  '6': { themeName: 'Carbon (C)', value: 6 }, '7': { themeName: 'Nitrogen (N)', value: 7 },
  '8': { themeName: 'Oxygen (O)', value: 8 }, '9': { themeName: 'Fluorine (F)', value: 9 },
  '10': { themeName: 'Neon (Ne)', value: 10 }, 'J': { themeName: 'Newton', value: 10 }, // Ace value handled dynamically
  'Q': { themeName: 'Curie', value: 10 }, 'K': { themeName: 'Darwin', value: 10 },
  'A': { themeName: 'Microscope', value: 11 },
};

// --- Utility Functions ---

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  let idCounter = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const themeInfo = RANK_THEMES[rank];
      deck.push({
        id: `card-${idCounter++}`,
        suit, rank, value: themeInfo.value,
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

const calculateHandValue = (hand: Card[]): number => {
  let value = 0;
  let aceCount = 0;
  for (const card of hand) {
    value += card.value;
    if (card.rank === 'A') {
      aceCount++;
    }
  }
  while (value > 21 && aceCount > 0) {
    value -= 10; // Change Ace value from 11 to 1
    aceCount--;
  }
  return value;
};

// --- UI Components ---

const CardDisplay = ({ card, hidden, darkMode }: {
  card: Card | null;
  hidden?: boolean;
  darkMode: boolean;
}) => {
  const cardBaseStyle = `w-20 h-28 md:w-24 md:h-36 rounded-lg border p-1.5 flex flex-col justify-between shadow-md transition-all duration-300 relative overflow-hidden`; // Adjusted padding
  const cardDarkStyle = 'bg-gray-700 border-gray-500 text-white';
  const cardLightStyle = 'bg-white border-gray-300 text-gray-900';
  const hiddenStyle = 'bg-gradient-to-br from-teal-500 to-cyan-600 border-teal-700';

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
      layoutId={card.id} // Animate card movement
      className={`${cardBaseStyle} ${darkMode ? cardDarkStyle : cardLightStyle}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start text-xs md:text-sm"> {/* Top row */}
        <div className={`font-bold ${rankColor}`}>{card.rank}</div>
        <div className="text-base md:text-lg">{card.suitIcon}</div>
      </div>
      <div className={`text-center text-[9px] md:text-[10px] font-semibold break-words leading-tight my-auto ${rankColor}`}> {/* Centered theme name */}
        {card.themeName}
      </div>
      <div className="flex justify-between items-end text-xs md:text-sm rotate-180"> {/* Bottom row (rotated) */}
        <div className={`font-bold ${rankColor}`}>{card.rank}</div>
        <div className="text-base md:text-lg">{card.suitIcon}</div>
      </div>
    </motion.div>
  );
};

// --- Main Game Component ---

export default function BlackjackGame({ onGameEnd }: BlackjackGameProps) {
  const { darkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Firebase user

  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<'betting' | 'playing' | 'playerWins' | 'dealerWins' | 'push' | 'playerBusts'>('betting');
  const [message, setMessage] = useState('Place your bet!');
  const [dealerHiddenCard, setDealerHiddenCard] = useState<Card | null>(null);
  const [bet, setBet] = useState(1); // Default bet
  // Note: Balance is managed in GamesDashboard. We just adjust points via updateGamePoints.

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe(); // Cleanup subscription
  }, []);

  // --- Game Flow Functions ---

  const startGame = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    const pHand: Card[] = [];
    const dHand: Card[] = [];

    // Deal initial hands
    pHand.push(newDeck.pop()!);
    const hiddenCard = newDeck.pop()!;
    setDealerHiddenCard(hiddenCard); // Keep dealer's second card hidden initially
    dHand.push(newDeck.pop()!); // Dealer shows one card
    pHand.push(newDeck.pop()!);

    setDeck(newDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setGameStatus('playing');
    setMessage('Your turn. Hit or Stand?');

    // Calculate initial scores
    const initialPlayerScore = calculateHandValue(pHand);
    const initialDealerScore = calculateHandValue(dHand); // Only visible card
    setPlayerScore(initialPlayerScore);
    setDealerScore(initialDealerScore);

    // Check for immediate Blackjack
    if (initialPlayerScore === 21) {
      // Reveal dealer's hidden card for Blackjack check
      const fullDealerHand = [dHand[0], hiddenCard];
      const fullDealerScore = calculateHandValue(fullDealerHand);
      setDealerHand(fullDealerHand); // Show both dealer cards now
      setDealerScore(fullDealerScore);
      setDealerHiddenCard(null); // Clear hidden card state

      if (fullDealerScore === 21) {
        setGameStatus('push');
        setMessage('Push! Both have Blackjack!');
        updateScore(0); // 0 points for push
      } else {
        setGameStatus('playerWins');
        setMessage('Blackjack! You win!');
        updateScore(bet); // +1 point for win (standard win, could adjust for BJ bonus)
      }
    }
  }, []);

  const dealCard = (target: 'player' | 'dealer') => {
    if (deck.length === 0) {
        console.error("Deck is empty!"); // Handle reshuffling if needed
        setMessage("Deck is empty!");
        return null;
    }
    const card = deck.pop()!;
    setDeck([...deck]); // Update deck state

    if (target === 'player') {
      setPlayerHand(prev => [...prev, card]);
      return card;
    } else {
      setDealerHand(prev => [...prev, card]);
      return card;
    }
  };

  const handleHit = () => {
    if (gameStatus !== 'playing') return;
    const newCard = dealCard('player');
    if (newCard) {
        const newScore = calculateHandValue([...playerHand, newCard]);
        setPlayerScore(newScore);
        if (newScore > 21) {
            setGameStatus('playerBusts');
            setMessage('You busted!');
            updateScore(bet * -1); // -1 point for loss
        }
    }
  };

  const handleStand = () => {
    if (gameStatus !== 'playing') return;

    // Reveal dealer's hidden card and add it to hand
    const currentDealerHand = [...dealerHand];
    if (dealerHiddenCard) {
        currentDealerHand.push(dealerHiddenCard);
        setDealerHand(currentDealerHand);
        setDealerHiddenCard(null);
    }

    const currentDealerScore = calculateHandValue(currentDealerHand);
    setDealerScore(currentDealerScore);

    // Dealer plays according to standard rules (hit until >= 17)
    const dealerPlay = async () => {
        let hand = [...currentDealerHand];
        let score = calculateHandValue(hand);

        while (score < 17) {
            await new Promise(resolve => setTimeout(resolve, 700)); // Pause for effect
            const newCard = dealCard('dealer');
            if (newCard) {
                hand = [...hand, newCard]; // Update local hand for loop condition
                // Note: dealCard already updates state, but we need score locally
                score = calculateHandValue(hand);
                setDealerHand(hand); // Update state explicitly for each draw
                setDealerScore(score);
            } else {
                break; // Stop if deck empty
            }
        }

        // Determine winner after dealer finishes
        determineWinner(playerScore, score);
    };

    dealerPlay();
  };

  const determineWinner = (pScore: number, dScore: number) => {
    if (pScore > 21) {
      setGameStatus('playerBusts');
      setMessage('You busted!');
      updateScore(bet * -1);
    } else if (dScore > 21) {
      setGameStatus('dealerWins'); // Dealer busting means player wins
      setMessage('Dealer busted! You win!');
      updateScore(bet);
    } else if (pScore > dScore) {
      setGameStatus('playerWins');
      setMessage('You win!');
      updateScore(bet);
    } else if (dScore > pScore) {
      setGameStatus('dealerWins');
      setMessage('Dealer wins!');
      updateScore(bet * -1);
    } else {
      setGameStatus('push');
      setMessage('Push!');
      updateScore(0);
    }
  };

  const resetBetting = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerScore(0);
    setDealerScore(0);
    setDealerHiddenCard(null);
    setGameStatus('betting');
    setMessage('Place your bet for the next round!');
    // Let parent know round ended so balance can update if necessary
    onGameEnd();
  };

  // Update score using Firebase function
  const updateScore = async (points: number) => {
    console.log(`Updating score by ${points} points.`); // DEBUG
    if (currentUser) {
      try {
        await updateGamePoints(currentUser.uid, points);
        console.log("Game points updated successfully.");
      } catch (error) {
        console.error("Error updating game points:", error);
        // Handle error appropriately, maybe notify user
      }
    }
  };

  // Handle placing the bet and starting the game
  const handleBet = () => {
      // Basic validation (can add balance check if available)
      if (bet <= 0) {
          setMessage("Please enter a valid bet amount.");
          return;
      }
      startGame(); // Start the game after bet is placed
  };

  // --- Render Logic ---

  const renderHand = (hand: Card[], isDealer = false) => (
    <div className="flex justify-center items-end flex-wrap gap-2 min-h-[10rem]">
      <AnimatePresence>
        {hand.map((card) => (
          <CardDisplay
            key={card.id}
            card={card}
            darkMode={darkMode}
          />
        ))}
        {isDealer && dealerHiddenCard && (
          <CardDisplay key="dealer-hidden" card={null} hidden darkMode={darkMode} />
        )}
      </AnimatePresence>
    </div>
  );

  const buttonStyle = `px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base shadow-md`;
  const primaryButtonStyle = darkMode
    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-500 hover:to-cyan-500'
    : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-400 hover:to-cyan-400';
  const secondaryButtonStyle = darkMode
    ? 'bg-gray-600 hover:bg-gray-500 text-white'
    : 'bg-gray-200 hover:bg-gray-300 text-gray-800';

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 md:p-6"> {/* Changed to flex column for vertical layout */}
      
      {/* Game Info Area */}
      <div className={`w-full text-center mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-800/70' : 'bg-white/80 shadow-sm'}`}>
        <p className="text-lg md:text-xl font-medium mb-1">{message}</p>
        {gameStatus !== 'betting' && (
            <div className="text-sm md:text-base">
                <span>Dealer Score: {dealerHiddenCard ? dealerScore : calculateHandValue(dealerHand)}</span>
                <span className="mx-3">|</span>
                <span>Your Score: {playerScore}</span>
             </div>
        )}
      </div>

      {/* Dealer Area */}
      <div className="w-full mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-2 text-center">Dealer&apos;s Hand</h2>
        {renderHand(dealerHand, true)}
      </div>

      {/* Player Area */}
      <div className="w-full mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-2 text-center">Your Hand</h2>
        {renderHand(playerHand)}
      </div>

      {/* Action/Betting Area */}
      <div className="mt-auto w-full flex flex-col items-center gap-3 md:gap-4">
        {gameStatus === 'betting' && (
          <div className="flex items-center gap-3">
            <label htmlFor="betAmount" className="font-semibold">Bet:</label>
            <input
              id="betAmount"
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, parseInt(e.target.value) || 1))} // Ensure positive bet
              min="1"
              className={`px-3 py-1 rounded border ${darkMode ? 'bg-gray-700 border-gray-500' : 'bg-white border-gray-300'} w-20 text-center`}
            />
            <button onClick={handleBet} className={`${buttonStyle} ${primaryButtonStyle}`}>Place Bet</button>
          </div>
        )}

        {gameStatus === 'playing' && (
          <div className="flex justify-center gap-3 md:gap-4">
            <button onClick={handleHit} className={`${buttonStyle} ${primaryButtonStyle}`}>Hit</button>
            <button onClick={handleStand} className={`${buttonStyle} ${secondaryButtonStyle}`}>Stand</button>
          </div>
        )}

        {(gameStatus === 'playerWins' || gameStatus === 'dealerWins' || gameStatus === 'push' || gameStatus === 'playerBusts') && (
          <button onClick={resetBetting} className={`${buttonStyle} ${primaryButtonStyle}`}>New Round</button>
        )}
      </div>
    </div>
  );
}
