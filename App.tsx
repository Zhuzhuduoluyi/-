
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { SoftShadows } from '@react-three/drei';
import { GameState, ItemType, FallingItemData, Particle } from './types';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_WIDTH, ITEM_SIZE, ITEM_CONFIG, SPAWN_RATE_MS, GRAVITY_BASE } from './constants';
import { Egg3D, Item3D, Particle3D } from './components/Models3D';
import { generateGameOverMessage, generateRewardRecipe } from './services/geminiService';
import { soundService } from './services/soundService';

// --- Constants for 3D Mapping ---
// We map the internal 800x600 logic to a 3D coordinate system approx -10 to 10 width
const VIEWPORT_WIDTH = 22; 
const PIXEL_TO_3D = VIEWPORT_WIDTH / GAME_WIDTH; 
const FLOOR_Y = -5; // Move floor up slightly for better framing

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
  const hasCaughtRef = useRef(false); 

  // --- Sound Control ---
  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const muted = soundService.toggleMute();
    setIsMuted(muted);
  }, []);

  // --- Game Loop ---

  const spawnItem = useCallback(() => {
    const types = Object.values(ItemType);
    const rand = Math.random();
    let type = ItemType.CROISSANT;
    
    if (rand > 0.9) type = ItemType.ROCK;
    else if (rand > 0.8) type = ItemType.BURNT_TOAST;
    else if (rand > 0.5) type = ItemType.BAGUETTE;
    else type = ItemType.CROISSANT;

    const speedMultiplier = 1 + (score / 100); 

    const newItem: FallingItemData = {
      id: Date.now() + Math.random(),
      x: Math.random() * (GAME_WIDTH - ITEM_SIZE),
      y: -ITEM_SIZE * 4, // Spawn higher up to give more time
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

    // 1. Move Player
    setPlayerX(prev => {
      const nextX = prev + (targetXRef.current - prev) * 0.15;
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

        // Collision Logic Adjusted for 3D Visuals
        // Visual Basket Y calculation matched to 3D model
        const catchZoneY = 460;
        
        const hitPlayer = 
          item.y > catchZoneY && 
          item.y < catchZoneY + 50 && // Height of collision box
          item.x + ITEM_SIZE > targetXRef.current - 10 && // Wider catch range left
          item.x < targetXRef.current + PLAYER_WIDTH + 10; // Wider catch range right

        if (hitPlayer) {
          const config = ITEM_CONFIG[item.type];
          
          if (item.type === ItemType.ROCK) {
             soundService.playBad();
             setLives(l => {
               if (l <= 1) setGameState(GameState.GAME_OVER);
               return l - 1;
             });
          } else if (item.type === ItemType.BURNT_TOAST) {
             soundService.playBad();
             setScore(s => Math.max(0, s + config.score));
          } else {
             soundService.playCatch();
             setScore(s => s + config.score);
             hasCaughtRef.current = true;
             setTimeout(() => { hasCaughtRef.current = false; }, 150);
          }
          
          createExplosion(item.x, item.y, config.color);
          return; // Remove item
        }

        // Remove if falls below floor
        if (item.y > GAME_HEIGHT + 100) { 
           if (item.type !== ItemType.ROCK && item.type !== ItemType.BURNT_TOAST) {
             setScore(s => Math.max(0, s - 2));
           }
           return; 
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

  // --- Input ---

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
    
    const clampedX = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, relativeX * (GAME_WIDTH / rect.width) - PLAYER_WIDTH / 2));
    targetXRef.current = clampedX;
  };

  // --- Game State Helpers ---

  const startGame = () => {
    soundService.playStart();
    setScore(0);
    setLives(3);
    setItems([]);
    setParticles([]);
    setGameState(GameState.PLAYING);
    setPlayerX(GAME_WIDTH / 2 - PLAYER_WIDTH / 2);
    setAiMessage("");
    setAiRecipe("");
  };

  useEffect(() => {
    if (gameState === GameState.GAME_OVER) {
       soundService.playGameOver();
       // Trigger AI generation
       setGameState(GameState.LOADING_AI);
       Promise.all([
         generateGameOverMessage(score),
         generateRewardRecipe(score)
       ]).then(([msg, recipe]) => {
         setAiMessage(msg);
         setAiRecipe(recipe);
         setGameState(GameState.GAME_OVER);
       });
    }
  }, [gameState, score]);

  // Coordinate mapping helper
  const pixelTo3DX = (x: number) => ((x / GAME_WIDTH) * VIEWPORT_WIDTH) - (VIEWPORT_WIDTH / 2) + (PLAYER_WIDTH * PIXEL_TO_3D / 2);

  // Map logic Y to 3D Y. 
  // Logic Y=0 (Top) maps to 3D Y=8
  // 3D scale is roughly 0.0275 unit per pixel
  const pixelTo3DY = (y: number) => 8 - (y * PIXEL_TO_3D);

  return (
    <div 
      ref={gameContainerRef}
      className="relative w-full h-full bg-[#fdf6e3] overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      onClick={() => soundService.init()}
    >
        {/* 3D Scene */}
        <Canvas shadows camera={{ position: [0, 2, 12], fov: 50 }}>
           <color attach="background" args={['#fdf6e3']} />
           <ambientLight intensity={0.8} />
           <directionalLight 
             position={[5, 10, 5]} 
             intensity={1} 
             castShadow 
             shadow-mapSize={[1024, 1024]} 
           />
           <SoftShadows size={10} samples={10} />
           
           <group position={[0, FLOOR_Y, 0]}>
             {/* Floor */}
             <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
               <planeGeometry args={[100, 100]} />
               <shadowMaterial transparent opacity={0.2} />
             </mesh>
           </group>

           <Egg3D 
              position={[pixelTo3DX(playerX), FLOOR_Y, -1]} 
              isMovingLeft={isMovingLeft.current}
              isMovingRight={isMovingRight.current}
              hasCaught={hasCaughtRef.current}
           />

           {items.map(item => (
             <Item3D 
               key={item.id}
               position={[pixelTo3DX(item.x), pixelTo3DY(item.y), 0]}
               type={item.type}
               rotationZ={item.rotation}
             />
           ))}

           {particles.map(p => (
             <Particle3D 
               key={p.id} 
               x={pixelTo3DX(p.x)} 
               y={pixelTo3DY(p.y)} 
               color={p.color} 
               life={p.life}
             />
           ))}

        </Canvas>

        {/* UI Overlay */}
        <div className="absolute top-4 left-4 text-2xl font-bold text-[#5D4037]">
           Score: {score}
        </div>
        <div className="absolute top-4 right-4 text-2xl font-bold text-[#5D4037]">
           Lives: {'❤️'.repeat(lives)}
        </div>
        
        {/* Mute Button */}
        <button 
          onClick={toggleMute}
          className="absolute bottom-4 right-4 p-2 bg-white/80 rounded-full shadow hover:bg-white"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        {/* Menu Overlay */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center border-4 border-[#eebb4d] max-w-md">
              <h1 className="text-4xl font-bold text-[#8B4513] mb-2">Eggie's Bakery</h1>
              <p className="text-gray-600 mb-6">Help Eggie catch fresh bread!</p>
              
              <div className="flex justify-center gap-4 mb-8 text-sm text-gray-500">
                <div className="flex flex-col items-center"><span>🥐</span><span>+10</span></div>
                <div className="flex flex-col items-center"><span>🥖</span><span>+15</span></div>
                <div className="flex flex-col items-center"><span>🍞</span><span>+5</span></div>
                <div className="flex flex-col items-center"><span>🍘</span><span>Avoid</span></div>
                <div className="flex flex-col items-center"><span>🪨</span><span>Hurt</span></div>
              </div>

              <button 
                onClick={startGame}
                className="px-8 py-3 bg-[#eebb4d] hover:bg-[#d4a248] text-white font-bold rounded-full text-xl transition-transform hover:scale-105 shadow-md"
              >
                Start Baking
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {(gameState === GameState.GAME_OVER || gameState === GameState.LOADING_AI) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-20">
             <div className="bg-white p-8 rounded-2xl shadow-2xl text-center border-4 border-[#eebb4d] max-w-md w-full mx-4">
                <h2 className="text-3xl font-bold text-[#8B4513] mb-4">Oven's Closed!</h2>
                <div className="text-5xl font-bold text-[#eebb4d] mb-6">{score} pts</div>
                
                {gameState === GameState.LOADING_AI ? (
                  <div className="animate-pulse text-gray-500 mb-6">Eggie is writing a message...</div>
                ) : (
                  <>
                    <div className="bg-[#fdf6e3] p-4 rounded-xl mb-4 text-left">
                      <p className="text-sm font-bold text-[#8B4513] mb-1">Eggie says:</p>
                      <p className="text-gray-700 italic">"{aiMessage}"</p>
                    </div>
                    {aiRecipe && (
                      <div className="bg-[#fdf6e3] p-4 rounded-xl mb-6 text-left text-sm">
                        <p className="font-bold text-[#8B4513] mb-1">Unlock Reward:</p>
                        <div className="text-gray-700 whitespace-pre-wrap">{aiRecipe}</div>
                      </div>
                    )}
                  </>
                )}

                <button 
                  onClick={startGame}
                  className="px-8 py-3 bg-[#eebb4d] hover:bg-[#d4a248] text-white font-bold rounded-full text-xl transition-transform hover:scale-105 shadow-md"
                >
                  Bake Again
                </button>
             </div>
          </div>
        )}
    </div>
  );
};

export default App;
