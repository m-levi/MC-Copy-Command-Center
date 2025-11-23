'use client';

import React, { useState } from 'react';
import { useBrandArchitect } from './BrandArchitectContext';
import { ToneScale } from '@/types/brand-architect';

export default function ReviewStep({ onComplete }: { onComplete: (profile: any) => void }) {
  const { state, dispatch } = useBrandArchitect();
  const [isSaving, setIsSaving] = useState(false);
  const profile = state.draftProfile;

  if (!profile) return null;

  const handleToneChange = (key: string, value: number) => {
    dispatch({
      type: 'UPDATE_PROFILE_FIELD',
      payload: { path: `tonal_settings.${key}`, value: value as ToneScale },
    });
  };

  const handleListChange = (key: 'do_list' | 'dont_list', index: number, value: string) => {
      const list = [...(profile.linguistics?.[key] || [])];
      list[index] = value;
       dispatch({
        type: 'UPDATE_PROFILE_FIELD',
        payload: { path: `linguistics.${key}`, value: list },
      });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await onComplete(profile);
    } catch (error) {
        console.error("Failed to save profile:", error);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-8 pb-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Meet Your New Brand Voice
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Review the generated profile. You can tweak the settings before saving.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Identity & Tone */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
              Identity Core
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Archetype</label>
                <div className="text-lg font-medium text-blue-600 dark:text-blue-400">
                  {profile.identity?.archetype}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Core Vibe</label>
                <div className="text-lg font-medium text-purple-600 dark:text-purple-400">
                   {profile.identity?.core_vibe}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500">Mission</label>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "{profile.identity?.mission_statement}"
                </p>
              </div>
            </div>
          </div>

          {/* Tonal Settings */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">
              Tonal Settings
            </h4>
            <div className="space-y-6">
              {['formality', 'enthusiasm', 'empathy', 'humor'].map((trait) => (
                <div key={trait}>
                  <div className="flex justify-between mb-2">
                    <label className="capitalize text-sm font-medium text-gray-700 dark:text-gray-300">
                      {trait}
                    </label>
                    <span className="text-sm font-bold text-blue-600">
                      {profile.tonal_settings?.[trait as keyof typeof profile.tonal_settings]}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={profile.tonal_settings?.[trait as keyof typeof profile.tonal_settings] || 5}
                    onChange={(e) => handleToneChange(trait, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                  />
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Linguistics & Rules */}
        <div className="space-y-6">
          {/* Examples Comparison */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-md">
             <h4 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">The Difference</h4>
             <div className="space-y-4">
                 <div className="bg-white/10 p-3 rounded-lg">
                     <div className="text-xs text-gray-400 uppercase mb-1">Generic AI</div>
                     <p className="text-sm opacity-80 italic">"{profile.examples?.generic_rewrite}"</p>
                 </div>
                 <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-lg">
                     <div className="text-xs text-blue-300 uppercase mb-1 font-bold">Your Brand Voice</div>
                     <p className="text-sm font-medium">"{profile.examples?.on_brand_rewrite}"</p>
                 </div>
             </div>
          </div>

          {/* Do's and Don'ts */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
             <div className="grid grid-cols-2 gap-4">
                 <div>
                     <h4 className="text-sm font-bold text-green-600 uppercase mb-3 flex items-center gap-1">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                         Do This
                     </h4>
                     <ul className="space-y-2">
                         {profile.linguistics?.do_list?.map((item, idx) => (
                             <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                 <span className="text-green-500 mt-1">•</span>
                                 <input 
                                    value={item} 
                                    onChange={(e) => handleListChange('do_list', idx, e.target.value)}
                                    className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-full"
                                 />
                             </li>
                         ))}
                     </ul>
                 </div>
                 <div>
                     <h4 className="text-sm font-bold text-red-600 uppercase mb-3 flex items-center gap-1">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                         Avoid This
                     </h4>
                     <ul className="space-y-2">
                         {profile.linguistics?.dont_list?.map((item, idx) => (
                             <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                 <span className="text-red-500 mt-1">•</span>
                                  <input 
                                    value={item} 
                                    onChange={(e) => handleListChange('dont_list', idx, e.target.value)}
                                    className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-full"
                                 />
                             </li>
                         ))}
                     </ul>
                 </div>
             </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? 'Saving Profile...' : 'Save Brand Profile'}
          {!isSaving && (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
             </svg>
          )}
        </button>
      </div>
    </div>
  );
}
