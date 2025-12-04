import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GameType, LessonPlan, GameItem } from "../types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper for waiting
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check for API keys in various environments
const getApiKey = (): string => {
  let key = '';
  // 1. LocalStorage
  try { key = localStorage.getItem('gemini_api_key') || ''; } catch (e) {}
  if (key) return key;

  // 2. Vite Env
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

  // 3. Process Env
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

// Internal function to call specific model
async function callGeminiModel(modelName: string, prompt: string, schema: Schema, apiKey: string) {
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      systemInstruction: "You are an Italian L2 teacher (Level A1). Output strict JSON.",
    }
  });

  if (!response.text) throw new Error("Empty response from AI");
  return response.text;
}

export const generateLessonContent = async (topic: string): Promise<LessonPlan> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Chiave API mancante. Vai nelle Impostazioni (⚙️) o configura VITE_API_KEY su Vercel.");
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: [GameType.FLASHCARD, GameType.QUIZ, GameType.SCRAMBLE] },
            flashcard: {
              type: Type.OBJECT,
              properties: {
                italian: { type: Type.STRING },
                emoji: { type: Type.STRING },
                nativeHint: { type: Type.STRING },
                exampleSentence: { type: Type.STRING }
              }
            },
            quiz: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.INTEGER }
              }
            },
            scramble: {
              type: Type.OBJECT,
              properties: {
                sentence: { type: Type.STRING },
                words: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          required: ["type"]
        }
      }
    },
    required: ["items"]
  };

  const prompt = `
    Topic: "${topic}". Target: Italian L2 beginners (A1).
    Generate 6 items:
    1. 3 FLASHCARDS: Key vocab.
    2. 2 QUIZZES: Question + 4 options (1 correct, 3 distractors from DIFFERENT categories).
    3. 1 SCRAMBLE: Simple sentence.
  `;

  let lastError: any = null;

  // --- TENTATIVO 1: Gemini 2.5 Flash ---
  try {
    console.log("Tentativo 1: Gemini 2.5 Flash");
    const json = await callGeminiModel('gemini-2.5-flash', prompt, schema, apiKey);
    return parseResponse(json, topic);
  } catch (err) {
    console.warn("Tentativo 1 fallito:", err);
    lastError = err;
  }

  // Pausa tattica di 2 secondi
  await wait(2000);

  // --- TENTATIVO 2: Gemini Flash Lite (Modello più leggero) ---
  try {
    console.log("Tentativo 2: Gemini Flash Lite");
    const json = await callGeminiModel('gemini-flash-lite-latest', prompt, schema, apiKey);
    return parseResponse(json, topic);
  } catch (err) {
    console.warn("Tentativo 2 fallito:", err);
    lastError = err;
  }

  // Pausa tattica di 4 secondi
  await wait(4000);

  // --- TENTATIVO 3: Riprova Gemini 2.5 Flash ---
  try {
    console.log("Tentativo 3: Ultima chance Gemini 2.5 Flash");
    const json = await callGeminiModel('gemini-2.5-flash', prompt, schema, apiKey);
    return parseResponse(json, topic);
  } catch (err) {
    console.error("Tutti i tentativi falliti:", err);
    lastError = err;
  }

  // Se siamo qui, abbiamo fallito 3 volte. Analizziamo l'ultimo errore.
  const errorMessage = (lastError?.message || lastError?.toString() || "").toLowerCase();

  if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("exhausted")) {
      throw new Error("⚠️ Il sistema è molto carico. Ho provato 3 volte ma Google non risponde. Attendi 2 minuti veri prima di riprovare.");
  }
  if (errorMessage.includes("key") || errorMessage.includes("403")) {
       throw new Error("🔑 Chiave API non valida. Controlla di averla copiata tutta (inizia con AIza).");
  }
  
  throw new Error("Impossibile creare la lezione al momento. Riprova più tardi.");
};

function parseResponse(jsonText: string, topic: string): LessonPlan {
  try {
    const data = JSON.parse(jsonText);
    const items: GameItem[] = data.items.map((item: any) => {
      let content;
      if (item.type === GameType.FLASHCARD) content = item.flashcard;
      else if (item.type === GameType.QUIZ) content = item.quiz;
      else if (item.type === GameType.SCRAMBLE) content = item.scramble;

      return {
        id: generateId(),
        type: item.type,
        content: content
      };
    });
    return { topic, items };
  } catch (e) {
    console.error("JSON Parsing Error", e);
    throw new Error("Errore nella lettura della risposta AI.");
  }
}
