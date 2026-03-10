/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Trophy, RotateCcw, Play } from 'lucide-react';

const DUCK_SIZE = 80;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

interface Duck {
  x: number;
  y: number;
  id: number;
  status: 'flying' | 'hit' | 'escaped';
  direction: number;
  speed: number;
}

export default function App() {
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [bullets, setBullets] = useState(5);
  const [isReloading, setIsReloading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [ducks, setDucks] = useState<Duck[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Calculate speed based on score: starts at 4s, decreases by 0.3s every 100 points
  const getDuckDuration = useCallback((currentScore: number) => {
    const baseDuration = 4.0;
    const reduction = Math.floor(currentScore / 100) * 0.3;
    return Math.max(1.5, baseDuration - reduction);
  }, []);

  const spawnDuck = useCallback(() => {
    const numToSpawn = Math.random() > 0.5 ? 2 : 1;
    const newDucks: Duck[] = [];
    const duration = getDuckDuration(score);

    for (let i = 0; i < numToSpawn; i++) {
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const startX = side === 'left' ? -DUCK_SIZE : GAME_WIDTH;
      const startY = Math.random() * (GAME_HEIGHT - 350) + 50;
      
      newDucks.push({
        x: startX,
        y: startY,
        id: Date.now() + i,
        status: 'flying',
        direction: side === 'left' ? 1 : -1,
        speed: duration
      });
    }
    setDucks(newDucks);
  }, [score, getDuckDuration]);

  const reload = useCallback(() => {
    if (isReloading) return;
    setIsReloading(true);
    setTimeout(() => {
      setBullets(5);
      setIsReloading(false);
    }, 1200);
  }, [isReloading]);

  const handleShoot = (e: React.MouseEvent) => {
    if (!gameStarted || gameOver || isReloading) return;
    
    if (bullets > 0) {
      setBullets(prev => {
        const newCount = prev - 1;
        if (newCount === 0) reload();
        return newCount;
      });
    } else {
      reload();
    }
  };

  const hitDuck = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!gameStarted || gameOver || isReloading || bullets <= 0) return;

    setDucks(prev => prev.map(d => {
      if (d.id === id && d.status === 'flying') {
        setScore(s => s + 10);
        return { ...d, status: 'hit' };
      }
      return d;
    }));

    setBullets(prev => {
      const newCount = prev - 1;
      if (newCount === 0) reload();
      return newCount;
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameContainerRef.current) {
        const rect = gameContainerRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Handle duck escape logic
  useEffect(() => {
    if (gameStarted && !gameOver && ducks.some(d => d.status === 'flying')) {
      const flyingDucks = ducks.filter(d => d.status === 'flying');
      const timers = flyingDucks.map(d => setTimeout(() => {
        setDucks(prev => prev.map(pd => {
          if (pd.id === d.id && pd.status === 'flying') {
            setMisses(m => m + 1);
            return { ...pd, status: 'escaped' };
          }
          return pd;
        }));
      }, d.speed * 1000));

      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [gameStarted, gameOver, ducks]);

  // Handle respawn logic
  useEffect(() => {
    if (gameStarted && !gameOver && ducks.length > 0 && ducks.every(d => d.status !== 'flying')) {
      const timer = setTimeout(() => {
        spawnDuck();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [ducks, gameStarted, gameOver, spawnDuck]);

  useEffect(() => {
    if (misses >= 10) {
      setGameOver(true);
    }
  }, [misses]);

  const startGame = () => {
    setScore(0);
    setMisses(0);
    setBullets(5);
    setIsReloading(false);
    setGameOver(false);
    setGameStarted(true);
    spawnDuck();
  };

  // Calculate weapon rotation to point at mouse
  const weaponRotation = (() => {
    const weaponX = GAME_WIDTH + 48;
    const weaponY = GAME_HEIGHT + 96;
    const dx = mousePos.x - weaponX;
    const dy = mousePos.y - weaponY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Rifle points left (180 deg) by default.
    // Adding 180 to angle gives 0 (left) to 90 (up).
    const rotation = angle + 180;
    return Math.max(0, Math.min(85, rotation)); 
  })();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-mono select-none overflow-hidden">
      <div 
        ref={gameContainerRef}
        className="relative overflow-hidden bg-sky-400 border-8 border-zinc-800 shadow-2xl cursor-none"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onClick={handleShoot}
      >
        {/* Sky Elements */}
        <div className="absolute top-10 left-10 w-24 h-10 bg-white opacity-60 rounded-full blur-md" />
        <div className="absolute top-32 right-32 w-40 h-16 bg-white opacity-40 rounded-full blur-lg" />
        <div className="absolute top-60 left-1/2 w-20 h-8 bg-white opacity-30 rounded-full blur-sm" />

        {/* Score Board */}
        <div className="absolute top-4 left-4 z-40 flex gap-4">
          <div className="bg-zinc-900/90 text-white px-4 py-2 border-2 border-zinc-700 flex items-center gap-2 rounded-sm shadow-lg">
            <Trophy size={18} className="text-yellow-400" />
            <span className="text-lg font-bold">PUNTUACIÓN: {score.toString().padStart(6, '0')}</span>
          </div>
        </div>

        {/* Ammo Display (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ 
                  opacity: i < bullets ? 1 : 0.2,
                  scale: i < bullets ? 1 : 0.8,
                  y: i < bullets ? 0 : 10
                }}
                className="w-4 h-10 bg-yellow-600 border-2 border-zinc-900 rounded-t-sm relative"
              >
                <div className="absolute top-0 w-full h-2 bg-yellow-400" />
              </motion.div>
            ))}
          </div>
          <div className="bg-zinc-900/90 text-white px-4 py-1 border-2 border-zinc-700 rounded-sm font-bold">
            MUNICIÓN: {bullets}/5
          </div>
        </div>

        {/* Reloading Animation */}
        <AnimatePresence>
          {isReloading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bottom-40 right-10 z-50 bg-red-600 text-white px-6 py-2 font-black italic border-4 border-white shadow-xl flex items-center gap-2"
            >
              <RotateCcw className="animate-spin" />
              RECARGANDO...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hunting Weapon (Visual) */}
        <motion.div 
          animate={
            isReloading 
              ? { rotate: [weaponRotation, weaponRotation - 20, weaponRotation], y: [0, 15, 0] } 
              : ducks.some(d => d.status === 'hit') 
                ? { rotate: [weaponRotation, weaponRotation - 10, weaponRotation], y: [0, -10, 0], x: [0, 5, 0] }
                : { rotate: weaponRotation, y: 0, x: 0 }
          }
          transition={{ duration: isReloading ? 0.6 : 0.1 }}
          className="absolute -bottom-24 -right-12 z-40 pointer-events-none"
        >
          {/* Classic Hunting Rifle */}
          <div className="relative w-96 h-40 origin-bottom-right flex items-end justify-end p-4">
            {/* Stock (Wood) */}
            <div className="absolute bottom-0 right-0 w-48 h-20 bg-orange-950 border-4 border-black rounded-r-xl rounded-l-3xl shadow-2xl" />
            <div className="absolute bottom-6 right-24 w-32 h-12 bg-orange-900 border-4 border-black rounded-l-2xl" />
            
            {/* Receiver & Trigger Area */}
            <div className="absolute bottom-10 right-48 w-20 h-10 bg-zinc-900 border-4 border-black rounded-sm" />
            <div className="absolute bottom-8 right-52 w-8 h-6 border-2 border-black rounded-full" />
            
            {/* Barrel (Metal) */}
            <div className="absolute bottom-14 right-56 w-80 h-6 bg-zinc-800 border-4 border-black rounded-l-md" />
            <div className="absolute bottom-16 right-60 w-72 h-3 bg-zinc-700 border-x-2 border-black opacity-50" />
            
            {/* Muzzle Flash */}
            <AnimatePresence>
              {ducks.some(d => d.status === 'hit') && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                  className="absolute -left-10 top-0 w-20 h-20 bg-yellow-400 rounded-full blur-xl z-50"
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* The Ducks */}
        <AnimatePresence>
          {gameStarted && !gameOver && ducks.map(duck => (
            duck.status !== 'escaped' && (
              <motion.div
                key={duck.id}
                initial={{ 
                  x: duck.x, 
                  y: duck.y,
                  rotate: 0,
                  opacity: 1,
                  scaleX: duck.direction
                }}
                animate={
                  duck.status === 'flying' 
                    ? { 
                        x: duck.direction === 1 ? GAME_WIDTH + DUCK_SIZE : -DUCK_SIZE,
                        y: [duck.y, duck.y - 80, duck.y + 20, duck.y],
                        scaleX: duck.direction,
                        transition: { 
                          x: { duration: duck.speed, ease: "linear" },
                          y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                        }
                      }
                    : { 
                        y: GAME_HEIGHT - 50,
                        rotate: 180,
                        scaleX: duck.direction,
                        transition: { duration: 0.6, ease: "easeIn" }
                      }
                }
                className="absolute z-10 cursor-none"
                style={{ 
                  width: DUCK_SIZE, 
                  height: DUCK_SIZE
                }}
                onClick={(e) => hitDuck(duck.id, e)}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="absolute w-12 h-8 bg-stone-600 border-2 border-zinc-900 rounded-sm" />
                  <motion.div 
                    animate={{ 
                      rotate: duck.status === 'flying' ? [-20, 20, -20] : 0,
                      y: duck.status === 'flying' ? [0, -5, 0] : 0
                    }}
                    transition={{ duration: 0.15, repeat: Infinity }}
                    className="absolute left-2 w-8 h-5 bg-stone-400 border-2 border-zinc-900 rounded-sm z-10 origin-right"
                  >
                    <div className="absolute top-1 right-1 w-3 h-1 bg-blue-500" />
                  </motion.div>
                  <div className="absolute right-2 top-1 w-2 h-4 bg-white border-x-2 border-zinc-900 z-10" />
                  <div className="absolute -right-2 -top-2 w-8 h-8 bg-emerald-700 border-2 border-zinc-900 rounded-sm z-20">
                    <div className="absolute top-1 right-1 w-2 h-2 bg-white border border-zinc-900">
                      <div className="w-1 h-1 bg-black" />
                    </div>
                  </div>
                  <div className="absolute -right-6 top-1 w-5 h-3 bg-yellow-500 border-2 border-zinc-900 rounded-sm z-10" />
                  <div className="absolute -left-2 top-3 w-4 h-3 bg-stone-800 border-2 border-zinc-900 rounded-sm" />
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>

        {/* Grass/Ground */}
        <div className="absolute bottom-0 left-0 w-full h-44 z-30 pointer-events-none">
          <div className="absolute bottom-0 w-full h-36 bg-emerald-800/80 blur-[1px]" />
          <div className="absolute bottom-0 w-full h-32 bg-lime-700 border-t-4 border-lime-800">
            <div className="flex justify-around pt-1 opacity-40">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-4 h-12 bg-lime-800 rounded-t-full" />
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 w-full h-28 bg-lime-600 border-t-8 border-lime-700 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
            <div className="absolute -top-6 w-full flex justify-between px-4">
              {[...Array(24)].map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-2 h-8 bg-lime-600 border-t-2 border-lime-700" />
                  <div className="w-4 h-4 bg-lime-600 -mt-4 rounded-t-sm" />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-wrap justify-around p-4 opacity-80">
              {[...Array(12)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i % 3 === 0 ? 'bg-yellow-400' : 'bg-white'} shadow-sm`} />
              ))}
            </div>
            <div className="flex justify-around pt-2">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="w-6 h-12 bg-lime-500 rounded-t-full opacity-90" />
              ))}
            </div>
          </div>
        </div>

        {/* Trees */}
        <div className="absolute bottom-32 left-16 w-14 h-48 bg-stone-900 z-20">
          <div className="absolute -top-32 -left-16 w-48 h-48 bg-emerald-950 rounded-full border-4 border-emerald-950 shadow-2xl" />
          <div className="absolute -top-24 -left-8 w-32 h-32 bg-emerald-900 rounded-full border-4 border-emerald-950 opacity-90" />
        </div>
        <div className="absolute bottom-32 right-32 w-12 h-36 bg-stone-900 z-20">
          <div className="absolute -top-28 -left-14 w-40 h-40 bg-emerald-900 rounded-full border-4 border-emerald-950 shadow-2xl" />
        </div>

        {/* Custom Crosshair */}
        {gameStarted && !gameOver && (
          <div 
            className="fixed pointer-events-none z-[100] flex items-center justify-center"
            style={{ 
              left: mousePos.x + (gameContainerRef.current?.getBoundingClientRect().left || 0),
              top: mousePos.y + (gameContainerRef.current?.getBoundingClientRect().top || 0),
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative w-12 h-12 border-2 border-red-600 rounded-full flex items-center justify-center">
              <div className="absolute w-full h-0.5 bg-red-600" />
              <div className="absolute h-full w-0.5 bg-red-600" />
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_5px_red]" />
              <div className="absolute w-16 h-16 border border-red-600/30 rounded-full" />
            </div>
          </div>
        )}

        {/* Overlay Screens */}
        {!gameStarted && (
          <div className="absolute inset-0 z-50 bg-zinc-950/80 flex flex-col items-center justify-center text-white text-center p-8 backdrop-blur-sm">
            <motion.h1 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-7xl font-black mb-6 tracking-tighter text-yellow-400 drop-shadow-[6px_6px_0_rgba(0,0,0,1)] italic"
            >
              CAZA DE PATOS
            </motion.h1>
            <p className="text-xl mb-10 max-w-md text-zinc-300 leading-relaxed">
              La precisión es clave. Dispara a los patos antes de que escapen. 
              <br/>
              <span className="text-red-400 font-bold">10 fallos y estás fuera.</span>
            </p>
            <button 
              onClick={startGame}
              className="group relative bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-5 text-3xl font-bold border-b-8 border-emerald-800 active:border-b-0 active:translate-y-2 transition-all flex items-center gap-4 rounded-sm"
            >
              <Play fill="currentColor" size={32} />
              EMPEZAR CAZA
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 z-50 bg-zinc-950/90 flex flex-col items-center justify-center text-white text-center p-8 backdrop-blur-md">
            <motion.h2 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-6xl font-black mb-4 text-red-500 drop-shadow-[6px_6px_0_rgba(0,0,0,1)]"
            >
              FIN DEL JUEGO
            </motion.h2>
            <div className="text-4xl mb-12 bg-zinc-800 px-8 py-4 border-2 border-zinc-700 rounded-sm">
              PUNTUACIÓN FINAL: <span className="text-yellow-400 font-black">{score}</span>
            </div>
            <button 
              onClick={startGame}
              className="group relative bg-sky-600 hover:bg-sky-500 text-white px-10 py-5 text-3xl font-bold border-b-8 border-sky-800 active:border-b-0 active:translate-y-2 transition-all flex items-center gap-4 rounded-sm"
            >
              <RotateCcw size={32} />
              REINTENTAR
            </button>
          </div>
        )}

        {/* Flash effect on shoot */}
        <AnimatePresence>
          {ducks.some(d => d.status === 'hit') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="absolute inset-0 bg-white z-[90] pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>
      
      <div className="fixed bottom-4 left-4 right-4 lg:hidden bg-yellow-500/90 text-black p-4 text-sm font-bold rounded-sm shadow-xl z-[200]">
        ⚠️ ¡SE JUEGA MEJOR EN ORDENADOR CON RATÓN PARA UNA EXPERIENCIA COMPLETA!
      </div>
    </div>
  );
}
