
import React, { useState, useEffect } from 'react';
import { TimeItem, GameDifficulty, Theme, Language } from '../types/index';
import { getQuizOptions, getNeighbors } from '../gameEngine';
import { STRINGS } from '../i18n/index';
import { audioService } from '../services/audio';

type Translation = typeof STRINGS.IT;

interface QuizAreaProps {
  currentItem: TimeItem;
  allItems: TimeItem[];
  onComplete: () => void;
  t: Translation;
  difficulty: GameDifficulty;
  theme: Theme;
  language: Language;
}

export const QuizArea: React.FC<QuizAreaProps> = ({ currentItem, allItems, onComplete, t, difficulty, theme, language }) => {
  const [selectedPrev, setSelectedPrev] = useState<string | null>(null);
  const [selectedNext, setSelectedNext] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'none' | 'success' | 'error'>('none');
  const [options, setOptions] = useState<TimeItem[]>([]);

  useEffect(() => {
    setSelectedPrev(null);
    setSelectedNext(null);
    setFeedback('none');
    setOptions(getQuizOptions(currentItem, allItems, difficulty));
  }, [currentItem, allItems, difficulty]);

  const checkAnswers = () => {
    const currentIndex = allItems.findIndex(i => i.id === currentItem.id);
    const { prev: correctPrev, next: correctNext } = getNeighbors(currentIndex, allItems);

    if (selectedPrev === correctPrev.label && selectedNext === correctNext.label) {
      setFeedback('success');
      onComplete();
    } else {
      setFeedback('error');
      audioService.playError();
      setTimeout(() => setFeedback('none'), 1000);
    }
  };

  const currentIndex = allItems.findIndex(i => i.id === currentItem.id);
  const { prev: correctPrev, next: correctNext } = getNeighbors(currentIndex, allItems);

  return (
    <div className="w-full flex flex-col h-full overflow-hidden px-4 md:px-8 gap-4 md:gap-6">
      
      <div className="grid grid-cols-3 gap-3 md:gap-6 w-full items-stretch shrink-0">
        
        {/* Slot PRIMA */}
        <div className="flex flex-col items-center gap-1.5 md:gap-3">
          <div className="bg-comic-cyan text-white font-heading px-3 md:px-6 py-0.5 md:py-1 rounded-full border-[3px] md:border-[5px] border-black shadow-comic-sm -rotate-2 text-[10px] md:text-xl uppercase z-20">
            {t.before}
          </div>
          <div 
            onClick={() => { setSelectedPrev(null); audioService.playTick(); }}
            className={`w-full min-h-[60px] md:min-h-[120px] lg:min-h-[140px] border-[3px] md:border-[6px] border-dashed rounded-xl md:rounded-[2rem] flex items-center justify-center shadow-comic transition-all cursor-pointer 
              ${theme === 'dark' ? (selectedPrev ? 'bg-slate-100' : 'bg-slate-800') : (selectedPrev ? 'bg-white' : 'bg-slate-50')}
              ${selectedPrev ? 'border-black scale-100 ring-4 ring-comic-cyan/20' : 'border-slate-400 hover:border-comic-cyan scale-95'} 
              ${feedback === 'error' && selectedPrev !== correctPrev.label ? 'animate-shake border-comic-red bg-red-100' : ''}`}
          >
            <span className={`font-heading text-xl md:text-4xl lg:text-6xl text-center px-2 leading-tight break-words uppercase 
              ${selectedPrev ? 'text-black' : (theme === 'dark' ? 'text-slate-600' : 'text-slate-300')}`}>
              {selectedPrev || '?'}
            </span>
          </div>
        </div>

        {/* Slot CENTRALE */}
        <div className="flex flex-col items-center gap-1.5 md:gap-3">
            <div className={`font-heading px-3 md:px-6 py-0.5 md:py-1 rounded-full border-[3px] md:border-[5px] border-black shadow-comic-sm text-[8px] md:text-lg uppercase ${theme === 'dark' ? 'bg-black text-comic-yellow' : 'bg-black text-white'}`}>
              {t.todayIs}
            </div>
            <div className="w-full min-h-[70px] md:min-h-[140px] lg:min-h-[160px] bg-comic-yellow border-[4px] md:border-[8px] border-black rounded-xl md:rounded-[2rem] shadow-[0_6px_0_#000] md:shadow-[0_12px_0_#000] flex items-center justify-center transform rotate-1 z-10">
                <span className="font-heading text-xl md:text-4xl lg:text-6xl text-center leading-none px-2 uppercase text-black">
                  {currentItem.label}
                </span>
            </div>
        </div>

        {/* Slot DOPO */}
        <div className="flex flex-col items-center gap-1.5 md:gap-3">
          <div className="bg-comic-red text-white font-heading px-3 md:px-6 py-0.5 md:py-1 rounded-full border-[3px] md:border-[5px] border-black shadow-comic-sm rotate-2 text-[10px] md:text-xl uppercase z-20">
            {t.after}
          </div>
          <div 
            onClick={() => { setSelectedNext(null); audioService.playTick(); }}
            className={`w-full min-h-[60px] md:min-h-[120px] lg:min-h-[140px] border-[3px] md:border-[6px] border-dashed rounded-xl md:rounded-[2rem] flex items-center justify-center shadow-comic transition-all cursor-pointer 
              ${theme === 'dark' ? (selectedNext ? 'bg-slate-100' : 'bg-slate-800') : (selectedNext ? 'bg-white' : 'bg-slate-50')}
              ${selectedNext ? 'border-black scale-100 ring-4 ring-comic-red/20' : 'border-slate-400 hover:border-comic-red scale-95'} 
              ${feedback === 'error' && selectedNext !== correctNext.label ? 'animate-shake border-comic-red bg-red-100' : ''}`}
          >
            <span className={`font-heading text-xl md:text-4xl lg:text-6xl text-center px-2 leading-tight break-words uppercase 
              ${selectedNext ? 'text-black' : (theme === 'dark' ? 'text-slate-600' : 'text-slate-300')}`}>
              {selectedNext || '?'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
        <div className={`border-[3px] md:border-[6px] border-black rounded-[1.5rem] md:rounded-[3rem] p-3 md:p-6 flex flex-col h-full shadow-inner relative overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-100'}`}>
          <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"></div>
          
          <p className={`text-center font-heading text-xs md:text-xl lg:text-2xl mb-2 md:mb-4 uppercase tracking-widest relative z-10 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.fillInstruction}
          </p>
          
          <div className="ag-equal-items grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4 overflow-y-auto pr-1 flex-1 content-center relative z-10 pb-4">
            {options.map((item) => {
               const isSelected = selectedPrev === item.label || selectedNext === item.label;
               return (
                <button
                  key={item.id}
                  onClick={() => {
                    audioService.playTick();
                    audioService.speakWithGemini(item.label, language);
                    
                    if (!selectedPrev) setSelectedPrev(item.label);
                    else if (!selectedNext) setSelectedNext(item.label);
                    else if (!isSelected) { 
                      setSelectedPrev(item.label); 
                      setSelectedNext(null); 
                    }
                  }}
                  disabled={isSelected}
                  className={`relative group min-h-[40px] md:min-h-[70px] lg:min-h-[80px] border-[2px] md:border-[5px] border-black rounded-lg md:rounded-2xl font-heading text-xs md:text-2xl lg:text-3xl transition-all p-2
                    ${isSelected ? 'bg-slate-300 opacity-40 grayscale scale-90 -rotate-1 cursor-default text-slate-600 border-dashed' : 'bg-white shadow-comic-sm hover:-translate-y-1 active:translate-y-0.5 hover:rotate-1 text-black'}
                  `}
                  style={{ backgroundColor: isSelected ? undefined : item.color }}
                >
                  <span className="relative z-10 uppercase tracking-tighter sm:tracking-normal line-clamp-1">{item.label}</span>
                  {!isSelected && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 rounded-lg md:rounded-2xl transition-opacity"></div>}
                </button>
               );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-3 md:gap-6 w-full max-w-4xl mx-auto shrink-0 pb-2">
        <button 
          onClick={() => { setSelectedPrev(null); setSelectedNext(null); audioService.playTick(); }}
          className={`flex-1 border-[3px] md:border-[5px] border-black rounded-lg md:rounded-2xl py-2 md:py-4 font-heading text-xs md:text-2xl active-press shadow-comic transition-all ${theme === 'dark' ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white text-black hover:bg-slate-50'}`}
        >
          {t.cancel}
        </button>
        <button 
          onClick={checkAnswers}
          disabled={!selectedPrev || !selectedNext}
          className={`flex-[1.5] border-[3px] md:border-[5px] border-black rounded-lg md:rounded-2xl py-2 md:py-4 font-heading text-sm md:text-3xl lg:text-4xl active-press transition-all
            ${!selectedPrev || !selectedNext ? (theme === 'dark' ? 'bg-slate-800 text-slate-700 border-slate-700' : 'bg-slate-200 text-slate-400 border-slate-300') : 'bg-comic-green text-black shadow-comic hover:scale-[1.02]'}
          `}
        >
          {t.check}
        </button>
      </div>
    </div>
  );
};
