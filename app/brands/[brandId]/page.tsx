'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Brand root page - redirects to the Chat tab
 * The old settings content has been moved to /brands/[brandId]/settings
 */
export default function BrandRootPage({ params }: { params: Promise<{ brandId: string }> }) {
  const resolvedParams = use(params);
  const brandId = resolvedParams.brandId;
  const router = useRouter();

  useEffect(() => {
    // Redirect to chat tab (default tab)
    router.replace(`/brands/${brandId}/chat`);
  }, [brandId, router]);

  // Show a brief loading state while redirecting
  return (
    <div className="flex items-center justify-center h-[calc(100vh-60px)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
