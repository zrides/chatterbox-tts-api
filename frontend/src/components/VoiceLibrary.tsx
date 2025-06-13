import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Play, Pause, Upload, Edit2, Check, X } from 'lucide-react';
import type { VoiceSample } from '../types';

interface VoiceLibraryProps {
  voices: VoiceSample[];
  selectedVoice: VoiceSample | null;
  onVoiceSelect: (voice: VoiceSample | null) => void;
  onAddVoice: (file: File, customName?: string) => Promise<VoiceSample>;
  onDeleteVoice: (voiceId: string) => Promise<void>;
  onRenameVoice: (voiceId: string, newName: string) => void;
  isLoading: boolean;
}

export default function VoiceLibrary({
  voices,
  selectedVoice,
  onVoiceSelect,
  onAddVoice,
  onDeleteVoice,
  onRenameVoice,
  isLoading
}: VoiceLibraryProps) {

  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [editingVoice, setEditingVoice] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    if (fileArray.length === 1) {
      // Single file - show name dialog
      setPendingFiles(fileArray);
      setEditName(fileArray[0].name.replace(/\.[^/.]+$/, ""));
      setShowNameDialog(true);
    } else {
      // Multiple files - use default names
      fileArray.forEach(file => {
        onAddVoice(file);
      });
    }
  };

  const handleSaveName = async () => {
    if (pendingFiles.length > 0 && editName.trim()) {
      try {
        await onAddVoice(pendingFiles[0], editName.trim());
        setShowNameDialog(false);
        setPendingFiles([]);
        setEditName('');
      } catch (error) {
        alert('Failed to add voice. Please try again.');
      }
    }
  };

  const handleCancelName = () => {
    setShowNameDialog(false);
    setPendingFiles([]);
    setEditName('');
  };

  const handleRename = (voiceId: string, currentName: string) => {
    setEditingVoice(voiceId);
    setEditName(currentName);
  };

  const handleSaveRename = () => {
    if (editingVoice && editName.trim()) {
      onRenameVoice(editingVoice, editName.trim());
      setEditingVoice(null);
      setEditName('');
    }
  };

  const handleCancelRename = () => {
    setEditingVoice(null);
    setEditName('');
  };

  const handleDeleteVoice = async (voiceId: string) => {
    if (confirm('Are you sure you want to delete this voice?')) {
      try {
        await onDeleteVoice(voiceId);
      } catch (error) {
        alert('Failed to delete voice. Please try again.');
      }
    }
  };

  const playPreview = (voice: VoiceSample) => {
    // If clicking the same voice that's currently playing/paused
    if (playingVoice === voice.id && currentAudioRef.current) {
      if (currentAudioRef.current.paused) {
        // Resume playback
        currentAudioRef.current.play().catch(error => {
          console.error('Error resuming voice:', error);
          alert('Failed to resume voice sample');
        });
      } else {
        // Pause playback (keep position)
        currentAudioRef.current.pause();
      }
      return;
    }

    // Stop any currently playing audio from a different voice
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Start playing the new audio
    const audio = new Audio(voice.audioUrl);
    currentAudioRef.current = audio;

    audio.onended = () => {
      setPlayingVoice(null);
      currentAudioRef.current = null;
    };

    audio.onerror = () => {
      setPlayingVoice(null);
      currentAudioRef.current = null;
      alert('Error playing voice sample');
    };

    audio.play().catch(error => {
      console.error('Error playing voice:', error);
      setPlayingVoice(null);
      currentAudioRef.current = null;
      alert('Failed to play voice sample');
    });

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

      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading voices...</p>
        </div>
      ) : voices.length === 0 ? (
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
                  {editingVoice === voice.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename();
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveRename();
                        }}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded transition-colors duration-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelRename();
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors duration-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-gray-800 dark:text-white truncate">{voice.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {voice.uploadDate.toLocaleDateString()} • {(voice.file.size / 1024 / 1024).toFixed(1)}MB
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreview(voice);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors duration-300"
                  >
                    {playingVoice === voice.id && currentAudioRef.current && !currentAudioRef.current.paused ? (
                      <Pause className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    ) : (
                      <Play className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(voice.id, voice.name);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors duration-300"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVoice(voice.id);
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

      {/* Name Dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Name Your Voice</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter a name for this voice..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') handleCancelName();
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleCancelName}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveName}
                disabled={!editName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors duration-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 