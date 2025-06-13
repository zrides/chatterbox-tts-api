export interface TTSRequest {
  input: string;
  exaggeration?: number;
  cfg_weight?: number;
  temperature?: number;
  voice_file?: File;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  device: string;
  config: any;
}

export interface VoiceSample {
  id: string;
  name: string;
  file: File;
  audioUrl: string;
  uploadDate: Date;
}

export interface AudioRecord {
  id: string;
  name: string;
  audioUrl: string;
  blob: Blob;
  createdAt: Date;
  settings: {
    text: string;
    exaggeration: number;
    cfgWeight: number;
    temperature: number;
    voiceId?: string;
    voiceName?: string;
  };
} 