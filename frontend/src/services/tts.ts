import axios from 'axios';
import type { TTSRequest, HealthResponse, VoiceLibraryResponse, DefaultVoiceResponse, VoiceLibraryItem } from '../types';

export const createTTSService = (baseUrl: string, sessionId?: string) => ({
  generateSpeech: async (request: TTSRequest): Promise<Blob> => {
    const formData = new FormData();
    formData.append('input', request.input);

    if (request.voice) {
      formData.append('voice', request.voice);
    }

    if (request.exaggeration !== undefined) {
      formData.append('exaggeration', request.exaggeration.toString());
    }

    if (request.cfg_weight !== undefined) {
      formData.append('cfg_weight', request.cfg_weight.toString());
    }

    if (request.temperature !== undefined) {
      formData.append('temperature', request.temperature.toString());
    }

    if (request.voice_file) {
      formData.append('voice_file', request.voice_file);
    }

    // Add session ID for tracking
    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    const response = await fetch(`${baseUrl}/audio/speech/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS generation failed: ${response.status} ${errorText}`);
    }

    return response.blob();
  },

  generateSpeechJSON: async (request: TTSRequest): Promise<Blob> => {
    const response = await axios.post(`${baseUrl}/audio/speech`, request, {
      responseType: 'blob',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  getHealth: async (): Promise<HealthResponse> => {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  },

  ping: async (): Promise<{ status: string; message: string }> => {
    const response = await fetch(`${baseUrl}/ping`);
    if (!response.ok) {
      throw new Error(`Ping failed: ${response.status}`);
    }
    return response.json();
  },

  // Voice library methods
  getVoices: async (): Promise<VoiceLibraryResponse> => {
    const response = await fetch(`${baseUrl}/voices`);
    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }
    return response.json();
  },

  uploadVoice: async (voiceName: string, voiceFile: File): Promise<any> => {
    const formData = new FormData();
    formData.append('voice_name', voiceName);
    formData.append('voice_file', voiceFile);

    const response = await fetch(`${baseUrl}/voices`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Upload failed: ${response.status}`);
    }

    return response.json();
  },

  deleteVoice: async (voiceName: string): Promise<void> => {
    const response = await fetch(`${baseUrl}/voices/${encodeURIComponent(voiceName)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Delete failed: ${response.status}`);
    }
  },

  renameVoice: async (voiceName: string, newName: string): Promise<void> => {
    const formData = new FormData();
    formData.append('new_name', newName);

    const response = await fetch(`${baseUrl}/voices/${encodeURIComponent(voiceName)}`, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Rename failed: ${response.status}`);
    }
  },

  downloadVoice: async (voiceName: string): Promise<Blob> => {
    const response = await fetch(`${baseUrl}/voices/${encodeURIComponent(voiceName)}/download`);
    if (!response.ok) {
      throw new Error(`Failed to download voice: ${response.status}`);
    }
    return response.blob();
  },

  getVoiceInfo: async (voiceName: string): Promise<VoiceLibraryItem> => {
    const response = await axios.get(`${baseUrl}/voices/${encodeURIComponent(voiceName)}`);
    return response.data.voice;
  },

  // New status endpoints
  getStatus: async (options?: {
    includeMemory?: boolean;
    includeHistory?: boolean;
    includeStats?: boolean;
    historyLimit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.includeMemory) params.append('include_memory', 'true');
    if (options?.includeHistory) params.append('include_history', 'true');
    if (options?.includeStats) params.append('include_stats', 'true');
    if (options?.historyLimit) params.append('history_limit', options.historyLimit.toString());

    const response = await axios.get(`${baseUrl}/status?${params.toString()}`);
    return response.data;
  },

  getProgress: async () => {
    const response = await axios.get(`${baseUrl}/status/progress`);
    return response.data;
  },

  getStatistics: async (includeMemory = false) => {
    const params = includeMemory ? '?include_memory=true' : '';
    const response = await axios.get(`${baseUrl}/status/statistics${params}`);
    return response.data;
  },

  getMemoryInfo: async () => {
    const response = await axios.get(`${baseUrl}/memory`);
    return response.data;
  },

  clearMemory: async () => {
    const response = await axios.post(`${baseUrl}/memory/reset`);
    return response.data;
  },

  getApiInfo: async () => {
    const response = await axios.get(`${baseUrl}/info`);
    return response.data;
  },

  // Default voice management
  getDefaultVoice: async (): Promise<DefaultVoiceResponse> => {
    const response = await fetch(`${baseUrl}/voices/default`);
    if (!response.ok) {
      throw new Error(`Failed to get default voice: ${response.status}`);
    }
    return response.json();
  },

  setDefaultVoice: async (voiceName: string): Promise<any> => {
    const formData = new FormData();
    formData.append('voice_name', voiceName);

    const response = await fetch(`${baseUrl}/voices/default`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Failed to set default voice: ${response.status}`);
    }

    return response.json();
  },

  clearDefaultVoice: async (): Promise<any> => {
    const response = await fetch(`${baseUrl}/voices/default`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Failed to clear default voice: ${response.status}`);
    }

    return response.json();
  }
});

export type TTSService = ReturnType<typeof createTTSService>; 