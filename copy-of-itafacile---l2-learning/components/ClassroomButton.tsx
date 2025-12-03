import React, { useState } from 'react';

interface ClassroomButtonProps {
  topic: string;
}

export const ClassroomButton: React.FC<ClassroomButtonProps> = ({ topic }) => {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set('topic', topic);
    params.set('autoplay', 'true');
    return `${baseUrl}?${params.toString()}`;
  };

  const handleClassroomShare = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://classroom.google.com/share?url=${url}`, '_blank', 'width=600,height=480');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-colors"
        title="Copia link diretto"
      >
        {copied ? (
          <span>Copiato! ✓</span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Link
          </>
        )}
      </button>

      <button
        onClick={handleClassroomShare}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 hover:bg-green-50 text-gray-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
        title="Condividi su Google Classroom"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0h24v24H0z" fill="none"/>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-5.5l5.5-3.5-5.5-3.5v7z" fill="#1ea362" opacity="0"/> 
          <path d="M20 12c0-4.42-3.58-8-8-8s-8 3.58-8 8 3.58 8 8 8 8-3.58 8-8z" fill="none"/>
          {/* Custom simplified Classroom icon representation */}
          <rect x="4" y="4" width="16" height="16" rx="2" fill="#0F9D58"/>
          <path d="M8 10a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm0 2c-1.11 0-2 .9-2 2v1h8v-1c0-1.1-.9-2-2-2H8zm8.5-4h-2l-1 2h-1l1-2h-2l-1 2H9l1-2H8v1.5h10V8z" fill="#FFF"/>
        </svg>
        Classroom
      </button>
    </div>
  );
};