import {useGamePreferences} from './shared/game-kit';

import { useState, useEffect, useRef } from 'react';
import { GameMode, GameDifficulty, GameState, TimeItem, Language } from './types/index';
import { generateFunFact, LOCAL_RHYMES } from './gameEngine';
import { getStrings } from './i18n/index';
import { audioService } from './services/audio';
import { getGameItems } from './config/constants';

export const useGame = () => {
  const [mode, setMode] = useState<GameMode>(GameMode.DAYS);
  const {store: kitStore, preferences: kitPreferences, effectiveTheme: theme} = useGamePreferences('ruota-del-tempo');
  const difficulty = kitPreferences.difficulty.toUpperCase() as GameDifficulty;
  const setDifficulty = (value: GameDifficulty) => kitStore.update({difficulty:value.toLowerCase()});
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [funFact, setFunFact] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const language = kitPreferences.language.toUpperCase() as Language;
  const setLanguage = (value: Language) => kitStore.update({language:value.toLowerCase()});

  const isMuted = kitPreferences.muted;
  const setIsMuted = (value: boolean) => kitStore.update({muted:value});
  
  const pendingFactPromise = useRef<Promise<string> | null>(null);
  const t = getStrings(language);
  
  const currentItems = getGameItems(mode, language);
  const selectedItem = selectedId !== null ? currentItems.find(i => i.id === selectedId) || null : null;

  useEffect(() => {
    audioService.setPreferences(kitPreferences);
  }, [kitPreferences]);

  const handleSpinEnd = (item: TimeItem) => {
    audioService.playTick();
    setSelectedId(item.id);
    setFunFact('');

    // Pronuncia il risultato della ruota
    audioService.speakWithGemini(item.label, language);

    // Inizia a generare la rima in background
    pendingFactPromise.current = generateFunFact(item.label, t.geminiError, language);

    setTimeout(() => {
        setGameState(GameState.QUESTION);
    }, 2500); 
  };

  const handleStartGame = () => {
    setGameState(GameState.SPINNING);
    setIsSpinning(false); 
    setFunFact('');
    setSelectedId(null);
    setShowConfetti(false);
    pendingFactPromise.current = null;
  };
  
  const triggerSpin = () => {
    setIsSpinning(true);
    audioService.playSpin();
    const interval = setInterval(() => {
      audioService.playSpin();
    }, 500);
    setTimeout(() => clearInterval(interval), 3500);
  };

  const handleComplete = async () => {
    setGameState(GameState.SUCCESS);
    setShowConfetti(true);
    audioService.playSuccess();
    
    if (selectedItem) {
      // 1. Definiamo un'attesa minima per mostrare il testo di caricamento "Sto scrivendo una magia..."
      const minLoadingDelay = new Promise(resolve => setTimeout(resolve, 1200));
      
      try {
        // Recuperiamo la rima (o la rima locale se Gemini fallisce/non c'è chiave)
        const factPromise = pendingFactPromise.current || generateFunFact(selectedItem.label, t.geminiError, language);
        
        // Aspettiamo che sia la rima che il tempo minimo di caricamento siano passati
        const [fact] = await Promise.all([factPromise, minLoadingDelay]);
        
        // 2. Impostiamo il testo (il riquadro magico viene popolato)
        setFunFact(fact);
        
        // 3. Aspettiamo esattamente 1 secondo DOPO che il testo è apparso prima di parlare
        setTimeout(() => {
          audioService.speakWithGemini(fact, language);
        }, 1000);

      } catch (err) {
        const local = LOCAL_RHYMES[language]?.[selectedItem.label] || t.geminiError;
        setFunFact(local);
        
        // Stessa logica di pausa per il fallback
        setTimeout(() => {
          audioService.speakWithGemini(local, language);
        }, 1000);
      }
    }
  };

  const resetGame = () => {
    setGameState(GameState.MENU);
    setShowConfetti(false);
    setFunFact('');
    setSelectedId(null);
    setIsSpinning(false);
    pendingFactPromise.current = null;
  };

  const toggleTheme = () => kitStore.update({theme:theme === 'light' ? 'dark' : 'light'});

  return {
    mode, setMode,
    difficulty, setDifficulty,
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
    language, setLanguage,
    theme, toggleTheme,
    isMuted, setIsMuted,
    t
  };
};
