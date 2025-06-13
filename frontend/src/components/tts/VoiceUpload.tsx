import React, { useRef } from 'react';
import { Upload, Mic } from 'lucide-react';

interface VoiceUploadProps {
  voiceFile: File | null;
  onFileChange: (file: File | null) => void;
}

export default function VoiceUpload({ voiceFile, onFileChange }: VoiceUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    onFileChange(file || null);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <Mic className="inline w-4 h-4 mr-1" />
        Custom Voice (Optional)
      </label>
      <div
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors duration-300"
        onClick={handleClick}
      >
        <Upload className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
        {voiceFile ? (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Selected: {voiceFile.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Click to change</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Click to upload your voice sample</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">MP3, WAV, FLAC, M4A, OGG (max 10MB)</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.flac,.m4a,.ogg"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
} 