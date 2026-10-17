> Impostazioni e controlli condivisi: [integrazione Videogames Kit](docs/videogames-kit.md).

# 🎡 Giratempo! - Ruota del Tempo per Bambini

**Giratempo!** è un'applicazione web educativa e interattiva progettata per insegnare ai bambini i giorni della settimana e i mesi dell'anno. Attraverso un design ispirato ai fumetti "Pop Art" e l'uso dell'Intelligenza Artificiale, trasforma l'apprendimento in un'avventura magica.

## ✨ Funzionalità Avanzate

- **🎡 Ruota del Destino**: Un'animazione fluida a 60fps con feedback tattile (visivo) e sonoro che seleziona casualmente un elemento temporale.
- **🧠 Quiz Dinamico**: Un sistema di trascinamento/selezione che aiuta a comprendere la sequenzialità (Prima/Dopo) con feedback immediato.
- **🗣️ Magia Vocale (Gemini TTS)**: Utilizza il modello `gemini-2.5-flash-preview-tts` per dare voce ai giorni, ai mesi e alle rime generate, rendendo l'app accessibile anche a chi non sa ancora leggere bene.
- **🎭 AI Rhyme Generator**: Gemini (`gemini-3-flash-preview`) crea rime personalizzate, brevi e divertenti per ogni vittoria.
- **💾 Audio Caching (IndexedDB)**: Un sistema intelligente di archiviazione locale salva i file audio generati dall'AI nel browser. Questo garantisce che l'app funzioni velocemente anche con connessioni instabili e riduce le chiamate API.
- **🌍 Bilingue & Temi**: Supporto completo IT/EN e modalità Dark/Light che trasformano l'intera palette cromatica dello stile Comic.

## 🚀 Tecnologie & Architettura

- **Frontend**: React 18.3.1 + TypeScript.
- **Styling**: Tailwind CSS con utility custom per ombre "Comic" e pattern "Ben-Day dots".
- **AI Engine**: 
  - `gemini-3-flash-preview`: Generazione di contenuti testuali creativi (rime).
  - `gemini-2.5-flash-preview-tts`: Sintesi vocale naturale ad alta fedeltà.
- **Persistence**: IndexedDB tramite Web API nativa per il caching dei blob audio PCM.
- **Audio**: Web Audio API per la gestione di SFX (oscillatori sintetizzati) e riproduzione dei buffer vocali a 24kHz.

## 🛠️ Configurazione e Installazione

Il progetto è ottimizzato per **Vite**.

### Prerequisiti
Node.js (v18+) e una chiave API di Google AI Studio.

### Installazione
1. Installa le dipendenze:
   ```bash
   npm install
   ```

### Chiave API
L'app si aspetta la chiave API in un file `.env` (gestita da Vite):
```env
API_KEY=la_tua_chiave_gemini
```
*Nota: La configurazione di Vite in `vite.config.ts` espone automaticamente questa variabile al client.*

### Avvio
```bash
npm run dev
```

## 🧠 Logica Didattica

1. **Esplorazione**: La ruota introduce il concetto di "casualità controllata" all'interno di un set chiuso (7 giorni o 12 mesi).
2. **Consolidamento**: Il quiz forza il recupero mnemonico della posizione dell'elemento rispetto ai suoi vicini.
3. **Ricompensa**: La rima AI funge da rinforzo positivo, associando un momento di ilarità o curiosità all'elemento appena appreso.
4. **Multimodalità**: L'unione di testo, colore, suono e voce stimola diversi canali di apprendimento (visivo, uditivo, cinestetico).

## 🎨 Design System

- **Shadows**: `shadow-comic` (4px offset nero pieno).
- **Typography**: 
  - *Bangers*: Per i titoli e gli elementi d'azione (enfasi).
  - *Comic Neue*: Per le istruzioni e le rime (leggibilità).
  - *Titillium Web*: Per l'interfaccia di sistema.
- **Feedback**: Sistema di vibrazione visiva (`animate-shake`) per gli errori e `confetti` per la vittoria.

---

Sviluppato con visione senior per un'esperienza utente "world-class".
Powered by **Google Gemini API**.