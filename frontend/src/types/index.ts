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