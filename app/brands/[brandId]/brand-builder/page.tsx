'use client';

import { use } from 'react';
import { BrandBuilderPage } from '@/components/brand-builder';

export default function BrandBuilderRoute({ params }: { params: Promise<{ brandId: string }> }) {
  const resolvedParams = use(params);
  return <BrandBuilderPage brandId={resolvedParams.brandId} />;
}
