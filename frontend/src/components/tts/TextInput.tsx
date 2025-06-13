import React from 'react';
import { X } from 'lucide-react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  hasText: boolean;
  maxLength?: number;
  placeholder?: string;
}

export default function TextInput({
  value,
  onChange,
  onClear,
  hasText,
  maxLength = 3000,
  placeholder = "Enter the text you want to convert to speech..."
}: TextInputProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Text to Convert
        </label>
        {hasText && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-300"
            title="Clear text"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-300"
        placeholder={placeholder}
        maxLength={maxLength}
      />
      <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
        {value.length}/{maxLength} characters
      </div>
    </div>
  );
} 