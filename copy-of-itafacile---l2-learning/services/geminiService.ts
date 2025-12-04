import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GameType, LessonPlan, GameItem } from "../types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

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
  
  return await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      systemInstruction: "You are an Italian L2 teacher (Level A1). Output strict JSON.",
    }
  });
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

  // Optimized prompt to save tokens
  const prompt = `
    Topic: "${topic}". Target: Italian L2 beginners (A1).
    Generate 6 items:
    1. 3 FLASHCARDS: Key vocab.
    2. 2 QUIZZES: Question + 4 options (1 correct, 3 distractors from DIFFERENT categories).
    3. 1 SCRAMBLE: Simple sentence.
  `;

  try {
    // Attempt 1: Standard Flash Model
    try {
      console.log("Tentativo con Gemini 2.5 Flash...");
      const response = await callGeminiModel('gemini-2.5-flash', prompt, schema, apiKey);
      const text = response.text;
      if (!text) throw new Error("Empty response");
      return parseResponse(text, topic);
    } catch (err: any) {
      const msg = (err.message || "").toLowerCase();
      // If quota exceeded, try fallback
      if (msg.includes("429") || msg.includes("quota") || msg.includes("exhausted")) {
        console.warn("Quota 2.5 superata, passaggio a Lite...");
        // Attempt 2: Flash Lite Model (Fallback)
        const response = await callGeminiModel('gemini-flash-lite-latest', prompt, schema, apiKey);
        const text = response.text;
        if (!text) throw new Error("Empty response from Lite");
        return parseResponse(text, topic);
      }
      throw err; // Re-throw other errors
    }

  } catch (error: any) {
    console.error("Gemini Final Error:", error);
    const errorMessage = (error.message || error.toString()).toLowerCase();

    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
        throw new Error("⚠️ Traffico intenso. Google ha temporaneamente bloccato le richieste. Riprova tra 1 minuto.");
    }
    if (errorMessage.includes("key") || errorMessage.includes("403")) {
         throw new Error("🔑 Chiave API non valida o scaduta.");
    }
    throw new Error("Impossibile creare la lezione. Riprova.");
  }
};

function parseResponse(jsonText: string, topic: string): LessonPlan {
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
}
