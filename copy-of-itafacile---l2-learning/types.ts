export enum GameType {
  FLASHCARD = 'FLASHCARD',
  QUIZ = 'QUIZ',
  SCRAMBLE = 'SCRAMBLE'
}

export interface FlashcardData {
  italian: string;
  emoji: string;
  nativeHint?: string; // Optional English or simple hint
  exampleSentence: string;
}

export interface QuizData {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface ScrambleData {
  sentence: string; // The correct full sentence
  words: string[]; // Scrambled words
}

export interface GameItem {
  id: string;
  type: GameType;
  content: FlashcardData | QuizData | ScrambleData;
}

export interface LessonPlan {
  topic: string;
  items: GameItem[];
}
