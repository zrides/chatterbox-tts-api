import { useState, useEffect, useCallback } from 'react';
import { createTTSService } from '../services/tts';
import { useApiEndpoint } from './useApiEndpoint';
import type { VoiceSample } from '../types';

// Convert backend voice data to frontend VoiceSample format
const convertToVoiceSample = (backendVoice: any): VoiceSample => {
  return {
    id: backendVoice.name, // Use name as ID for backend voices
    name: backendVoice.name,
    file: null as any, // We don't have the original File object for backend voices
    audioUrl: '', // We'll generate this on demand via download endpoint
    uploadDate: new Date(backendVoice.upload_date)
  };
};

export function useVoiceLibrary() {
  const [voices, setVoices] = useState<VoiceSample[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceSample | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { apiBaseUrl } = useApiEndpoint();

  const ttsService = createTTSService(apiBaseUrl);

  // Load voices from backend on mount
  useEffect(() => {
    const loadVoices = async () => {
      try {
        setIsLoading(true);
        const response = await ttsService.getVoices();

        const loadedVoices: VoiceSample[] = [];
        for (const backendVoice of response.voices) {
          const voiceSample = convertToVoiceSample(backendVoice);

          // Generate audio URL for preview (download endpoint)
          try {
            const audioBlob = await ttsService.downloadVoice(backendVoice.name);
            voiceSample.audioUrl = URL.createObjectURL(audioBlob);

            // Create a File object from the blob for compatibility
            voiceSample.file = new File([audioBlob], backendVoice.filename, {
              type: getAudioMimeType(backendVoice.file_extension)
            });
          } catch (error) {
            console.error(`Failed to load audio for voice ${backendVoice.name}:`, error);
            // Skip this voice if we can't load its audio
            continue;
          }

          loadedVoices.push(voiceSample);
        }

        setVoices(loadedVoices);
      } catch (error) {
        console.error('Error loading voice library:', error);
        setVoices([]); // Fallback to empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    loadVoices();

    // Cleanup URLs on unmount
    return () => {
      voices.forEach(voice => {
        if (voice.audioUrl) {
          URL.revokeObjectURL(voice.audioUrl);
        }
      });
    };
  }, [apiBaseUrl]);

  const addVoice = useCallback(async (file: File, customName?: string): Promise<VoiceSample> => {
    const voiceName = customName || file.name.replace(/\.[^/.]+$/, "");

    try {
      // Upload to backend
      await ttsService.uploadVoice(voiceName, file);

      // Create new voice sample
      const audioUrl = URL.createObjectURL(file);
      const voice: VoiceSample = {
        id: voiceName,
        name: voiceName,
        file,
        audioUrl,
        uploadDate: new Date()
      };

      // Add to local state
      setVoices(prev => [voice, ...prev]);
      return voice;
    } catch (error) {
      console.error('Error adding voice:', error);
      throw error;
    }
  }, [ttsService]);

  const deleteVoice = useCallback(async (voiceId: string) => {
    try {
      // Delete from backend
      await ttsService.deleteVoice(voiceId);

      const voice = voices.find(v => v.id === voiceId);
      if (voice && voice.audioUrl) {
        // Revoke URL
        URL.revokeObjectURL(voice.audioUrl);
      }

      // Clear selection if this voice was selected
      if (selectedVoice?.id === voiceId) {
        setSelectedVoice(null);
      }

      // Remove from state
      setVoices(prev => prev.filter(v => v.id !== voiceId));
    } catch (error) {
      console.error('Error deleting voice:', error);
      throw error;
    }
  }, [voices, selectedVoice, ttsService]);

  const renameVoice = useCallback(async (voiceId: string, newName: string) => {
    try {
      // Rename in backend
      await ttsService.renameVoice(voiceId, newName);

      // Update local state
      setVoices(prev => prev.map(voice => {
        if (voice.id === voiceId) {
          return { ...voice, id: newName, name: newName };
        }
        return voice;
      }));

      // Update selected voice if it was the renamed one
      if (selectedVoice?.id === voiceId) {
        setSelectedVoice(prev => prev ? { ...prev, id: newName, name: newName } : null);
      }
    } catch (error) {
      console.error('Error renaming voice:', error);
      throw error;
    }
  }, [selectedVoice, ttsService]);

  const refreshVoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ttsService.getVoices();
      const loadedVoices: VoiceSample[] = [];

      // Clean up existing URLs
      voices.forEach(voice => {
        if (voice.audioUrl) {
          URL.revokeObjectURL(voice.audioUrl);
        }
      });

      for (const backendVoice of response.voices) {
        const voiceSample = convertToVoiceSample(backendVoice);

        try {
          const audioBlob = await ttsService.downloadVoice(backendVoice.name);
          voiceSample.audioUrl = URL.createObjectURL(audioBlob);
          voiceSample.file = new File([audioBlob], backendVoice.filename, {
            type: getAudioMimeType(backendVoice.file_extension)
          });
        } catch (error) {
          console.error(`Failed to load audio for voice ${backendVoice.name}:`, error);
          continue;
        }

        loadedVoices.push(voiceSample);
      }

      setVoices(loadedVoices);
    } catch (error) {
      console.error('Error refreshing voices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [ttsService, voices]);

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    addVoice,
    deleteVoice,
    renameVoice,
    refreshVoices,
    isLoading
  };
}

// Helper function to get MIME type from file extension
function getAudioMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg'
  };
  return mimeTypes[extension] || 'audio/mpeg';
} 