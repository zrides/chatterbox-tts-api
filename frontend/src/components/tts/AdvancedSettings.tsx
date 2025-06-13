import React from 'react';
import { Settings, RotateCcw } from 'lucide-react';

interface AdvancedSettingsProps {
  showAdvanced: boolean;
  onToggle: () => void;
  exaggeration: number;
  onExaggerationChange: (value: number) => void;
  cfgWeight: number;
  onCfgWeightChange: (value: number) => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  onResetToDefaults: () => void;
  isDefault: boolean;
}

export default function AdvancedSettings({
  showAdvanced,
  onToggle,
  exaggeration,
  onExaggerationChange,
  cfgWeight,
  onCfgWeightChange,
  temperature,
  onTemperatureChange,
  onResetToDefaults,
  isDefault
}: AdvancedSettingsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300 mt-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
        >
          <Settings className="w-4 h-4" />
          Advanced Settings
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
            {showAdvanced ? 'Hide' : 'Show'}
          </span>
        </button>

        {showAdvanced && !isDefault && (
          <button
            onClick={onResetToDefaults}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-300"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Defaults
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Exaggeration: {exaggeration}
            </label>
            <input
              type="range"
              min="0.25"
              max="2.0"
              step="0.05"
              value={exaggeration}
              onChange={(e) => onExaggerationChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600 dark:accent-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Controls emotion intensity</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pace (CFG Weight): {cfgWeight}
            </label>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={cfgWeight}
              onChange={(e) => onCfgWeightChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600 dark:accent-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Controls speech pace</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0.05"
              max="2.0"
              step="0.05"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600 dark:accent-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Controls randomness/creativity</p>
          </div>
        </div>
      )}
    </div>
  );
} 