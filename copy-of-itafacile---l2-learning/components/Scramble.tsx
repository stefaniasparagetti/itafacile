import React, { useState, useEffect } from 'react';
import { ScrambleData } from '../types';
import { Button } from './Button';

interface ScrambleProps {
  data: ScrambleData;
  onNext: () => void;
}

export const Scramble: React.FC<ScrambleProps> = ({ data, onNext }) => {
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<{word: string, id: number}[]>([]);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');

  // Initialize randomized words
  useEffect(() => {
    const wordsWithIds = data.words.map((w, i) => ({ word: w, id: i }));
    // Simple shuffle
    const shuffled = [...wordsWithIds].sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setCurrentWords([]);
    setStatus('playing');
  }, [data]);

  const addWord = (wordObj: {word: string, id: number}) => {
    setCurrentWords([...currentWords, wordObj.word]);
    setAvailableWords(availableWords.filter(w => w.id !== wordObj.id));
  };

  const removeWord = (word: string, index: number) => {
    // Find original ID logic omitted for simplicity, just finding first match in original set to restore
    // In a complex app, we'd track IDs in currentWords too.
    // Re-adding to available list simply:
    const id = Math.random(); // Temp ID for restored word
    setAvailableWords([...availableWords, { word, id }]);
    const newCurrent = [...currentWords];
    newCurrent.splice(index, 1);
    setCurrentWords(newCurrent);
    setStatus('playing');
  };

  const checkAnswer = () => {
    const sentence = currentWords.join(' ');
    
    // Normalize: remove punctuation, case-insensitive, remove ALL spaces to handle apostrophes correctly (l' albero vs l'albero)
    const normalize = (str: string) => {
        return str
            .toLowerCase()
            .replace(/[.,!?;:]/g, '') // strip punctuation
            .replace(/\s+/g, '');     // strip all spaces
    };

    if (normalize(sentence) === normalize(data.sentence)) {
      setStatus('correct');
    } else {
      setStatus('wrong');
    }
  };

  const reset = () => {
    const wordsWithIds = data.words.map((w, i) => ({ word: w, id: i }));
    setAvailableWords(wordsWithIds.sort(() => Math.random() - 0.5));
    setCurrentWords([]);
    setStatus('playing');
  };

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold text-blue-800 mb-2">Costruisci la frase</h2>
      <p className="text-gray-500 mb-6 text-sm">Tocca le parole nell'ordine giusto.</p>

      {/* Answer Area */}
      <div className="bg-white rounded-2xl shadow-inner bg-gray-50 border-2 border-gray-200 p-6 min-h-[120px] mb-6 flex flex-wrap gap-2 items-center justify-center">
        {currentWords.length === 0 && <span className="text-gray-300">La frase appare qui...</span>}
        {currentWords.map((word, idx) => (
          <button
            key={idx}
            onClick={() => status === 'playing' && removeWord(word, idx)}
            className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg font-bold shadow-sm hover:bg-red-100 transition-colors"
          >
            {word}
          </button>
        ))}
      </div>

      {/* Word Bank */}
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        {availableWords.map((item) => (
          <button
            key={item.id}
            onClick={() => addWord(item)}
            className="bg-white border-b-4 border-blue-200 text-gray-700 px-4 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform"
          >
            {item.word}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-auto space-y-3">
        {status === 'playing' && (
          <Button 
            onClick={checkAnswer} 
            fullWidth 
            disabled={availableWords.length > 0} // Must use all words
            variant="primary"
          >
            Controlla
          </Button>
        )}

        {status === 'correct' && (
          <div className="bg-green-100 p-4 rounded-xl text-center">
            <p className="text-green-700 font-bold text-xl mb-3">Bravissimo! 🌟</p>
            <div className="text-gray-600 mb-4 italic">"{data.sentence}"</div>
            <Button onClick={onNext} variant="success" fullWidth>Prossima</Button>
          </div>
        )}

        {status === 'wrong' && (
           <div className="bg-red-100 p-4 rounded-xl text-center">
           <p className="text-red-700 font-bold mb-3">Non è corretto. Riprova!</p>
           <Button onClick={reset} variant="secondary" fullWidth>Ricomincia</Button>
         </div>
        )}
      </div>
    </div>
  );
};