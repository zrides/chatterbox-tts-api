import React, { useState, useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import ThemeToggle from './components/theme-toggle';
import {
  ApiEndpointSelector,
  TextInput,
  VoiceUpload,
  AdvancedSettings,
  AudioPlayer
} from './components/tts';
import { createTTSService } from './services/tts';
import { useApiEndpoint } from './hooks/useApiEndpoint';
import type { TTSRequest, HealthResponse } from './types';

function App() {
  const [text, setText] = useState('');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced parameters
  const [exaggeration, setExaggeration] = useState(0.5);
  const [cfgWeight, setCfgWeight] = useState(0.5);
  const [temperature, setTemperature] = useState(0.8);

  // API endpoint management
  const { apiBaseUrl, updateApiBaseUrl } = useApiEndpoint();

  // Create TTS service with current API base URL
  const ttsService = useMemo(() => createTTSService(apiBaseUrl), [apiBaseUrl]);

  const { data: health } = useQuery({
    queryKey: ['health', apiBaseUrl],
    queryFn: ttsService.getHealth,
    refetchInterval: 30000
  });

  const generateMutation = useMutation({
    mutationFn: ttsService.generateSpeech,
    onSuccess: (audioBlob) => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
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
      voice_file: voiceFile || undefined
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
              onChange={setText}
            />

            {/* Voice Upload */}
            <VoiceUpload
              voiceFile={voiceFile}
              onFileChange={setVoiceFile}
            />

            {/* Advanced Settings */}
            <AdvancedSettings
              showAdvanced={showAdvanced}
              onToggle={() => setShowAdvanced(!showAdvanced)}
              exaggeration={exaggeration}
              onExaggerationChange={setExaggeration}
              cfgWeight={cfgWeight}
              onCfgWeightChange={setCfgWeight}
              temperature={temperature}
              onTemperatureChange={setTemperature}
            />

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
          </div>
        </div>
      </div>
    </>
  );
}

export default App; 