import React, { useState, useEffect, useRef } from 'react';
import { generateLessonContent } from './services/geminiService';
import { LessonPlan, GameType } from './types';
import { Button } from './components/Button';
import { Flashcard } from './components/Flashcard';
import { Quiz } from './components/Quiz';
import { Scramble } from './components/Scramble';
import { ClassroomButton } from './components/ClassroomButton';

// Simple Toast Component
const Toast: React.FC<{ message: string; isVisible: boolean }> = ({ message, isVisible }) => {
  if (!isVisible) return null;
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-bounce">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
      <span className="font-bold">{message}</span>
    </div>
  );
};

// Settings Modal Component
const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [key, setKey] = useState('');
  
  useEffect(() => {
    setKey(localStorage.getItem('gemini_api_key') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', key.trim());
    onClose();
    alert('Chiave salvata! Ora puoi creare lezioni.');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Impostazioni</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            La tua Gemini API Key
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Incolla qui la chiave (AIza...)"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            Necessaria per generare nuove lezioni. La chiave viene salvata solo nel tuo browser.
          </p>
          <p className="text-xs text-blue-500 mt-1">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Ottieni una chiave gratuita qui</a>
          </p>
        </div>
        <Button onClick={handleSave} fullWidth variant="primary">Salva Chiave</Button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LessonPlan | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [savedLessons, setSavedLessons] = useState<LessonPlan[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Ref to prevent double-firing in Strict Mode
  const initRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load library from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('itafacile_library');
      if (saved) {
        setSavedLessons(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load library", e);
    }
  }, []);

  // Check URL params for shared lessons
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const sharedTopic = params.get('topic');
    const shouldAutoplay = params.get('autoplay') === 'true';

    if (sharedTopic) {
      setTopic(sharedTopic);
      if (shouldAutoplay) {
        handleCreateLesson(sharedTopic);
      }
    }
  }, []);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const saveToLibrary = (newLesson: LessonPlan) => {
    setSavedLessons(prev => {
      // Remove if exists to update (move to top)
      const filtered = prev.filter(l => l.topic.toLowerCase() !== newLesson.topic.toLowerCase());
      const updated = [newLesson, ...filtered].slice(0, 20); // Keep max 20 lessons
      localStorage.setItem('itafacile_library', JSON.stringify(updated));
      return updated;
    });
    triggerToast();
  };

  const deleteFromLibrary = (topicToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Vuoi cancellare la lezione "${topicToDelete}"?`)) return;
    
    setSavedLessons(prev => {
      const updated = prev.filter(l => l.topic !== topicToDelete);
      localStorage.setItem('itafacile_library', JSON.stringify(updated));
      return updated;
    });
  };

  const handleExportLibrary = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedLessons));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "itafacile-backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          // Merge logic: Add new ones, prevent duplicates by topic
          const currentTopics = new Set(savedLessons.map(l => l.topic.toLowerCase()));
          const newUnique = parsed.filter((l: any) => !currentTopics.has(l.topic?.toLowerCase()));
          
          const combined = [...newUnique, ...savedLessons].slice(0, 50);
          setSavedLessons(combined);
          localStorage.setItem('itafacile_library', JSON.stringify(combined));
          alert(`Importate ${newUnique.length} nuove lezioni!`);
        } else {
          alert("Il file non sembra valido.");
        }
      } catch (err) {
        alert("Errore nella lettura del file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const handleCreateLesson = async (topicOverride?: string) => {
    const topicToUse = topicOverride || topic;
    if (!topicToUse.trim()) return;
    
    // Check if we already have this lesson saved to avoid API call
    const existing = savedLessons.find(l => l.topic.toLowerCase() === topicToUse.toLowerCase());
    if (existing && !topicOverride) {
       // Optional: could reuse existing, but generating fresh is usually better for variety
    }

    setIsLoading(true);
    setError(null);
    setLesson(null);
    setGameComplete(false);
    setCurrentIndex(0);

    try {
      const data = await generateLessonContent(topicToUse);
      saveToLibrary(data);
      setLesson(data);
    } catch (err: any) {
      setError(err.message || "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLibrary = (savedLesson: LessonPlan) => {
    setTopic(savedLesson.topic);
    setLesson(savedLesson);
    setGameComplete(false);
    setCurrentIndex(0);
  };

  const handleNext = () => {
    if (!lesson) return;
    if (currentIndex < lesson.items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setGameComplete(true);
    }
  };

  const handleRestart = (e?: React.MouseEvent) => {
    // 1. Prevent any default browser behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 2. Safely clean the URL to prevent auto-reloading the lesson
    try {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } catch (err) {
      console.warn("Navigation history update failed", err);
    }
    
    // 3. Aggressively reset ALL state
    setLesson(null);
    setTopic('');
    setGameComplete(false);
    setCurrentIndex(0);
    setIsLoading(false);
    setError(null);
  };

  const handleHome = (e?: React.MouseEvent) => {
    handleRestart(e);
  };

  // Render Logic
  const renderGameContent = () => {
    if (!lesson) return null;
    const item = lesson.items[currentIndex];

    switch (item.type) {
      case GameType.FLASHCARD:
        return <Flashcard data={item.content as any} onNext={handleNext} />;
      case GameType.QUIZ:
        return <Quiz data={item.content as any} onNext={handleNext} />;
      case GameType.SCRAMBLE:
        return <Scramble data={item.content as any} onNext={handleNext} />;
      default:
        return <div>Unsupported Game Type</div>;
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-700 animate-pulse">
          Sto preparando la tua lezione su "{topic}"...
        </h2>
        <p className="text-gray-500 mt-2">L'intelligenza artificiale sta scrivendo gli esercizi.</p>
      </div>
    );
  }

  // Completion Screen
  if (gameComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-400 to-blue-500 flex flex-col items-center justify-center p-6 text-white text-center">
        <h1 className="text-6xl mb-4 animate-bounce">🏆</h1>
        <h2 className="text-4xl font-bold mb-4">Lezione Completata!</h2>
        <p className="text-xl mb-12 opacity-90 max-w-md">
          Hai imparato nuove parole su <span className="font-bold underline">"{lesson?.topic}"</span>.
        </p>

        <div className="bg-white/20 p-8 rounded-2xl backdrop-blur-sm w-full max-w-sm mb-8">
          <Button onClick={handleRestart} fullWidth variant="primary" className="mb-4 text-xl py-4 shadow-lg border-blue-600">
            🏠 Torna alla Home
          </Button>

          <div className="border-t border-white/30 pt-4 mt-4">
             <p className="text-sm mb-3 font-semibold text-white/80">Opzioni Insegnante:</p>
             <ClassroomButton topic={lesson?.topic || ""} />
          </div>
        </div>
      </div>
    );
  }

  // Active Lesson Screen
  if (lesson) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleHome}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              title="Torna alla Home"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </button>
            <div>
              <h1 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                {lesson.topic}
                <span className="text-green-500" title="Salvato">✅</span>
              </h1>
              <div className="flex gap-1 mt-1">
                {lesson.items.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 w-6 rounded-full transition-colors ${idx <= currentIndex ? 'bg-blue-500' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <ClassroomButton topic={lesson.topic} />
        </div>
        
        <div className="flex-grow flex flex-col relative overflow-hidden">
          {renderGameContent()}
        </div>

        <Toast message="Lezione salvata in libreria!" isVisible={showToast} />
      </div>
    );
  }

  // Home Screen (Input)
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-600 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Settings Button */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-blue-200 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Impostazioni"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>

        <div className="p-8 pb-6 bg-blue-50 text-center border-b border-blue-100">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">ItaFacile 🇮🇹</h1>
          <p className="text-gray-600">Impara parole nuove in un attimo!</p>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2 ml-1">
              Di cosa vuoi parlare oggi?
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="es. Cibo, Scuola, Animali..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-lg transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateLesson()}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <Button 
            onClick={() => handleCreateLesson()} 
            fullWidth 
            disabled={!topic.trim()}
            className="mb-8"
          >
            ✨ Crea Lezione Magica
          </Button>

          {/* Library Section */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                Libreria
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportLibrary}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Scarica Backup Libreria"
                  disabled={savedLessons.length === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
                <button 
                  onClick={handleImportClick}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Importa Backup Libreria"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </button>
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportFile} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
            </div>
            
            {savedLessons.length === 0 ? (
              <div className="text-center py-6 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Non hai ancora salvato nulla.</p>
                <p className="text-gray-400 text-xs mt-1">Crea una lezione e apparirà qui!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                {savedLessons.map((l, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-100 transition-colors cursor-pointer group"
                    onClick={() => loadFromLibrary(l)}
                  >
                    <span className="font-bold text-gray-700 group-hover:text-blue-700 capitalize">
                      {l.topic}
                    </span>
                    <button 
                      onClick={(e) => deleteFromLibrary(l.topic, e)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Elimina"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default App;
