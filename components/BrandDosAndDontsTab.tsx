'use client';

import BrandMemoriesManager from './BrandMemoriesManager';

interface BrandDosAndDontsTabProps {
  brandId: string;
}

export default function BrandDosAndDontsTab({ brandId }: BrandDosAndDontsTabProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Do's & Don'ts
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Clear guidance on what to do and what to avoid in your brand communications
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/30 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Why Do's & Don'ts?
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          Create clear, actionable guidelines to ensure consistent brand communication. This helps everyone understand:
        </p>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Do's - Things to embrace
            </h4>
            <ul className="text-gray-600 dark:text-gray-400 space-y-1 ml-5 list-disc text-xs">
              <li>Recommended language and phrases</li>
              <li>Preferred communication styles</li>
              <li>Best practices for engagement</li>
              <li>Encouraged behaviors and approaches</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Don'ts - Things to avoid
            </h4>
            <ul className="text-gray-600 dark:text-gray-400 space-y-1 ml-5 list-disc text-xs">
              <li>Words and phrases to never use</li>
              <li>Communication pitfalls to avoid</li>
              <li>Topics or approaches to steer clear of</li>
              <li>Common mistakes to prevent</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Do's & Don'ts Manager */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <BrandMemoriesManager
          brandId={brandId}
          category="dos_donts"
          title="Brand Do's & Don'ts"
          description="Clear guidance on what to embrace and what to avoid"
          placeholder="Add a do or don't (e.g., 'DO: Use conversational language' or 'DON'T: Make price the main focus')"
        />
      </div>

      {/* Examples */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Do's Example */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-900/30 p-5">
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Example Do's
          </h4>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Use conversational, friendly language</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Focus on customer benefits and outcomes</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Include social proof and testimonials</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Use active voice and action verbs</span>
            </li>
          </ul>
        </div>

        {/* Don'ts Example */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 rounded-xl border border-red-200 dark:border-red-900/30 p-5">
          <h4 className="font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Example Don'ts
          </h4>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex gap-2">
              <span className="text-red-600 dark:text-red-400">✗</span>
              <span>Use corporate jargon or buzzwords</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-600 dark:text-red-400">✗</span>
              <span>Make exaggerated or unverifiable claims</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-600 dark:text-red-400">✗</span>
              <span>Compare negatively to competitors</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-600 dark:text-red-400">✗</span>
              <span>Use all caps or excessive punctuation!!!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

