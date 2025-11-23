export type ToneScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface BrandVoiceProfile {
  identity: {
    archetype: string; // e.g., "The Rebel Scientist"
    core_vibe: string; // e.g., "Clinical Luxury"
    mission_statement: string;
  };
  tonal_settings: {
    formality: ToneScale;
    enthusiasm: ToneScale;
    empathy: ToneScale;
    humor: ToneScale;
  };
  linguistics: {
    do_list: string[]; // e.g., "Use sentence fragments"
    dont_list: string[]; // e.g., "No exclamation points in subject lines"
    vocabulary_allow: string[]; // "Preferred words"
    vocabulary_ban: string[]; // "Banned words"
    syntax_rules: string; // e.g., "Short sentences. Low syllable count."
  };
  examples: {
    generic_rewrite: string; // "How a normal AI writes it"
    on_brand_rewrite: string; // "How WE write it"
  };
}

export type WizardStep = 'ingestion' | 'interview' | 'calibration' | 'review';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface CalibrationOption {
  id: string;
  content: string;
  label: string; // "Option A" or "Option B"
  style_notes?: string;
}

export interface CalibrationRound {
  roundNumber: number;
  options: [CalibrationOption, CalibrationOption];
  selectedOptionId?: string;
  feedback?: string;
}

export interface WizardState {
  currentStep: WizardStep;
  uploadedData: {
    text: string;
    files: File[];
    url?: string;
  };
  chatHistory: ChatMessage[];
  calibrationRounds: CalibrationRound[];
  currentCalibrationRound: number;
  draftProfile: Partial<BrandVoiceProfile> | null;
  isProcessing: boolean;
  error: string | null;
}

export type WizardAction =
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'SET_UPLOADED_DATA'; payload: { text?: string; files?: File[]; url?: string } }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'START_CALIBRATION'; payload: CalibrationRound } // Start first round
  | { type: 'SELECT_CALIBRATION_OPTION'; payload: { roundIndex: number; optionId: string } }
  | { type: 'SET_CALIBRATION_FEEDBACK'; payload: { roundIndex: number; feedback: string } }
  | { type: 'NEXT_CALIBRATION_ROUND'; payload: CalibrationRound }
  | { type: 'SET_DRAFT_PROFILE'; payload: Partial<BrandVoiceProfile> }
  | { type: 'UPDATE_PROFILE_FIELD'; payload: { path: string; value: any } } // Helper for deep updates
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

