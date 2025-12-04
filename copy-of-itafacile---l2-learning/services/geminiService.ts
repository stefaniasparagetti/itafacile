
 import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GameType, LessonPlan, GameItem } from "../types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateLessonContent = async (topic: string): Promise<LessonPlan> => {
  // 1. Check LocalStorage (User entered key manually in Settings)
  let apiKey = '';
  try {
    apiKey = localStorage.getItem('gemini_api_key') || '';
  } catch (e) {
    console.warn("Local storage access failed");
  }

  // 2. Check Vite Environment Variable (Standard for Vercel/Vite apps)
  // We check safe access to import.meta to avoid crashes in non-module environments
  if (!apiKey) {
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
        // @ts-ignore
        apiKey = import.meta.env.VITE_API_KEY;
      }
    } catch (e) {
      // Ignore
    }
  }

  // 3. Fallback to process.env (Node.js/Legacy environments)
  if (!apiKey && typeof process !== 'undefined' && process.env) {
    apiKey = process.env.API_KEY || '';
  }

  if (!apiKey) {
    throw new Error("Chiave API mancante. Inseriscila nelle Impostazioni (⚙️) in alto a destra o configura VITE_API_KEY su Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey });

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
                italian: { type: Type.STRING, description: "The word in Italian" },
                emoji: { type: Type.STRING, description: "A single emoji representing the word" },
                nativeHint: { type: Type.STRING, description: "A very simple hint in English" },
                exampleSentence: { type: Type.STRING, description: "Simple example sentence in Italian using the word" }
              }
            },
            quiz: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "Simple question in Italian" },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 possible answers" },
                correctAnswerIndex: { type: Type.INTEGER, description: "Index of the correct answer (0-3)" }
              }
            },
            scramble: {
              type: Type.OBJECT,
              properties: {
                sentence: { type: Type.STRING, description: "A simple correct Italian sentence" },
                words: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The words of the sentence in random order" }
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
    Create an Italian L2 (Second Language) lesson plan for beginner students (Level A1/Literacy).
    The topic is: "${topic}".
    
    Generate 6 items total:
    - 3 FLASHCARDS: Introduce key vocabulary words related to the topic.
    - 2 QUIZZES: Simple multiple choice questions. 
      IMPORTANT FOR QUIZZES: 
      1. Provide 1 Correct Answer and 3 Distractors.
      2. The Distractors must be CLEARLY WRONG and from a completely different category to avoid confusion (e.g. if the answer is a person, distractors should be food or objects). 
      3. DOUBLE CHECK that 'correctAnswerIndex' points to the actual correct string in the 'options' array.
    - 1 SCRAMBLE: A simple sentence related to the topic that needs to be reordered.

    Use simple, clear Italian suitable for middle school students learning to read/write.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an expert Italian teacher for foreign students (L2). Focus on high-frequency vocabulary and simple grammar. Ensure quiz answers are unambiguous.",
      }
    });

    const text = response.text;
    if (!text) throw new Error("Nessun contenuto generato.");

    const data = JSON.parse(text);
    
    // Map the raw JSON to our internal types with IDs
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

    return {
      topic,
      items
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const errorMessage = (error.message || error.toString()).toLowerCase();

    // 1. Check for Quota Exceeded (Limit reached)
    if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("resource has been exhausted")) {
        throw new Error("⚠️ Limite traffico gratuito raggiunto. Attendi 1 minuto e riprova.");
    }

    // 2. Check for Invalid Key
    if (errorMessage.includes("403") || errorMessage.includes("key not valid") || errorMessage.includes("api key")) {
         throw new Error("🔑 Chiave API non valida. Controlla nelle Impostazioni.");
    }

    // 3. Check for Network/Connection
    if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
        throw new Error("📡 Errore di connessione. Controlla internet.");
    }

    // Generic fallback
    throw new Error("Impossibile creare la lezione. Riprova tra poco.");
  }
};         
