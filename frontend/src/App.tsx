import React, { useState, useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import ThemeToggle from './components/theme-toggle';
import {
  ApiEndpointSelector,
  TextInput,
  AdvancedSettings,
  AudioPlayer
} from './components/tts';
import VoiceLibrary from './components/VoiceLibrary';
import AudioHistory from './components/AudioHistory';
import { createTTSService } from './services/tts';
import { useApiEndpoint } from './hooks/useApiEndpoint';
import { useVoiceLibrary } from './hooks/useVoiceLibrary';
import { useAudioHistory } from './hooks/useAudioHistory';
import { useAdvancedSettings } from './hooks/useAdvancedSettings';
import { useTextInput } from './hooks/useTextInput';
import type { TTSRequest, HealthResponse } from './types';

function App() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // API endpoint management
  const { apiBaseUrl, updateApiBaseUrl } = useApiEndpoint();

  // Text input management with persistence
  const { text, updateText, clearText, hasText } = useTextInput();

  // Advanced settings management with persistence
  const {
    exaggeration,
    cfgWeight,
    temperature,
    updateExaggeration,
    updateCfgWeight,
    updateTemperature,
    resetToDefaults,
    isDefault
  } = useAdvancedSettings();

  // Voice library management
  const {
    voices,
    selectedVoice,
    setSelectedVoice,
    addVoice,
    deleteVoice,
    renameVoice,
    isLoading: voicesLoading
  } = useVoiceLibrary();

  // Audio history management
  const {
    audioHistory,
    addAudioRecord,
    deleteAudioRecord,
    renameAudioRecord,
    clearHistory,
    isLoading: historyLoading
  } = useAudioHistory();

  // Create TTS service with current API base URL
  const ttsService = useMemo(() => createTTSService(apiBaseUrl), [apiBaseUrl]);

  const { data: health } = useQuery({
    queryKey: ['health', apiBaseUrl],
    queryFn: ttsService.getHealth,
    refetchInterval: 30000
  });

  const generateMutation = useMutation({
    mutationFn: ttsService.generateSpeech,
    onSuccess: async (audioBlob) => {
      // Clean up previous audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      // Create new audio URL
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Save to audio history
      try {
        await addAudioRecord(
          audioBlob,
          {
            text,
            exaggeration,
            cfgWeight,
            temperature,
            voiceId: selectedVoice?.id,
            voiceName: selectedVoice?.name
          }
        );
      } catch (error) {
        console.error('Failed to save audio record:', error);
      }
    },
    onError: (error) => {
      console.error('TTS generation failed:', error);
      alert('Failed to generate speech. Please try again.');
    }
  });

  const handleGenerate = () => {
    if (!text.trim()) {
      alert('Please enter some text to convert to speech.');
      return;
    }

    generateMutation.mutate({
      input: text,
      exaggeration,
      cfg_weight: cfgWeight,
      temperature,
      voice_file: selectedVoice?.file || undefined
    });
  };



  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-slate-800 transition-colors duration-300">
        <div className="container mx-auto px-4 py-8">
          {/* Header with Theme Toggle */}
          <div className="flex justify-between items-start mb-8">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
                🎤 Chatterbox TTS
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Convert text to speech with voice cloning
              </p>
              {health && (
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className={`w-2 h-2 rounded-full ${health.model_loaded ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{health.status} • {health.device}</span>
                </div>
              )}
            </div>
            <div className="ml-4">
              <ThemeToggle />
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* API Endpoint Selector */}
            <div className="mb-6">
              <ApiEndpointSelector
                apiBaseUrl={apiBaseUrl}
                onUrlChange={updateApiBaseUrl}
              />
            </div>

            {/* Text Input */}
            <TextInput
              value={text}
              onChange={updateText}
              onClear={clearText}
              hasText={hasText}
            />

            {/* Voice Library */}
            <VoiceLibrary
              voices={voices}
              selectedVoice={selectedVoice}
              onVoiceSelect={setSelectedVoice}
              onAddVoice={addVoice}
              onDeleteVoice={deleteVoice}
              onRenameVoice={renameVoice}
              isLoading={voicesLoading}
            />

            {/* Advanced Settings */}
            <AdvancedSettings
              showAdvanced={showAdvanced}
              onToggle={() => setShowAdvanced(!showAdvanced)}
              exaggeration={exaggeration}
              onExaggerationChange={updateExaggeration}
              cfgWeight={cfgWeight}
              onCfgWeightChange={updateCfgWeight}
              temperature={temperature}
              onTemperatureChange={updateTemperature}
              onResetToDefaults={resetToDefaults}
              isDefault={isDefault}
            />

            {/* Current Voice Indicator */}
            {selectedVoice && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <Volume2 className="w-4 h-4" />
                  <span>Using voice: <strong>{selectedVoice.name}</strong></span>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="mb-6">
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !text.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                <Volume2 className="w-5 h-5" />
                {generateMutation.isPending ? 'Generating...' : 'Generate Speech'}
              </button>
            </div>

            {/* Audio Player */}
            <AudioPlayer
              audioUrl={audioUrl}
            />

            {/* Audio History */}
            <AudioHistory
              audioHistory={audioHistory}
              onDeleteAudioRecord={deleteAudioRecord}
              onRenameAudioRecord={renameAudioRecord}
              onClearHistory={clearHistory}
              onRestoreSettings={(settings) => {
                updateExaggeration(settings.exaggeration);
                updateCfgWeight(settings.cfgWeight);
                updateTemperature(settings.temperature);
              }}
              onRestoreText={updateText}
              isLoading={historyLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default App; 