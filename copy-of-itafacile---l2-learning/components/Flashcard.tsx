import React, { useState } from 'react';
import { FlashcardData } from '../types';
import { Button } from './Button';

interface FlashcardProps {
  data: FlashcardData;
  onNext: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ data, onNext }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNext();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Impara la parola</h2>
      
      <div 
        className={`relative w-full aspect-[3/4] cursor-pointer card-flip ${isFlipped ? 'flipped' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="card-inner w-full h-full relative">
          {/* Front */}
          <div className="card-front absolute w-full h-full bg-white border-4 border-blue-200 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8">
            <div className="text-9xl mb-8">{data.emoji}</div>
            <h3 className="text-4xl font-bold text-gray-800">{data.italian}</h3>
            <p className="mt-4 text-gray-400 text-sm uppercase tracking-widest">Tocca per girare</p>
          </div>

          {/* Back */}
          <div className="card-back absolute w-full h-full bg-blue-50 border-4 border-blue-300 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-center">
             <h3 className="text-3xl font-bold text-blue-600 mb-4">{data.italian}</h3>
             <p className="text-xl text-gray-600 italic mb-8">"{data.exampleSentence}"</p>
             {data.nativeHint && (
               <div className="bg-white px-4 py-2 rounded-lg text-gray-500 shadow-sm">
                 <span className="text-xs font-bold uppercase mr-2">Hint:</span>
                 {data.nativeHint}
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="mt-8 w-full">
        <Button onClick={handleNext} fullWidth variant="success">
          Ho capito! Prossima &rarr;
        </Button>
      </div>
    </div>
  );
};
