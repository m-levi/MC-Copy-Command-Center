'use client';

import { Brand } from '@/types';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Globe,
  MessageSquare,
  Brain,
  FileText,
  Star,
  Clock,
  TrendingUp,
  ExternalLink,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandOverviewCardProps {
  brand: Brand;
}

interface BrandStats {
  conversationCount: number;
  memoriesCount: number;
  documentsCount: number;
  filesCount: number;
  starredEmailsCount: number;
}

export default function BrandOverviewCard({ brand }: BrandOverviewCardProps) {
  const [stats, setStats] = useState<BrandStats>({
    conversationCount: 0,
    memoriesCount: 0,
    documentsCount: 0,
    filesCount: 0,
    starredEmailsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadStats();
  }, [brand.id]);

  const loadStats = async () => {
    try {
      // Fetch stats in parallel
      const [convRes, docRes, filesRes, starredRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', brand.id),
        supabase
          .from('brand_documents')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', brand.id),
        supabase
          .from('brand_files')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', brand.id),
        supabase
          .from('brand_documents')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', brand.id)
          .eq('doc_type', 'example'),
      ]);

      // Try to fetch memories count from API
      let memoriesCount = 0;
      try {
        const memoriesRes = await fetch(`/api/brands/${brand.id}/memories`);
        if (memoriesRes.ok) {
          const data = await memoriesRes.json();
          memoriesCount = data.memories?.length || 0;
        }
      } catch (e) {
        // Memories API might not be available
      }

      setStats({
        conversationCount: convRes.count || 0,
        memoriesCount,
        documentsCount: docRes.count || 0,
        filesCount: filesRes.count || 0,
        starredEmailsCount: starredRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading brand stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Conversations',
      value: stats.conversationCount,
      icon: MessageSquare,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Memories',
      value: stats.memoriesCount,
      icon: Brain,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Documents',
      value: stats.documentsCount,
      icon: FileText,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Files',
      value: stats.filesCount,
      icon: FolderOpen,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Starred',
      value: stats.starredEmailsCount,
      icon: Star,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Brand Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-900 dark:to-black rounded-2xl p-8 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          {/* Brand Avatar */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-4xl font-bold text-white">
                {brand.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Brand Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-2">{brand.name}</h1>
            {brand.website_url && (
              <a
                href={brand.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="truncate max-w-xs">{brand.website_url.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Updated {new Date(brand.updated_at || brand.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
            <Link
              href={`/brands/${brand.id}/chat`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Start Chat
            </Link>
            <Link
              href={`/brands/${brand.id}/brand-builder`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm border border-indigo-500/20"
            >
              <Sparkles className="w-4 h-4" />
              Brand Builder
            </Link>
          </div>
        </div>

        {/* Brand Voice Badge */}
        {brand.brand_voice && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/20">
                <Sparkles className="w-4 h-4 text-purple-300" />
                <span className="text-sm font-medium text-purple-200">Voice Configured</span>
              </div>
              {brand.brand_voice.voice_description && (
                <span className="text-sm text-gray-400 italic">
                  "{brand.brand_voice.voice_description}"
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn('p-2 rounded-lg', stat.bg)}>
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {loading ? '...' : stat.value}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Brand Description */}
      {brand.brand_details && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Brand Overview
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {brand.brand_details.slice(0, 500)}
            {brand.brand_details.length > 500 && '...'}
          </p>
        </div>
      )}
    </div>
  );
}


























