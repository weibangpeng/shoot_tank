
import React, { useEffect, useState, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { useGameEngine } from './hooks/useGameEngine';
import { GameStatus } from './types';
import { LEVELS, PLAYER_MAX_HP } from './constants';
import { getMissionBriefing } from './services/gemini';

const App: React.FC = () => {
  const { 
    gameStateRef, status, setStatus, 
    currentLevelIdx, setCurrentLevelIdx, 
    uiStats, initLevel, update 
  } = useGameEngine();

  const [briefingText, setBriefingText] = useState<string>("Initializing tactical uplink...");
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  // Trigger briefing when level is about to start
  useEffect(() => {
    if (status === GameStatus.BRIEFING) {
      setLoadingBriefing(true);
      const levelConfig = LEVELS[currentLevelIdx];
      getMissionBriefing(levelConfig).then(text => {
        setBriefingText(text);
        setLoadingBriefing(false);
      });
    }
  }, [status, currentLevelIdx]);

  const startGame = () => {
    setCurrentLevelIdx(0);
    setStatus(GameStatus.BRIEFING);
  };

  const startNextLevel = () => {
    setCurrentLevelIdx(prev => prev + 1);
    setStatus(GameStatus.BRIEFING);
  };

  const launchLevel = () => {
    initLevel(LEVELS[currentLevelIdx]);
    setStatus(GameStatus.PLAYING);
  };

  const retry = () => {
    initLevel(LEVELS[currentLevelIdx]);
    setStatus(GameStatus.PLAYING);
  };

  // The physics loop callback
  const onGameLoop = () => {
    update(16, LEVELS[currentLevelIdx]);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="relative">
        
        {/* Main Game Canvas */}
        <GameCanvas gameStateRef={gameStateRef} onLoop={onGameLoop} />

        {/* HUD - Only visible when Playing */}
        {status === GameStatus.PLAYING && (
          <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none select-none">
            <div className="flex flex-col gap-2">
              <div className="bg-slate-900/80 border border-cyan-500 p-2 rounded text-cyan-400 font-bold font-mono">
                ARMOR: {Math.max(0, Math.ceil(uiStats.hp))} / {PLAYER_MAX_HP}
                <div className="w-32 h-2 bg-slate-700 mt-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-200" 
                    style={{ width: `${(uiStats.hp / PLAYER_MAX_HP) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900/80 border border-yellow-500 p-2 rounded text-yellow-400 font-bold font-mono text-center">
              <div>LEVEL {currentLevelIdx + 1}</div>
              <div className="text-xs text-yellow-200/70">HOSTILES: {uiStats.remaining}</div>
              <div className="text-xs text-white mt-1">SCORE: {uiStats.score}</div>
            </div>
          </div>
        )}

        {/* Overlay: Start Screen */}
        {status === GameStatus.START_SCREEN && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm z-50">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-8 drop-shadow-lg">
              NEON SURVIVOR: TANK OPS
            </h1>
            <div className="mb-8 text-slate-300 font-mono text-lg text-center space-y-2">
              <p>WASD: Move Chassis / Aim Main Cannon</p>
              <p>MOUSE: Aim MG Turret • CLICK: Fire MG</p>
              <p>SPACE: Fire Main Cannon (High Damage)</p>
            </div>
            <button 
              onClick={startGame}
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-[0_0_15px_rgba(8,145,178,0.6)] transition-all"
            >
              INITIALIZE TANK SYSTEM
            </button>
          </div>
        )}

        {/* Overlay: Briefing */}
        {status === GameStatus.BRIEFING && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-white z-50 p-12 text-center">
            <div className="max-w-xl border border-cyan-500/50 p-8 rounded bg-black/50 shadow-2xl">
              <h2 className="text-2xl text-cyan-500 font-mono mb-4 border-b border-cyan-900 pb-2">
                MISSION BRIEFING: LEVEL {currentLevelIdx + 1}
              </h2>
              <div className="min-h-[100px] flex items-center justify-center">
                {loadingBriefing ? (
                  <div className="animate-pulse text-cyan-300 font-mono">DECRYPTING TRANSMISSION...</div>
                ) : (
                  <p className="text-lg font-mono text-slate-200 leading-relaxed type-writer">
                    "{briefingText}"
                  </p>
                )}
              </div>
              <button 
                onClick={launchLevel}
                disabled={loadingBriefing}
                className={`mt-8 px-6 py-2 ${loadingBriefing ? 'bg-slate-700' : 'bg-cyan-600 hover:bg-cyan-500'} text-white font-bold rounded w-full`}
              >
                ENGAGE
              </button>
            </div>
          </div>
        )}

        {/* Overlay: Level Complete */}
        {status === GameStatus.LEVEL_COMPLETE && (
          <div className="absolute inset-0 bg-green-900/30 backdrop-blur-sm flex flex-col items-center justify-center z-50">
             <h2 className="text-4xl font-bold text-green-400 mb-4 drop-shadow-md">AREA SECURED</h2>
             <button 
                onClick={startNextLevel}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg"
              >
                PROCEED TO NEXT SECTOR
              </button>
          </div>
        )}

        {/* Overlay: Game Over */}
        {status === GameStatus.GAME_OVER && (
          <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-50">
             <h2 className="text-5xl font-black text-red-500 mb-2 drop-shadow-md">CRITICAL FAILURE</h2>
             <p className="text-white mb-6 font-mono">Score: {uiStats.score}</p>
             <button 
                onClick={retry}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-lg"
              >
                REBOOT SYSTEM
              </button>
              <button 
                onClick={() => setStatus(GameStatus.START_SCREEN)}
                className="mt-4 text-slate-400 hover:text-white underline"
              >
                Return to Title
              </button>
          </div>
        )}

        {/* Overlay: Victory */}
        {status === GameStatus.VICTORY && (
          <div className="absolute inset-0 bg-yellow-900/80 backdrop-blur flex flex-col items-center justify-center z-50 text-center p-8">
             <h2 className="text-5xl font-black text-yellow-400 mb-4 drop-shadow-md">MISSION ACCOMPLISHED</h2>
             <p className="text-xl text-white mb-8">All sectors cleared. Threat eliminated.</p>
             <p className="text-2xl font-mono text-yellow-200 mb-8">Final Score: {uiStats.score}</p>
             <button 
                onClick={() => setStatus(GameStatus.START_SCREEN)}
                className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded shadow-lg"
              >
                RETURN TO BASE
              </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;
