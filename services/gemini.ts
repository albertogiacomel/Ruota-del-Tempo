
import { GoogleGenAI } from "@google/genai";
import { hasOptionalConsent } from '../shared/site-privacy';

export const generateFunFact = async (item: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || !hasOptionalConsent('google-ai')) return `Evviva ${item}!`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Scrivi una frase molto breve, semplice, divertente e in rima per un bambino di 6 anni sul giorno o mese: "${item}". Massimo 15 parole. In Italiano.`,
    });
    return response.text?.trim() || `Evviva ${item}!`;
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Che bello è ${item}!`;
  }
};
