import React, { useState, useMemo } from 'react';
import { Volume2, Github, MessageCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from './components/ui/button';
import ThemeToggle from './components/theme-toggle';
import {
  ApiEndpointSelector,
  TextInput,
  AdvancedSettings,
  AudioPlayer
} from './components/tts';
import VoiceLibrary from './components/VoiceLibrary';
import AudioHistory from './components/AudioHistory';
import StatusHeader from './components/StatusHeader';
import StatusProgressOverlay from './components/StatusProgressOverlay';
import StatusStatisticsPanel from './components/StatusStatisticsPanel';
import { createTTSService } from './services/tts';
import { useApiEndpoint } from './hooks/useApiEndpoint';
import { useVoiceLibrary } from './hooks/useVoiceLibrary';
import { useAudioHistory } from './hooks/useAudioHistory';
import { useAdvancedSettings } from './hooks/useAdvancedSettings';
import { useTextInput } from './hooks/useTextInput';
import { useStatusMonitoring } from './hooks/useStatusMonitoring';
import { useProgressSettings } from './hooks/useProgressSettings';
import { useDefaultVoice } from './hooks/useDefaultVoice';
import { getFrontendVersion } from './lib/version';
import type { TTSRequest, HealthResponse } from './types';

function App() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);

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

  // Voice library management with backend health monitoring
  const {
    voices,
    selectedVoice,
    setSelectedVoice,
    addVoice,
    deleteVoice,
    renameVoice,
    refreshVoices,
    addAlias,
    removeAlias,
    isLoading: voicesLoading,
    isBackendReady: voicesBackendReady,
    error: voicesError
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

  // Progress settings and session tracking
  const {
    settings: progressSettings,
    updateSettings: updateProgressSettings,
    trackRequest,
    shouldShowProgress,
    dismissProgress,
    sessionId
  } = useProgressSettings();

  // Default voice management with backend health monitoring
  const {
    defaultVoice,
    updateDefaultVoice,
    clearDefaultVoice,
    isLoading: defaultVoiceLoading,
    isBackendReady: defaultVoiceBackendReady,
    healthStatus
  } = useDefaultVoice();

  // Create TTS service with current API base URL and session ID
  const ttsService = useMemo(() => createTTSService(apiBaseUrl, sessionId), [apiBaseUrl, sessionId]);

  // Status monitoring with real-time updates
  const {
    progress,
    statistics,
    isProcessing,
    hasError: statusHasError,
    isLoadingStats
  } = useStatusMonitoring(apiBaseUrl);

  const { data: health, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['health', apiBaseUrl],
    queryFn: ttsService.getHealth,
    refetchInterval: 3000, // More frequent during startup
    retry: true,
    retryDelay: 1000
  });

  // Fetch API info (including version) periodically
  const { data: apiInfo } = useQuery({
    queryKey: ['apiInfo', apiBaseUrl],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/info`);
      if (!response.ok) throw new Error('Failed to fetch API info');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
    retry: false
  });

  const generateMutation = useMutation({
    mutationFn: ttsService.generateSpeech,
    onMutate: (variables) => {
      // Track this request as originating from this frontend
      if (variables.session_id) {
        trackRequest(variables.session_id);
      }
    },
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

    // For backend voices, use the voice name; for file uploads, use voice_file
    const requestData: TTSRequest = {
      input: text,
      exaggeration,
      cfg_weight: cfgWeight,
      temperature
    };

    if (selectedVoice) {
      // Use voice name for backend voice library
      requestData.voice = selectedVoice.name;

      // Also include voice file if it's a client-side voice (for backward compatibility)
      if (selectedVoice.file) {
        requestData.voice_file = selectedVoice.file;
      }
    }

    generateMutation.mutate(requestData);
  };

  // Determine if backend is ready for voice operations
  const isBackendReady = voicesBackendReady && defaultVoiceBackendReady;
  const isInitializing = healthStatus === 'initializing' || health?.status === 'initializing';

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center gap-4">
            {/* Header with Theme Toggle */}
            <div className="flex justify-between items-start w-full max-w-4xl mx-auto relative">
              <div className="flex-1">
                <StatusHeader
                  health={health}
                  progress={progress}
                  statistics={statistics}
                  isLoadingHealth={isLoadingHealth}
                  hasErrors={statusHasError}
                  apiVersion={apiInfo?.version || apiInfo?.api_version}
                  progressSettings={{
                    onlyShowMyRequests: progressSettings.onlyShowMyRequests,
                    onToggleOnlyMyRequests: () => updateProgressSettings({
                      onlyShowMyRequests: !progressSettings.onlyShowMyRequests
                    })
                  }}
                  defaultVoiceSettings={{
                    defaultVoice,
                    voices,
                    onSetDefaultVoice: updateDefaultVoice,
                    onClearDefaultVoice: clearDefaultVoice,
                    isLoading: voicesLoading || defaultVoiceLoading
                  }}
                />
              </div>
              <div className="absolute right-0 sm:right-4 top-0 flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>

            {/* Backend Loading State */}
            {(isInitializing || !isBackendReady) && (
              <div className="w-full max-w-2xl mx-auto">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm font-medium text-primary">
                      {isInitializing ? 'Backend initializing...' : 'Loading voice library...'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isInitializing
                      ? 'TTS model is starting up. Voice library will load once ready.'
                      : 'Connecting to voice library and loading default settings.'
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-4">

              <div className="flex flex-col items-center justify-center gap-2 w-full">
                <button
                  onClick={() => setShowStatistics(!showStatistics)}
                  className="px-3 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors duration-300"
                >
                  {showStatistics ? 'Hide Stats' : 'Show Stats'}
                </button>
                {/* Statistics Panel (collapsible) */}
                {showStatistics && (
                  <StatusStatisticsPanel
                    statistics={statistics}
                    isLoading={isLoadingStats}
                    hasError={statusHasError}
                  />
                )}
              </div>

              <div className="max-w-2xl mx-auto gap-4 flex flex-col w-full">
                {/* API Endpoint Selector */}
                <div className="">
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
                  onRefresh={refreshVoices}
                  isLoading={voicesLoading}
                  defaultVoice={defaultVoice}
                  onSetDefaultVoice={updateDefaultVoice}
                  onClearDefaultVoice={clearDefaultVoice}
                  onAddAlias={addAlias}
                  onRemoveAlias={removeAlias}
                />

                {/* Voice Library Error Display */}
                {voicesError && !voicesLoading && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm text-destructive mb-2">
                      Failed to load voice library: {voicesError.message || 'Unknown error'}
                    </p>
                    <button
                      onClick={refreshVoices}
                      className="text-xs text-primary hover:text-primary/80 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

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
                  <div className="text-center text-sm text-muted-foreground">
                    Using voice: <span className="font-medium text-foreground">{selectedVoice.name}</span>
                    {defaultVoice === selectedVoice.name && (
                      <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !hasText}
                  className="w-full py-6 px-6 text-xl [&_svg]:size-6 [&_svg:not([class*='size-'])]:size-6 flex gap-4"
                >
                  <Volume2 className="w-5 h-5 mr-2" />
                  {generateMutation.isPending ? 'Generating...' : 'Generate Speech'}
                </Button>

                {/* Audio Player */}
                {audioUrl && (
                  <AudioPlayer audioUrl={audioUrl} />
                )}
              </div>
            </div>

            {/* Audio History */}
            <div className="w-full max-w-2xl mx-auto">
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

        {/* Footer */}
        <footer className="border-t border-border bg-card/50">
          <div className="w-full max-w-4xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground flex flex-col gap-2">
                <div className="flex flex-row gap-8">
                  <span>Frontend v{getFrontendVersion()}</span>
                  {apiInfo?.version && <span>API v{apiInfo.version}</span>}
                </div>
                {/* <div className="text-xs text-muted-foreground">
                  © 2025 Chatterbox TTS API - Open Source Voice Cloning
                </div> */}
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/travisvn/chatterbox-tts-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </a>
                <a
                  href="https://chatterboxtts.com/discord"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Join Discord</span>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Progress Overlay */}
      {shouldShowProgress(progress?.request_id) && progress && (
        <StatusProgressOverlay
          progress={progress}
          isVisible={shouldShowProgress(progress?.request_id)}
          onDismiss={dismissProgress}
        />
      )}
    </>
  );
}

export default App; 