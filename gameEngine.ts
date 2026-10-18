
import { GoogleGenAI } from "@google/genai";
import { hasOptionalConsent } from './shared/site-privacy';
import { TimeItem, Language, GameDifficulty } from "./types/index";

// BANCA DELLE RIME LOCALE (Fallback immediato)
export const LOCAL_RHYMES: Record<Language, Record<string, string>> = {
  IT: {
    "Lunedì": "Lunedì con il sole o con l'ombrello, inizia la settimana ed è tutto bello!",
    "Martedì": "Martedì è un giorno birichino, saltiamo insieme come un pulcino!",
    "Mercoledì": "Mercoledì è proprio a metà, portiamo a tutti tanta felicità!",
    "Giovedì": "Giovedì è il giorno del gioco, facciamo un ballo per un poco!",
    "Venerdì": "Venerdì arriva in un momento, siamo felici e pieni di talento!",
    "Sabato": "Sabato è festa e si può riposare, corriamo fuori insieme a giocare!",
    "Domenica": "Domenica dolce come un biscotto, giochiamo insieme di sopra e di sotto!",
    "Gennaio": "Gennaio con il ghiaccio e il cappello, un pupazzo di neve è sempre bello!",
    "Febbraio": "Febbraio è corto e molto carino, mette la maschera ogni bambino!",
    "Marzo": "Marzo è pazzerello e divertente, fiorisce il prato e ride la gente!",
    "Aprile": "Aprile dolce dormire sul prato, un fiore nuovo è appena nato!",
    "Maggio": "Maggio è un raggio di sole splendente, tutto è verde e molto ridente!",
    "Giugno": "Giugno porta la scuola alla fine, tuffi nel mare e tanteINE!",
    "Luglio": "Luglio col sole che scotta la pelle, mangiamo il gelato sotto le stelle!",
    "Agosto": "Agosto è caldo e ci fa sguazzare, quanto è bello restare sul mare!",
    "Settembre": "Settembre riporta lo zaino in spalla, vola felice una farfalla!",
    "Ottobre": "Ottobre con le castagne nel cesto, il sole va a nanna molto presto!",
    "Novembre": "Novembre con la pioggia e il vento, leggiamo un libro in un momento!",
    "Dicembre": "Dicembre arriva col gran festone, Babbo Natale è un bel vecchione!"
  },
  EN: {
    "Monday": "Monday is here with a sunny start, keep a big smile inside your heart!",
    "Tuesday": "Tuesday is fun and full of play, let's hop and skip all through the day!",
    "Wednesday": "Wednesday is middle, right in the spot, let's give the world all that we've got!",
    "Thursday": "Thursday is great, let's dance and sing, joy to everyone we shall bring!",
    "Friday": "Friday is fast, the week is near done, let's go outside and have some fun!",
    "Saturday": "Saturday means it's time to rest, being with friends is simply the best!",
    "Sunday": "Sunday is sweet like a chocolate cake, let's see what magic we can make!",
    "January": "January's cold with ice and snow, wear your boots and off we go!",
    "February": "February's short and very sweet, love is the magic on every street!",
    "March": "March is windy, watch the kite fly, high up above in the bright blue sky!",
    "April": "April showers bring flowers to see, jump in a puddle with you and me!",
    "May": "May is bright with flowers so fair, sweet perfume is in the air!",
    "June": "June is sunny, school is all done, hello to summer and hello to fun!",
    "July": "July is hot, let's swim in the pool, eating ice cream to keep us cool!",
    "August": "August is warm, the beach is so wide, let's catch a wave on the ocean tide!",
    "September": "September is back with a school bag so new, learning is fun for me and for you!",
    "October": "October brings leaves of orange and red, wear a funny hat upon your head!",
    "November": "November is cozy, stay inside warm, safe from the wind and the winter storm!",
    "December": "December is magic, lights everywhere, joy and kindness are in the air!"
  }
};

export const generateFunFact = async (item: string, fallbackErrorText: string, lang: Language): Promise<string> => {
  const localFallback = LOCAL_RHYMES[lang]?.[item] || 
                        LOCAL_RHYMES[lang]?.[Object.keys(LOCAL_RHYMES[lang])[0]] || 
                        `${fallbackErrorText} ${item}!`;

  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || !hasOptionalConsent('google-ai')) {
    return localFallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = lang === 'IT'
      ? `Scrivi una rima brevissima (max 10 parole) per un bambino su: "${item}".`
      : `Write a tiny rhyme (max 10 words) for a kid about: "${item}".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text?.trim() || localFallback;
  } catch (error: any) {
    return localFallback;
  }
};

export const getNeighbors = (currentIndex: number, allItems: TimeItem[]) => {
  const prevIndex = (currentIndex - 1 + allItems.length) % allItems.length;
  const nextIndex = (currentIndex + 1) % allItems.length;
  return {
    prev: allItems[prevIndex],
    next: allItems[nextIndex]
  };
};

export const getQuizOptions = (currentItem: TimeItem, allItems: TimeItem[], difficulty: GameDifficulty): TimeItem[] => {
    let options: TimeItem[] = [];
    if (allItems.length <= 7) {
      options = [...allItems];
    } else {
      const currentIndex = allItems.findIndex(i => i.id === currentItem.id);
      const { prev, next } = getNeighbors(currentIndex, allItems);
      const subset = new Set<TimeItem>();
      subset.add(prev);
      subset.add(next);
      while(subset.size < 6) {
          const random = allItems[Math.floor(Math.random() * allItems.length)];
          if (random.id !== currentItem.id) subset.add(random);
      }
      options = Array.from(subset);
    }
    if (difficulty === GameDifficulty.MEDIUM) {
       return options.sort(() => Math.random() - 0.5);
    } else {
       return options.sort((a, b) => a.id - b.id);
    }
};
