import React, { useState } from 'react';
import { Settings, Check, X, Edit } from 'lucide-react';

interface ApiEndpointSelectorProps {
  apiBaseUrl: string;
  onUrlChange: (url: string) => void;
}

export default function ApiEndpointSelector({ apiBaseUrl, onUrlChange }: ApiEndpointSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiBaseUrl);

  // Detect environment for user info
  const isDockerMode = typeof window !== 'undefined' &&
    (window.location.port === '4321' ||
      (window.location.port !== '4123' && window.location.port !== '3000' &&
        window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'));

  const handleSave = () => {
    onUrlChange(tempUrl);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempUrl(apiBaseUrl);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">API Endpoint:</span>
          {isDockerMode && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
              Docker Mode
            </span>
          )}
        </div>

        {!isEditing ? (
          <div className="flex items-center gap-2">
            <code className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
              {apiBaseUrl}
            </code>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-300"
              title="Edit endpoint URL"
            >
              <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              onKeyDown={handleKeyPress}
              className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="http://localhost:4123/v1"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded transition-colors duration-300"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors duration-300"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 