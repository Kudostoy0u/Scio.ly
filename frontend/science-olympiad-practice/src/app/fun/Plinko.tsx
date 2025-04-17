'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { updateGamePoints } from '@/app/utils/gamepoints';

// --- Game Constants ---
const ROWS = 8; // Number of peg rows
const BUCKET_MULTIPLIERS = [5, 2, 0, 0, 0, 2, 5]; // Multipliers for the buckets from left to right
const GRAVITY = 0.9; // Gravity constant
const PEG_RADIUS = 1; // Radius of a peg (half of peg width/height)
const BALL_RADIUS = 15; // Radius of the ball (half of ball width/height)
const DAMPING = 0.4; // Reduced damping factor for bounce (was 0.7)
const MIN_VELOCITY = 0.5; // Minimum velocity to prevent sticking
const WALL_DAMPING = 0.3; // Reduced damping factor for wall collisions (was 0.8)

interface PlinkoGameProps {
  onGameEnd: () => void; // Callback to notify parent when a game round ends
}

interface Position {
  x: number;
  y: number;
}

interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// --- Main Game Component ---

export default function PlinkoGame({ onGameEnd }: PlinkoGameProps) {
  const { darkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [gameStatus, setGameStatus] = useState<'betting' | 'dropping' | 'finished'>('betting');
  const [message, setMessage] = useState('Place your bet!');
  const [bet, setBet] = useState(1);
  const [finalMultiplier, setFinalMultiplier] = useState<number | null>(null);
  const [pegLayout, setPegLayout] = useState<Position[][]>([]); // Store peg positions
  const [ballState, setBallState] = useState<BallState | null>(null); // Ball position and velocity
  const animationFrameRef = useRef<number | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Calculate peg positions (only once on mount or when ROWS changes)
  useEffect(() => {
    const layout: Position[][] = [];
    const spacing = 50; // Adjust as needed for visual spacing
    // Calculate board width first for centering calculations
    const calculatedBoardWidth = (ROWS + 1) * spacing; // Width based on the bottom row + spacing
    const startY = spacing; // Start pegs one spacing unit down

    // Start from row 1 instead of 0 to skip the topmost peg
    for (let row = 1; row < ROWS; row++) {
      const rowPegs: Position[] = [];
      const numPegsInRow = row + 1; // Number of pegs in the current row (starts with 2)
      const rowY = startY + row * spacing;
      // Center each row based on the calculated board width and the *actual* number of pegs in that row
      const rowWidth = (numPegsInRow - 1) * spacing;
      const rowStartX = (calculatedBoardWidth - rowWidth) / 2;
      for (let i = 0; i < numPegsInRow; i++) {
        rowPegs.push({ x: rowStartX + i * spacing, y: rowY });
      }
      layout.push(rowPegs);
    }
    setPegLayout(layout);
    console.log("Peg Layout:", layout); // Debug
  }, []); // Recalculate if ROWS changes, though it's constant here

  // Physics loop for ball movement
  useEffect(() => {
    if (gameStatus !== 'dropping' || !ballState) return;

    const updatePhysics = () => {
      if (!ballState) return;

      // Calculate new velocity and position
      const newVy = ballState.vy + GRAVITY;
      const newX = ballState.x + ballState.vx;
      const newY = ballState.y + newVy;

      // Check for collisions with walls
      const boardWidth = (ROWS + 1) * 50;
      let finalVx = ballState.vx;
      let finalVy = newVy;
      let collisionX = newX;
      let collisionY = newY;

      // Left wall collision
      if (newX - BALL_RADIUS < 0) {
        collisionX = BALL_RADIUS;
        finalVx = -ballState.vx * WALL_DAMPING;
      }
      // Right wall collision
      else if (newX + BALL_RADIUS > boardWidth) {
        collisionX = boardWidth - BALL_RADIUS;
        finalVx = -ballState.vx * WALL_DAMPING;
      }
      // Top wall collision
      if (newY - BALL_RADIUS < 0) {
        collisionY = BALL_RADIUS;
        finalVy = -newVy * WALL_DAMPING;
      }

      // Check for collisions with pegs
      let collided = false;
      for (const row of pegLayout) {
        for (const peg of row) {
          const dx = collisionX - peg.x;
          const dy = collisionY - peg.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < PEG_RADIUS + BALL_RADIUS) {
            collided = true;
            
            // Calculate collision normal (direction from peg to ball)
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Calculate relative velocity
            const relativeVx = finalVx;
            const relativeVy = finalVy;
            
            // Calculate impulse (bounce) along normal
            const impulse = 2 * (relativeVx * nx + relativeVy * ny);
            
            // Apply bounce with damping
            finalVx = (relativeVx - impulse * nx) * DAMPING;
            finalVy = (relativeVy - impulse * ny) * DAMPING;
            
            // Ensure minimum velocity to prevent sticking
            const speed = Math.sqrt(finalVx * finalVx + finalVy * finalVy);
            if (speed < MIN_VELOCITY) {
              const scale = MIN_VELOCITY / speed;
              finalVx *= scale;
              finalVy *= scale;
            }
            
            // Move ball away from collision point
            const overlap = (PEG_RADIUS + BALL_RADIUS) - distance;
            collisionX = collisionX + nx * overlap;
            collisionY = collisionY + ny * overlap;
            
            break;
          }
        }
        if (collided) break;
      }

      setBallState({ x: collisionX, y: collisionY, vx: finalVx, vy: finalVy });

      // Check if ball has entered a bucket
      const bucketWidth = 50; // Should match spacing
      const numBuckets = BUCKET_MULTIPLIERS.length;
      const firstBucketCenterX = boardWidth / 2 - ((numBuckets - 1) / 2) * bucketWidth;
      const bucketY = (ROWS + 1) * 50; // Position below last pegs

      if (newY >= bucketY) {
        // Ball has reached bucket level, determine which bucket
        let finalBucketIndex = Math.floor((newX - (firstBucketCenterX - bucketWidth / 2)) / bucketWidth);
        finalBucketIndex = Math.max(0, Math.min(BUCKET_MULTIPLIERS.length - 1, finalBucketIndex));
        const landedMultiplier = BUCKET_MULTIPLIERS[finalBucketIndex];
        const winnings = bet * landedMultiplier;

        setFinalMultiplier(landedMultiplier);
        if (landedMultiplier > 0) {
          setMessage(`You won ${winnings} points! (x${landedMultiplier})`);
          updateScore(winnings);
        } else {
          setMessage(`Landed in x${landedMultiplier}. Better luck next time!`);
          updateScore(bet * -1);
        }
        setGameStatus('finished');
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gameStatus, ballState, pegLayout, bet]);

  const handleDropBall = () => {
    if (gameStatus !== 'betting' || bet <= 0) {
      setMessage("Place a valid bet first.");
      return;
    }
    setMessage('Ball dropping...');
    setGameStatus('dropping');
    setFinalMultiplier(null);

    // Initialize ball at top center with more initial horizontal velocity
    const boardWidth = (ROWS + 1) * 50;
    const startX = boardWidth / 2;
    const startY = 0;
    const startVx = (Math.random() - 0.5) * 2; // Increased initial horizontal velocity
    const startVy = 0;

    setBallState({ x: startX, y: startY, vx: startVx, vy: startVy });
  };

  // Update score using Firebase function
  const updateScore = async (points: number) => {
    console.log(`Updating score by ${points} points.`); // DEBUG
    if (currentUser && points !== 0) {
      try {
        await updateGamePoints(currentUser.uid, points);
        console.log("Game points updated successfully.");
      } catch (error) {
        console.error("Error updating game points:", error);
        setMessage("Error updating score. Please try again.");
      }
    } else if (!currentUser) {
      console.warn("User not logged in, score not updated.");
    }
  };

  const resetGame = () => {
    setGameStatus('betting');
    setMessage('Place your bet for the next round!');
    setBallState(null);
    setFinalMultiplier(null);
    onGameEnd();
  };

  // --- Render Logic ---

  const buttonStyle = `px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base shadow-md`;
  const primaryButtonStyle = darkMode
    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-500 hover:to-cyan-500'
    : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-400 hover:to-cyan-400';

  const boardWidth = (ROWS + 2) * 50; // Calculate board width based on pegs/spacing
  const boardHeight = (ROWS + 2) * 50; // Similar height

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 md:p-6">

      {/* Game Info Area */}
      <div className={`w-full max-w-md text-center mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-800/70' : 'bg-white/80 shadow-sm'}`}>
        <p className="text-lg md:text-xl font-medium mb-1">{message}</p>
        {finalMultiplier !== null && gameStatus === 'finished' && (
          <p className="text-md md:text-lg font-semibold">Landed in: x{finalMultiplier}</p>
        )}
      </div>

      {/* Plinko Board Area */}
      <div className="relative mb-6 mx-auto" style={{ width: boardWidth, height: boardHeight }}>
        {/* Walls */}
        <div className={`absolute inset-0 border-2 ${darkMode ? 'border-gray-600' : 'border-gray-400'} rounded-lg`} />
        
        {/* Pegs */}
        {pegLayout.flat().map((peg, index) => (
          <div
            key={`peg-${index}`}
            className={`absolute w-2 h-2 rounded-full ${darkMode ? 'bg-gray-400' : 'bg-gray-600'}`}
            style={{ left: peg.x + 20, top: peg.y - 4 }}
          />
        ))}

        {/* Buckets */}
        {BUCKET_MULTIPLIERS.map((multiplier, index) => {
          const bucketWidth = 50; // Should match spacing
          const numBuckets = BUCKET_MULTIPLIERS.length;
          // Use boardWidth for centering buckets correctly
          const firstBucketCenterX = boardWidth / 2 - ((numBuckets - 1) / 2) * bucketWidth;
          const bucketX = firstBucketCenterX + index * bucketWidth - bucketWidth / 2;
          const bucketY = (ROWS + 1) * 50; // Position below last pegs

          return (
            <div
              key={`bucket-${index}`}
              className={`absolute bottom-0 border-t-2 ${darkMode ? 'border-gray-500' : 'border-gray-400'} flex items-center justify-center text-xs font-semibold`}
              style={{
                left: bucketX,
                top: bucketY,
                width: bucketWidth,
                height: bucketWidth, // Make buckets square for now
                // Add borders between buckets maybe
                borderLeft: index !== 0 ? (darkMode ? '1px solid #6B7280' : '1px solid #D1D5DB') : undefined,
              }}
            >
              x{multiplier}
            </div>
          );
        })}

        {/* Ball */}
        {ballState && (
          <motion.div
            className={`absolute w-4 h-4 rounded-full ${darkMode ? 'bg-yellow-400' : 'bg-red-500'} border ${darkMode ? 'border-yellow-200' : 'border-red-700'} shadow-lg`}
            style={{
              left: ballState.x - 8,
              top: ballState.y - 8,
            }}
          />
        )}
      </div>

      {/* Action/Betting Area */}
      <div className="mt-auto w-full max-w-sm flex flex-col items-center gap-3 md:gap-4">
        {gameStatus === 'betting' && (
          <div className="flex items-center gap-3">
            <label htmlFor="betAmount" className="font-semibold">Bet:</label>
            <input
              id="betAmount"
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className={`px-3 py-1 rounded border ${darkMode ? 'bg-gray-700 border-gray-500' : 'bg-white border-gray-300'} w-20 text-center`}
            />
            <button onClick={handleDropBall} className={`${buttonStyle} ${primaryButtonStyle}`}>Drop Ball</button>
          </div>
        )}

        {gameStatus === 'dropping' && (
          <p className="text-lg font-semibold animate-pulse">Dropping...</p>
        )}

        {gameStatus === 'finished' && (
          <button onClick={resetGame} className={`${buttonStyle} ${primaryButtonStyle}`}>New Round</button>
        )}
      </div>
    </div>
  );
}
