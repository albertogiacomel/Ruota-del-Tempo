import {GameKitControls} from './shared/game-kit';

import React, { useState, useEffect } from 'react';
import ReactConfetti from 'react-confetti';
import { Wheel } from './components/Wheel';
import { QuizArea } from './components/QuizArea';
import { ComicPop, ComicBubble, ComicButton } from './components/ComicUI';
import { getGameItems } from './config/constants';
import { GameMode, GameState } from './types/index';
import { useGame } from './useGame';
import { Calendar, Sun, Play, Home, Volume2 } from 'lucide-react';
import { audioService } from './services/audio';

const App: React.FC = () => {
  const {
    mode, setMode,
    difficulty,
    gameState,
    selectedItem,
    isSpinning, setIsSpinning,
    funFact,
    showConfetti,
    handleSpinEnd,
    handleStartGame,
    triggerSpin,
    handleComplete,
    resetGame,
    language,
    theme,
    t
  } = useGame();

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showPop, setShowPop] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const languages: ('IT' | 'EN')[] = ['IT', 'EN'];
    const modes: GameMode[] = [GameMode.DAYS, GameMode.MONTHS];
    
    const syncAllAudio = async () => {
      for (const lang of languages) {
        for (const m of modes) {
          const items = getGameItems(m, lang);
          for (const item of items) {
            await audioService.preloadAndSave(item.label, lang);
          }
        }
      }
    };
    
    syncAllAudio();
  }, []);

  useEffect(() => {
    if (gameState === GameState.SUCCESS) {
      setShowPop(true);
      const timer = setTimeout(() => setShowPop(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const items = getGameItems(mode, language);
  const isWheelVisible = gameState === GameState.SPINNING;
  const isWheelLarge = isSpinning || (gameState === GameState.SPINNING && selectedItem !== null);

  return (
    <div className={`min-h-[100dvh] w-full flex items-center justify-center font-sans overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-black' : 'bg-slate-900'}`}>
      
      <div className={`w-full h-[100dvh] 2xl:h-[95vh] 2xl:max-w-[1600px] flex flex-col overflow-hidden relative 2xl:rounded-[3rem] 2xl:border-[10px] 2xl:border-black 2xl:shadow-[0_0_60px_rgba(0,0,0,0.8)] transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-800 bg-grid-pattern-dark' : 'bg-white bg-grid-pattern'}`}>
        
        {showConfetti && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} />}
        <ComicPop text={t.successPop} show={showPop} onClick={() => setShowPop(false)} />
        

        
        <header className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-black'} border-b-[4px] md:border-b-[6px] z-50 px-4 py-2 md:py-3 shadow-sm flex-shrink-0 transition-all duration-500 transform ${isWheelLarge ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="max-w-7xl mx-auto flex flex-row items-center justify-between">
            
            <h1 className="font-heading text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl uppercase leading-none tracking-tighter text-logo -rotate-1 origin-left whitespace-nowrap py-0.5 filter drop-shadow-sm">
              {t.appTitle}
            </h1>
            
            <div className="flex items-center gap-2 md:gap-4 flex-nowrap">
              {gameState !== GameState.MENU && (
                <button 
                  onClick={resetGame} 
                  className="p-2 md:p-3 bg-comic-red border-4 border-black rounded-xl md:rounded-2xl text-white active-press shadow-comic-sm hover:scale-105 transition-transform"
                  title="Home"
                >
                  <Home className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              )}

              <GameKitControls gameId="ruota-del-tempo" />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full relative z-10 flex flex-col items-center justify-center overflow-hidden px-4 md:px-8 py-2 md:py-4">
          
          {gameState === GameState.MENU && (
            <div className="w-full max-w-7xl flex flex-col items-center justify-center h-full space-y-6 md:space-y-10">
              <div className="shrink-0">
                  <ComicBubble text={t.welcome} className="scale-100 md:scale-110" />
              </div>
              <div className="relative w-full max-w-md md:max-w-4xl px-4">
                <div className={`relative h-20 md:h-36 border-[4px] md:border-[6px] border-black rounded-[1.5rem] md:rounded-[2.5rem] shadow-comic flex items-center p-1 md:p-2 overflow-hidden cursor-pointer transition-colors ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
                  <div className={`absolute top-1 md:top-2 bottom-1 md:bottom-2 w-[calc(50%-1.5rem)] md:w-[calc(50%-2.5rem)] rounded-xl md:rounded-[2rem] border-[3px] md:border-[5px] border-black transition-all duration-500 ease-in-out shadow-comic-sm ${mode === GameMode.DAYS ? 'left-1 md:left-2 bg-comic-yellow' : 'left-[50%] translate-x-2 md:translate-x-4 bg-comic-cyan'}`} />
                  <button onClick={() => { setMode(GameMode.DAYS); audioService.speakWithGemini(t.days, language); }} className="flex-1 relative z-10 h-full flex items-center justify-center gap-2 md:gap-6 transition-transform active:scale-95">
                    <div className={`bg-white p-1.5 md:p-3 rounded-full border-[2px] md:border-[4px] border-black transition-all ${mode === GameMode.DAYS ? 'scale-110 rotate-6' : 'scale-90 opacity-40'}`}><Sun className="w-6 h-6 md:w-12 md:h-12 text-orange-500" /></div>
                    <span className={`font-heading text-xl md:text-5xl uppercase transition-all ${mode === GameMode.DAYS ? 'text-black' : (theme === 'dark' ? 'text-slate-400' : 'opacity-30')}`}>{t.days}</span>
                  </button>
                  <button onClick={() => { setMode(GameMode.MONTHS); audioService.speakWithGemini(t.months, language); }} className="flex-1 relative z-10 h-full flex items-center justify-center gap-2 md:gap-6 transition-transform active:scale-95">
                    <span className={`font-heading text-xl md:text-5xl uppercase transition-all ${mode === GameMode.MONTHS ? 'text-white text-outline-thin' : (theme === 'dark' ? 'text-slate-400' : 'opacity-30')}`}>{t.months}</span>
                    <div className={`bg-white p-1.5 md:p-3 rounded-full border-[2px] md:border-[4px] border-black transition-all ${mode === GameMode.MONTHS ? 'scale-110 -rotate-6' : 'scale-90 opacity-40'}`}><Calendar className="w-6 h-6 md:w-12 md:h-12 text-blue-500" /></div>
                  </button>
                </div>
              </div>
              <div className="pt-2">
                  <ComicButton onClick={handleStartGame} className="text-2xl md:text-5xl px-12 md:px-24 py-3 md:py-6 shadow-comic rounded-xl md:rounded-3xl">
                    {t.play}
                  </ComicButton>
              </div>
            </div>
          )}

          {gameState !== GameState.MENU && (
            <div className={`w-full h-full flex transition-all duration-700 items-center justify-center overflow-hidden relative flex-col`}>
              
              {isWheelVisible && (
                <div className={`transition-all duration-700 flex items-center justify-center z-20 overflow-visible p-6 md:p-12
                   ${isWheelLarge ? 'w-full h-full max-h-full max-w-full' : 'w-full h-[45vh] lg:h-[50vh]'}
                `}>
                   <div className="relative flex items-center justify-center w-full h-full">
                     <Wheel 
                      items={items} 
                      isSpinning={isSpinning} 
                      setIsSpinning={setIsSpinning} 
                      onSpinEnd={handleSpinEnd}
                      selectedItem={selectedItem}
                      isLarge={isWheelLarge}
                    />
                    
                    {!isSpinning && selectedItem && (
                      <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
                        <div className="bg-comic-yellow border-[6px] md:border-[10px] border-black rounded-2xl md:rounded-3xl p-6 md:p-12 shadow-[0_12px_0_#000] md:shadow-[0_20px_0_#000] -rotate-2 animate-pop-in max-w-full">
                           <h3 className="font-heading text-4xl md:text-8xl lg:text-9xl text-black leading-none text-center truncate">
                             {selectedItem.label.toUpperCase()}!
                           </h3>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={`transition-all duration-500 w-full flex flex-col items-center justify-center relative overflow-hidden flex-1`}>
                
                {gameState === GameState.SPINNING && !isSpinning && !selectedItem && (
                  <div className="animate-pop-in flex items-center justify-center w-full">
                       <ComicButton onClick={triggerSpin} variant="danger" className="text-xl md:text-5xl px-8 md:px-16 py-4 md:py-8 shadow-comic">
                        <div className="flex items-center gap-2 md:gap-4">
                          <Play size={20} className="md:w-10 md:h-10" fill="currentColor" />
                          {t.spinBtn}
                        </div>
                      </ComicButton>
                  </div>
                )}

                {gameState === GameState.QUESTION && selectedItem && (
                  <div className="w-full h-full flex flex-col animate-pop-in space-y-4 md:space-y-6 max-w-7xl mx-auto overflow-hidden py-4">
                    <div className="shrink-0 px-2">
                        <ComicBubble text={t.quizQuestion(selectedItem.label)} className="scale-95 md:scale-105" />
                    </div>
                    <div className="flex-1 min-h-0">
                      <QuizArea currentItem={selectedItem} allItems={items} onComplete={handleComplete} t={t} difficulty={difficulty} theme={theme} language={language} />
                    </div>
                  </div>
                )}

                {gameState === GameState.SUCCESS && (
                  <div className="animate-pop-in flex flex-col items-center justify-center text-center gap-4 w-full h-full overflow-y-auto px-4 py-2">
                    <h2 className={`font-heading text-4xl md:text-[6rem] lg:text-[8rem] text-border drop-shadow-lg uppercase leading-none ${theme === 'dark' ? 'text-comic-yellow' : 'text-white'}`}>
                      {t.success}
                    </h2>
                    
                    <div className="relative w-full max-w-2xl transform rotate-1">
                      <div className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-black'} border-[4px] md:border-[6px] shadow-comic rounded-2xl p-4 md:p-8 w-full transition-colors relative`}>
                        <p className={`font-comic text-lg md:text-3xl lg:text-4xl font-black italic leading-snug mb-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                          {funFact || t.magicLoading}
                        </p>

                        {funFact && (
                          <div className="flex justify-end mt-4">
                            <button 
                              onClick={() => {
                                audioService.playTick();
                                audioService.speakWithGemini(funFact, language);
                              }}
                              className="group flex items-center gap-2 bg-comic-cyan border-[3px] border-black rounded-xl px-4 py-2 text-white shadow-comic-sm active-press hover:scale-105 transition-all z-20"
                            >
                              <Volume2 className="w-6 h-6 md:w-8 md:h-8" />
                              <span className="font-heading text-sm md:text-xl uppercase">{t.listenAgain}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {funFact && (
                        <div className="absolute -top-6 -left-6 md:-top-10 md:-left-10 w-12 h-12 md:w-20 md:h-20 bg-comic-yellow border-[3px] md:border-[5px] border-black rounded-full flex items-center justify-center animate-pulse z-30 shadow-comic-sm">
                           <span className="text-xl md:text-4xl">✨</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-8">
                      <ComicButton onClick={handleStartGame} className="text-lg md:text-4xl px-8 py-3 shadow-comic">
                        {t.spinAgain}
                      </ComicButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
