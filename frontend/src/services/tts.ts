import axios from 'axios';
import type { TTSRequest, HealthResponse } from '../types';

export const createTTSService = (baseUrl: string) => ({
  generateSpeech: async (request: TTSRequest): Promise<Blob> => {
    const formData = new FormData();
    formData.append('input', request.input);
    if (request.exaggeration) formData.append('exaggeration', request.exaggeration.toString());
    if (request.cfg_weight) formData.append('cfg_weight', request.cfg_weight.toString());
    if (request.temperature) formData.append('temperature', request.temperature.toString());
    if (request.voice_file) formData.append('voice_file', request.voice_file);

    const response = await axios.post(`${baseUrl}/audio/speech/upload`, formData, {
      responseType: 'blob',
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getHealth: async (): Promise<HealthResponse> => {
    const response = await axios.get(`${baseUrl}/health`);
    return response.data;
  }
});

export type TTSService = ReturnType<typeof createTTSService>; 