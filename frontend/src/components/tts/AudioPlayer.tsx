import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Download } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
    };
    const handlePlay = () => {
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
    // Needed to add 'audioUrl' to dependencies or else the listeners wouldn't get added properly, 
    // because the audio element is recreated when the audioUrl changes.
  }, [audioUrl]);

  // Reset playing state when audioUrl changes
  useEffect(() => {
    setIsPlaying(false);
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'chatterbox-speech.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!audioUrl) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Generated Audio</h3>
      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full transition-colors duration-300 shadow-lg hover:shadow-xl"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        <audio
          ref={audioRef}
          src={audioUrl}
          className="flex-1 dark:[&::-webkit-media-controls-panel]:bg-gray-700"
          controls
        />

        <button
          onClick={handleDownload}
          className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white p-3 rounded-full transition-colors duration-300 shadow-lg hover:shadow-xl"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 