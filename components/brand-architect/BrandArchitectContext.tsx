'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { WizardState, WizardAction, BrandVoiceProfile } from '@/types/brand-architect';

const initialState: WizardState = {
  currentStep: 'ingestion',
  uploadedData: {
    text: '',
    files: [],
  },
  chatHistory: [],
  calibrationRounds: [],
  currentCalibrationRound: 0,
  draftProfile: null,
  isProcessing: false,
  error: null,
};

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_UPLOADED_DATA':
      return {
        ...state,
        uploadedData: { ...state.uploadedData, ...action.payload },
      };
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatHistory: [...state.chatHistory, action.payload],
      };
    case 'START_CALIBRATION':
      return {
        ...state,
        calibrationRounds: [action.payload],
        currentCalibrationRound: 0,
      };
    case 'SELECT_CALIBRATION_OPTION': {
      const rounds = [...state.calibrationRounds];
      if (rounds[action.payload.roundIndex]) {
        rounds[action.payload.roundIndex] = {
          ...rounds[action.payload.roundIndex],
          selectedOptionId: action.payload.optionId,
        };
      }
      return { ...state, calibrationRounds: rounds };
    }
    case 'SET_CALIBRATION_FEEDBACK': {
      const rounds = [...state.calibrationRounds];
      if (rounds[action.payload.roundIndex]) {
        rounds[action.payload.roundIndex] = {
          ...rounds[action.payload.roundIndex],
          feedback: action.payload.feedback,
        };
      }
      return { ...state, calibrationRounds: rounds };
    }
    case 'NEXT_CALIBRATION_ROUND':
      return {
        ...state,
        calibrationRounds: [...state.calibrationRounds, action.payload],
        currentCalibrationRound: state.currentCalibrationRound + 1,
      };
    case 'SET_DRAFT_PROFILE':
      return { ...state, draftProfile: action.payload };
    case 'UPDATE_PROFILE_FIELD': {
      // Simple implementation for now - in a real app, use lodash/set or similar for deep paths
      // This basic version assumes top-level or one-level deep for simplicity in this scaffold
      const { path, value } = action.payload;
      const parts = path.split('.');
      
      if (!state.draftProfile) return state;

      const newProfile = { ...state.draftProfile } as any;
      
      if (parts.length === 1) {
        newProfile[parts[0]] = value;
      } else if (parts.length === 2) {
         if (!newProfile[parts[0]]) newProfile[parts[0]] = {};
         newProfile[parts[0]][parts[1]] = value;
      }
       // Add more depth handling if needed

      return { ...state, draftProfile: newProfile };
    }
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

const BrandArchitectContext = createContext<{
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
} | undefined>(undefined);

export const BrandArchitectProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  return (
    <BrandArchitectContext.Provider value={{ state, dispatch }}>
      {children}
    </BrandArchitectContext.Provider>
  );
};

export const useBrandArchitect = () => {
  const context = useContext(BrandArchitectContext);
  if (context === undefined) {
    throw new Error('useBrandArchitect must be used within a BrandArchitectProvider');
  }
  return context;
};

