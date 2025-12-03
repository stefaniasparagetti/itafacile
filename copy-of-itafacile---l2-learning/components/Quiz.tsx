import React, { useState } from 'react';
import { QuizData } from '../types';
import { Button } from './Button';

interface QuizProps {
  data: QuizData;
  onNext: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ data, onNext }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleSelect = (index: number) => {
    if (selected !== null) return; // Prevent changing answer
    setSelected(index);
    setIsCorrect(index === data.correctAnswerIndex);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Quiz Veloce</h2>
      
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-b-4 border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800 text-center">{data.question}</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 flex-grow">
        {data.options.map((option, idx) => {
          let variant: 'secondary' | 'success' | 'danger' = 'secondary';
          
          if (selected !== null) {
            // Always show the correct answer in green
            if (idx === data.correctAnswerIndex) variant = 'success';
            // Show the selected wrong answer in red
            else if (idx === selected) variant = 'danger';
          }

          return (
            <Button 
              key={idx} 
              variant={variant} 
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              className="text-lg py-4"
            >
              {option}
            </Button>
          );
        })}
      </div>

      {selected !== null && (
        <div className={`mt-6 p-4 rounded-xl text-center ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <p className="font-bold text-lg mb-2">
            {isCorrect ? "Ottimo lavoro! 🎉" : "Ops! Non è corretto."}
          </p>
          {!isCorrect && (
            <p className="text-sm mb-3">
              La risposta giusta era: <span className="font-bold">{data.options[data.correctAnswerIndex]}</span>
            </p>
          )}
          <Button onClick={onNext} variant={isCorrect ? 'success' : 'primary'} fullWidth>
            Continua
          </Button>
        </div>
      )}
    </div>
  );
};