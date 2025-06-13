import React from 'react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

export default function TextInput({
  value,
  onChange,
  maxLength = 3000,
  placeholder = "Enter the text you want to convert to speech..."
}: TextInputProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Text to Convert
      </label>
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