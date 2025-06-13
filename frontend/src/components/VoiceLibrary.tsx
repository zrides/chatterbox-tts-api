import React, { useState } from 'react';
import { Trash2, Download, Play, Pause, Upload } from 'lucide-react';
import type { VoiceSample } from '../types';

interface VoiceLibraryProps {
  onVoiceSelect: (voice: VoiceSample | null) => void;
  selectedVoice: VoiceSample | null;
}

export default function VoiceLibrary({ onVoiceSelect, selectedVoice }: VoiceLibraryProps) {
  const [voices, setVoices] = useState<VoiceSample[]>([]);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const audioUrl = URL.createObjectURL(file);
      const voice: VoiceSample = {
        id: Date.now().toString() + Math.random(),
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        file,
        audioUrl,
        uploadDate: new Date()
      };
      setVoices(prev => [...prev, voice]);
    });
  };

  const deleteVoice = (voiceId: string) => {
    setVoices(prev => {
      const voice = prev.find(v => v.id === voiceId);
      if (voice) {
        URL.revokeObjectURL(voice.audioUrl);
        if (selectedVoice?.id === voiceId) {
          onVoiceSelect(null);
        }
      }
      return prev.filter(v => v.id !== voiceId);
    });
  };

  const playPreview = (voice: VoiceSample) => {
    if (playingVoice === voice.id) {
      setPlayingVoice(null);
      return;
    }

    const audio = new Audio(voice.audioUrl);
    audio.onended = () => setPlayingVoice(null);
    audio.play();
    setPlayingVoice(voice.id);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Voice Library</h3>
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors duration-300 shadow-lg hover:shadow-xl">
          <Upload className="w-4 h-4" />
          Add Voices
          <input
            type="file"
            multiple
            accept=".mp3,.wav,.flac,.m4a,.ogg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {voices.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Upload className="mx-auto w-12 h-12 mb-2 opacity-50" />
          <p>No voices in library</p>
          <p className="text-sm">Upload voice samples to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {voices.map(voice => (
            <div
              key={voice.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors duration-300 ${selectedVoice?.id === voice.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              onClick={() => onVoiceSelect(voice)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white truncate">{voice.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {voice.uploadDate.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreview(voice);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors duration-300"
                  >
                    {playingVoice === voice.id ? (
                      <Pause className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    ) : (
                      <Play className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteVoice(voice.id);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors duration-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 