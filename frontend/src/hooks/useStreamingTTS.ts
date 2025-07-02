import { useState, useCallback, useRef } from 'react';
import type { TTSRequest, StreamingProgress, SSEEvent } from '../types';
import { createTTSService } from '../services/tts';

interface UseStreamingTTSProps {
  apiBaseUrl: string;
  sessionId?: string;
}

interface StreamingState {
  isStreaming: boolean;
  progress: StreamingProgress | null;
  audioUrl: string | null;
  error: string | null;
  currentAudio: HTMLAudioElement | null;
}

export function useStreamingTTS({ apiBaseUrl, sessionId }: UseStreamingTTSProps) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    progress: null,
    audioUrl: null,
    error: null,
    currentAudio: null
  });

  const [isStreamingEnabled, setIsStreamingEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('chatterbox-streaming-enabled') === 'true';
    } catch {
      return false;
    }
  });

  const [streamingFormat, setStreamingFormat] = useState<'sse' | 'audio'>('sse');

  const abortControllerRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scheduledTimeRef = useRef<number>(0);
  const ttsService = createTTSService(apiBaseUrl, sessionId);

  // Save streaming preference
  const toggleStreaming = useCallback(() => {
    const newValue = !isStreamingEnabled;
    setIsStreamingEnabled(newValue);
    try {
      localStorage.setItem('chatterbox-streaming-enabled', newValue.toString());
    } catch (error) {
      console.error('Error saving streaming preference:', error);
    }
  }, [isStreamingEnabled]);

  // Properly concatenate WAV files
  const createFinalAudio = useCallback(async (chunks: Blob[]): Promise<Blob> => {
    if (chunks.length === 0) return new Blob([], { type: 'audio/wav' });
    if (chunks.length === 1) return chunks[0];

    try {
      // For multiple chunks, we need to properly merge the WAV data
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffers: AudioBuffer[] = [];

      // Decode all chunks to audio buffers
      for (const chunk of chunks) {
        try {
          const arrayBuffer = await chunk.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          audioBuffers.push(audioBuffer);
        } catch (error) {
          console.warn('Failed to decode audio chunk, skipping:', error);
        }
      }

      if (audioBuffers.length === 0) {
        console.warn('No valid audio chunks to concatenate');
        return new Blob([], { type: 'audio/wav' });
      }

      // Calculate total length and create combined buffer
      const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
      const sampleRate = audioBuffers[0].sampleRate;
      const numberOfChannels = audioBuffers[0].numberOfChannels;

      const combinedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

      // Copy all audio data to combined buffer
      let currentOffset = 0;
      for (const buffer of audioBuffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          combinedBuffer.getChannelData(channel).set(channelData, currentOffset);
        }
        currentOffset += buffer.length;
      }

      // Convert combined buffer back to WAV blob
      const length = combinedBuffer.length;
      const dataSize = length * numberOfChannels * 2; // 2 bytes per sample per channel
      const arrayBuffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(arrayBuffer);

      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numberOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numberOfChannels * 2, true);
      view.setUint16(32, numberOfChannels * 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);

      // Convert float samples to 16-bit PCM (interleaved for multi-channel)
      let offset = 44;
      for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const samples = combinedBuffer.getChannelData(channel);
          const sample = Math.max(-1, Math.min(1, samples[i]));
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
          offset += 2;
        }
      }

      return new Blob([arrayBuffer], { type: 'audio/wav' });
    } catch (error) {
      console.error('Failed to concatenate audio properly, falling back to simple concatenation:', error);
      // Fallback to simple concatenation
      return new Blob(chunks, { type: 'audio/wav' });
    }
  }, []);

  // Play audio chunk with proper scheduling
  const playAudioChunk = useCallback(async (chunk: Blob) => {
    try {
      // Initialize audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        scheduledTimeRef.current = audioContextRef.current.currentTime;
      }

      const audioContext = audioContextRef.current;
      const arrayBuffer = await chunk.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create source and schedule playback
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      // Schedule this chunk to play after the previous one
      const startTime = Math.max(audioContext.currentTime, scheduledTimeRef.current);
      source.start(startTime);

      // Update scheduled time for next chunk
      scheduledTimeRef.current = startTime + audioBuffer.duration;
    } catch (error) {
      console.warn('Failed to play audio chunk:', error);
    }
  }, []);

  // Start SSE streaming
  const startSSEStreaming = useCallback(async (request: TTSRequest) => {
    try {
      setState(prev => ({
        ...prev,
        isStreaming: true,
        progress: null,
        error: null,
        audioUrl: null
      }));

      abortControllerRef.current = new AbortController();

      // Reset audio scheduling
      if (audioContextRef.current) {
        scheduledTimeRef.current = audioContextRef.current.currentTime;
      }

      for await (const { event, progress } of ttsService.generateSpeechSSE(request)) {
        if (abortControllerRef.current?.signal.aborted) break;

        setState(prev => ({ ...prev, progress }));

        if (event.type === 'speech.audio.delta') {
          // Play each chunk as it arrives for real-time experience
          const latestChunk = progress.audioChunks[progress.audioChunks.length - 1];
          if (latestChunk) {
            await playAudioChunk(latestChunk);
          }
        }

        if (event.type === 'speech.audio.done') {
          // Create final downloadable audio
          const finalBlob = await createFinalAudio(progress.audioChunks);
          const audioUrl = URL.createObjectURL(finalBlob);

          setState(prev => ({
            ...prev,
            isStreaming: false,
            audioUrl,
            progress: { ...progress, isComplete: true }
          }));
          break;
        }
      }
    } catch (error) {
      console.error('SSE streaming error:', error);
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Streaming failed'
      }));
    }
  }, [ttsService, createFinalAudio, playAudioChunk]);

  // Start raw audio streaming
  const startAudioStreaming = useCallback(async (request: TTSRequest) => {
    try {
      setState(prev => ({
        ...prev,
        isStreaming: true,
        progress: null,
        error: null,
        audioUrl: null
      }));

      abortControllerRef.current = new AbortController();

      // Reset audio scheduling
      if (audioContextRef.current) {
        scheduledTimeRef.current = audioContextRef.current.currentTime;
      }

      for await (const { chunk, progress } of ttsService.generateSpeechStream(request)) {
        if (abortControllerRef.current?.signal.aborted) break;

        setState(prev => ({ ...prev, progress }));

        // Play chunk immediately for real-time experience
        await playAudioChunk(chunk);

        if (progress.isComplete) {
          // Create final downloadable audio
          const finalBlob = await createFinalAudio(progress.audioChunks);
          const audioUrl = URL.createObjectURL(finalBlob);

          setState(prev => ({
            ...prev,
            isStreaming: false,
            audioUrl,
            progress: { ...progress, isComplete: true }
          }));
          break;
        }
      }
    } catch (error) {
      console.error('Audio streaming error:', error);
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Streaming failed'
      }));
    }
  }, [ttsService, createFinalAudio, playAudioChunk]);

  // Main streaming function
  const startStreaming = useCallback(async (request: TTSRequest) => {
    if (streamingFormat === 'sse') {
      await startSSEStreaming(request);
    } else {
      await startAudioStreaming(request);
    }
  }, [streamingFormat, startSSEStreaming, startAudioStreaming]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop any scheduled audio playback
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
      audioContextRef.current = null;
      scheduledTimeRef.current = 0;
    }

    setState(prev => ({
      ...prev,
      isStreaming: false
    }));
  }, []);

  // Clear current audio
  const clearAudio = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState(prev => ({
      ...prev,
      audioUrl: null,
      progress: null,
      error: null
    }));
  }, [state.audioUrl]);

  return {
    // Streaming state
    isStreaming: state.isStreaming,
    progress: state.progress,
    audioUrl: state.audioUrl,
    error: state.error,

    // Streaming controls
    isStreamingEnabled,
    toggleStreaming,
    streamingFormat,
    setStreamingFormat,

    // Actions
    startStreaming,
    stopStreaming,
    clearAudio
  };
} 