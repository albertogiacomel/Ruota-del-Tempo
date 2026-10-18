import type {GameSettings} from '../shared/videogames-kit/src/index.js';
import { hasOptionalConsent } from '../shared/site-privacy';

import { GoogleGenAI, Modality } from "@google/genai";

// --- CONFIGURAZIONE DATABASE (IndexedDB) ---
const DB_NAME = 'GiratempoAudioDB';
const STORE_NAME = 'static_audio';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToDB = async (key: string, data: Uint8Array) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, key);
  } catch (e) {
    console.warn("Errore salvataggio IndexedDB", e);
  }
};

const getFromDB = async (key: string): Promise<Uint8Array | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

// --- SFX & CONTEXT LOGIC ---
let sfxCtx: AudioContext | null = null;
const activeEffects=new Set<AudioScheduledSourceNode>();
const trackEffect=(source:AudioScheduledSourceNode)=>{activeEffects.add(source);source.onended=()=>activeEffects.delete(source);};
const getSfxCtx = () => {
  if (!sfxCtx) sfxCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  return sfxCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0, volume: number = 0.1) => {
  if(isMutedGlobal || !effectsEnabled) return;
  const ctx = getSfxCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
  osc.connect(gain); gain.connect(ctx.destination);
  trackEffect(osc);osc.start(ctx.currentTime + startTime); osc.stop(ctx.currentTime + startTime + duration);
};

// --- GEMINI TTS LOGIC ---
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
};

const memoryCache = new Map<string, AudioBuffer>();
let isMutedGlobal = false;
let effectsEnabled = true, voiceEnabled = true;
const activeVoice = new Set<AudioBufferSourceNode>();

export const audioService = {
  setPreferences: (value: Readonly<GameSettings>) => {
    isMutedGlobal=value.muted; effectsEnabled=value.effects; voiceEnabled=value.voice;
    if(isMutedGlobal||!effectsEnabled){for(const source of activeEffects)source.stop();activeEffects.clear();}
    if(isMutedGlobal||!voiceEnabled){for(const source of activeVoice)source.stop();activeVoice.clear();window.speechSynthesis?.cancel();}
    if(sfxCtx){if(isMutedGlobal)void sfxCtx.suspend();else if(sfxCtx.state==='suspended')void sfxCtx.resume();}
  },
  setMuted: (muted: boolean) => {
    isMutedGlobal = muted;
  },

  playTick: () => playTone(800, 'sine', 0.1),
  playSpin: () => playTone(150, 'square', 0.5, 0, 0.05),
  playSuccess: () => {
    playTone(523.25, 'triangle', 0.2, 0);
    playTone(659.25, 'triangle', 0.2, 0.1);
    playTone(783.99, 'triangle', 0.4, 0.2);
  },
  playError: () => {
    if(isMutedGlobal || !effectsEnabled) return;
    const ctx = getSfxCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.connect(gain); gain.connect(ctx.destination);
    trackEffect(osc);osc.start(); osc.stop(ctx.currentTime + 0.5);
  },

  preloadAndSave: async (text: string, lang: 'IT' | 'EN') => {
    const key = `${lang}:${text.toLowerCase()}`;
    if (memoryCache.has(key)) return;

    const stored = await getFromDB(key);
    if (stored) {
      const buffer = await decodeAudioData(stored, getSfxCtx());
      memoryCache.set(key, buffer);
      return;
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined' || !hasOptionalConsent('google-ai')) return;
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const voiceName = 'Erinome';
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: lang === 'IT' ? `Dì chiaramente: ${text}` : `Say clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          temperature: 0.25,
        },
      });
      
      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64 && hasOptionalConsent('google-ai')) {
        const raw = decode(base64);
        await saveToDB(key, raw);
        const buffer = await decodeAudioData(raw, getSfxCtx());
        memoryCache.set(key, buffer);
      }
    } catch (e) {
      console.warn(`Fallimento generazione audio per: ${key}`, e);
    }
  },

  speakWithGemini: async (text: string, lang: 'IT' | 'EN') => {
    if (isMutedGlobal || !voiceEnabled) return;
    const ctx = getSfxCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    
    const key = `${lang}:${text.toLowerCase()}`;
    let buffer = memoryCache.get(key);

    if (!buffer) {
      const stored = await getFromDB(key);
      if (stored) {
        buffer = await decodeAudioData(stored, ctx);
        memoryCache.set(key, buffer);
      }
    }

    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      if(isMutedGlobal || !voiceEnabled) return;
      activeVoice.add(source);source.onended=()=>activeVoice.delete(source);source.start();
      return new Promise(resolve => source.onended = resolve);
    } else {
      audioService.preloadAndSave(text, lang);
      audioService.speakInstant(text, lang);
      return Promise.resolve();
    }
  },

  speakInstant: (text: string, lang: 'IT' | 'EN') => {
    if (isMutedGlobal || !voiceEnabled) return;
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'IT' ? 'it-IT' : 'en-US';
    if (!hasOptionalConsent('google-ai')) {
      const voice = window.speechSynthesis.getVoices().find(v => v.localService && v.lang.toLowerCase().startsWith(lang.toLowerCase()));
      if (!voice) return;
      utter.voice = voice;
    }
    utter.rate = 1.0;
    window.speechSynthesis.speak(utter);
  }
};
