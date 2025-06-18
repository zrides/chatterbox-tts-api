import { useState, useEffect, useCallback, useMemo } from 'react';
import { createTTSService } from '../services/tts';
import { useApiEndpoint } from './useApiEndpoint';
import type { DefaultVoiceResponse } from '../types';

export function useDefaultVoice() {
  const [defaultVoice, setDefaultVoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { apiBaseUrl } = useApiEndpoint();

  // Memoize ttsService to prevent recreation on every render
  const ttsService = useMemo(() => createTTSService(apiBaseUrl), [apiBaseUrl]);

  // Load default voice from backend
  const loadDefaultVoice = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response: DefaultVoiceResponse = await ttsService.getDefaultVoice();
      setDefaultVoice(response.default_voice);
    } catch (error) {
      console.error('Failed to load default voice:', error);
      setError('Failed to load default voice');
      setDefaultVoice(null);
    } finally {
      setIsLoading(false);
    }
  }, [ttsService]);

  // Update default voice
  const updateDefaultVoice = useCallback(async (voiceName: string) => {
    try {
      setError(null);
      await ttsService.setDefaultVoice(voiceName);
      setDefaultVoice(voiceName);
      return true;
    } catch (error) {
      console.error('Failed to set default voice:', error);
      setError('Failed to set default voice');
      return false;
    }
  }, [ttsService]);

  // Reset to no default (use file system default)
  const clearDefaultVoice = useCallback(async () => {
    try {
      setError(null);
      await ttsService.clearDefaultVoice();
      setDefaultVoice(null);
      return true;
    } catch (error) {
      console.error('Failed to reset default voice:', error);
      setError('Failed to reset default voice');
      return false;
    }
  }, [ttsService]);

  // Load default voice on mount and when API base URL changes
  useEffect(() => {
    loadDefaultVoice();
  }, [loadDefaultVoice]);

  return {
    defaultVoice,
    isLoading,
    error,
    updateDefaultVoice,
    clearDefaultVoice,
    refetch: loadDefaultVoice
  };
} 