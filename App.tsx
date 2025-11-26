
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, ItemType, FallingItemData, Particle } from './types';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, ITEM_SIZE, ITEM_CONFIG, SPAWN_RATE_MS, GRAVITY_BASE } from './constants';
import EggCharacter from './components/EggCharacter';
import FallingItem from './components/FallingItem';
import { generateGameOverMessage, generateRewardRecipe } from './services/geminiService';
import { soundService } from './services/soundService';

const App: React.FC = () => {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [items, setItems] = useState<FallingItemData[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2 - PLAYER_WIDTH / 2);
  const [aiMessage, setAiMessage] = useState<string>("");
  const [aiRecipe, setAiRecipe] = useState<string>("");
  const [isMuted, setIsMuted] = useState(soundService.getMuted());
  
  // Animation Refs
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Movement Refs
  const targetXRef = useRef(GAME_WIDTH / 2 - PLAYER_WIDTH / 2);
  const isMovingLeft = useRef(false);
  const isMovingRight = useRef(false);
  const hasCaughtRef = useRef(false); // For catch animation

  // --- Sound Control ---
  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const muted = soundService.toggleMute();
    setIsMuted(muted);
  }, []);

  // --- Game Loop ---

  const spawnItem = useCallback(() => {
    const types = Object.values(ItemType);
    // Weighted random: Less rocks/burnt toast
    const rand = Math.random();
    let type = ItemType.CROISSANT;
    
    if (rand > 0.9) type = ItemType.ROCK;
    else if (rand > 0.8) type = ItemType.BURNT_TOAST;
    else if (rand > 0.5) type = ItemType.BAGUETTE;
    else type = ItemType.CROISSANT;

    // Increase difficulty by speed
    const speedMultiplier = 1 + (score / 100); 

    const newItem: FallingItemData = {
      id: Date.now() + Math.random(),
      x: Math.random() * (GAME_WIDTH - ITEM_SIZE),
      y: -ITEM_SIZE,
      type,
      rotation: Math.random() * 360,
      speed: (Math.random() * 2 + GRAVITY_BASE) * speedMultiplier,
    };

    setItems(prev => [...prev, newItem]);
  }, [score]);

  const createExplosion = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const updateGame = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING) return;

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // 1. Move Player (Smooth LERP)
    setPlayerX(prev => {
      const nextX = prev + (targetXRef.current - prev) * 0.15;
      // Determine direction for animation
      isMovingLeft.current = nextX < prev - 0.5;
      isMovingRight.current = nextX > prev + 0.5;
      return nextX;
    });

    // 2. Spawn Items
    if (time - spawnTimerRef.current > Math.max(200, SPAWN_RATE_MS - score * 5)) {
      spawnItem();
      spawnTimerRef.current = time;
    }

    // 3. Update Items & Collision
    setItems(prevItems => {
      const nextItems: FallingItemData[] = [];
      
      prevItems.forEach(item => {
        item.y += item.speed;
        item.rotation += 1;

        // Collision with Player Basket (Approximate hitbox)
        const basketY = GAME_HEIGHT - PLAYER_HEIGHT + 60; // Basket height offset
        
        const hitPlayer = 
          item.y + ITEM_SIZE > basketY &&
          item.y < basketY + 40 && // Thin catching zone
          item.x + ITEM_SIZE > targetXRef.current && 
          item.x < targetXRef.current + PLAYER_WIDTH;

        if (hitPlayer) {
          // Handle Hit
          const config = ITEM_CONFIG[item.type];
          
          if (item.type === ItemType.ROCK) {
             soundService.playBad();
             setLives(l => {
               if (l <= 1) setGameState(GameState.GAME_OVER);
               return l - 1;
             });
             // Screen shake effect could go here
          } else if (item.type === ItemType.BURNT_TOAST) {
             soundService.playBad();
             setScore(s => Math.max(0, s + config.score));
             // No life lost, but bad score and bad sound
          } else {
             soundService.playCatch();
             setScore(s => s + config.score);
             hasCaughtRef.current = true;
             setTimeout(() => { hasCaughtRef.current = false; }, 150);
          }
          
          createExplosion(item.x, item.y, config.color);
          return; // Remove item
        }

        // Missed Item
        if (item.y > GAME_HEIGHT) {
           if (item.type !== ItemType.ROCK && item.type !== ItemType.BURNT_TOAST) {
             // Dropped good food
             // Changed: No longer lose lives for missing. Just a small score penalty.
             setScore(s => Math.max(0, s - 2));
           }
           return; // Remove item
        }

        nextItems.push(item);
      });

      return nextItems;
    });

    // 4. Update Particles
    setParticles(prev => prev.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 0.05
    })).filter(p => p.life > 0));

    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState, score, spawnItem]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(updateGame);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, updateGame]);

  // --- Input Handling ---

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== GameState.PLAYING || !gameContainerRef.current) return;
    
    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    const rect = gameContainerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    
    // Clamp
    const clampedX = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, relativeX * (GAME_WIDTH / rect.width) - PLAYER_WIDTH / 2));
    targetXRef.current = clampedX;
  };

  // --- Game State Management ---

  const startGame = () => {
    soundService.init();
    soundService.playStart();
    setScore(0);
    setLives(3);
    setItems([]);
    setParticles([]);
    setAiMessage("");
    setAiRecipe("");
    setGameState(GameState.PLAYING);
    lastTimeRef.current = performance.now();
  };

  const handleGameOver = useCallback(async () => {
    soundService.playGameOver();
    setGameState(GameState.LOADING_AI);
    const [message, recipe] = await Promise.all([
      generateGameOverMessage(score),
      score > 50 ? generateRewardRecipe(score) : Promise.resolve("")
    ]);
    setAiMessage(message);
    setAiRecipe(recipe);
    setGameState(GameState.GAME_OVER);
  }, [score]);

  // Watch for Game Over trigger from the loop (state change)
  useEffect(() => {
    if (gameState === GameState.GAME_OVER && !aiMessage) {
        handleGameOver();
    }
  }, [gameState, aiMessage, handleGameOver]);


  // --- Render ---

  return (
    <div className="min-h-screen w-full bg-orange-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Main Game Container */}
      <div 
        ref={gameContainerRef}
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-orange-200"
        style={{ 
          width: '100%', 
          maxWidth: `${GAME_WIDTH}px`, 
          aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`,
          cursor: gameState === GameState.PLAYING ? 'none' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-10 left-10 text-6xl opacity-10 rotate-12">🥖</div>
        <div className="absolute top-40 right-20 text-6xl opacity-10 -rotate-12">🥐</div>
        <div className="absolute bottom-20 left-1/4 text-6xl opacity-10 rotate-45">🍞</div>

        {/* Game World */}
        {items.map(item => (
          <FallingItem key={item.id} {...item} size={ITEM_SIZE} />
        ))}

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: p.x,
              top: p.y,
              width: 8,
              height: 8,
              backgroundColor: p.color,
              opacity: p.life,
              transform: `scale(${p.life})`
            }}
          />
        ))}

        {/* Player Character */}
        <div 
          className="absolute bottom-0 pointer-events-none will-change-transform"
          style={{ 
            left: playerX, 
            width: PLAYER_WIDTH, 
            height: PLAYER_HEIGHT,
          }}
        >
          <EggCharacter 
            width={PLAYER_WIDTH} 
            height={PLAYER_HEIGHT} 
            isMovingLeft={isMovingLeft.current}
            isMovingRight={isMovingRight.current}
            hasCaught={hasCaughtRef.current}
          />
        </div>

        {/* HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start no-select z-20">
          <div className="flex gap-4 text-2xl font-bold text-orange-800">
            <div className="bg-white/80 px-4 py-2 rounded-full shadow-sm border border-orange-100">
              Score: {score}
            </div>
            <div className="bg-white/80 px-4 py-2 rounded-full shadow-sm border border-orange-100">
              Lives: {'❤️'.repeat(lives)}
            </div>
          </div>
          
          {/* Mute Button */}
          <button 
            onClick={toggleMute}
            className="bg-white/80 p-2 rounded-full shadow-sm border border-orange-100 text-xl hover:bg-orange-50 transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Menus / Overlays */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-orange-100/90 flex flex-col items-center justify-center p-8 text-center z-10">
            <h1 className="text-5xl md:text-6xl font-black text-orange-600 mb-4 drop-shadow-sm">
              Eggie's Bakery Catch
            </h1>
            <p className="text-xl text-orange-800 mb-8 max-w-md">
              Catch fresh bread to score points!<br/>
              <span className="text-red-500 font-bold">Avoid Rocks</span> (they take a life).
              <br/>
              <span className="text-sm opacity-75 mt-2 block">(Move your mouse or drag to play)</span>
            </p>
            <div className="mb-8">
               <EggCharacter width={150} height={180} isMovingLeft={false} isMovingRight={false} hasCaught={false} />
            </div>
            <button 
              onClick={startGame}
              className="bg-orange-500 hover:bg-orange-600 text-white text-2xl font-bold py-4 px-12 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95"
            >
              Start Baking!
            </button>
          </div>
        )}

        {(gameState === GameState.GAME_OVER || gameState === GameState.LOADING_AI) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-10 animate-fade-in">
            <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full border-4 border-orange-300">
              <h2 className="text-4xl font-bold text-gray-800 mb-2">Game Over</h2>
              <p className="text-2xl font-semibold text-orange-600 mb-6">Final Score: {score}</p>
              
              {gameState === GameState.LOADING_AI ? (
                <div className="flex flex-col items-center gap-4 mb-6">
                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                   <p className="text-gray-500 italic">Eggie is thinking of something nice to say...</p>
                </div>
              ) : (
                <div className="bg-orange-50 rounded-xl p-6 mb-6 relative overflow-hidden">
                  <div className="absolute -top-2 -left-2 text-4xl opacity-20">❝</div>
                  <p className="text-lg text-gray-700 italic font-medium relative z-10">
                    {aiMessage}
                  </p>
                  <div className="absolute -bottom-4 -right-2 text-4xl opacity-20">❞</div>
                </div>
              )}

              {aiRecipe && (
                <div className="text-left bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 text-sm text-yellow-900">
                  <strong className="block mb-1 text-yellow-700">🏆 Recipe Reward!</strong>
                  <div className="prose prose-sm prose-yellow">
                    <pre className="whitespace-pre-wrap font-sans">{aiRecipe}</pre>
                  </div>
                </div>
              )}

              <button 
                onClick={startGame}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold py-3 px-8 rounded-xl shadow-md transform transition hover:scale-105"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-2 text-orange-300 text-xs">
        Powered by React & Gemini AI
      </div>
    </div>
  );
};

export default App;
