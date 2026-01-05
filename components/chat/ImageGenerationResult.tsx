'use client';

import { memo, useState, useCallback } from 'react';
import { Download, ExternalLink, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeneratedImage {
  index: number;
  base64?: string;
  url?: string;
  revisedPrompt?: string;
}

interface ImageGenerationResultProps {
  images: GeneratedImage[];
  prompt: string;
  model: string;
  onSave?: (index: number) => void;
  onRegenerate?: () => void;
  onDownload?: (index: number) => void;
}

/**
 * Component for displaying AI-generated images in chat
 */
export const ImageGenerationResult = memo(function ImageGenerationResult({
  images,
  prompt,
  model,
  onSave,
  onRegenerate,
  onDownload,
}: ImageGenerationResultProps) {
  const [downloading, setDownloading] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleDownload = useCallback(async (index: number) => {
    const image = images[index];
    if (!image) return;

    setDownloading(index);
    try {
      const imageUrl = image.url || (image.base64 ? `data:image/png;base64,${image.base64}` : null);
      if (!imageUrl) return;

      // Create download link
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `generated-image-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onDownload?.(index);
    } catch (error) {
      console.error('Failed to download image:', error);
    } finally {
      setDownloading(null);
    }
  }, [images, onDownload]);

  const getImageSrc = (image: GeneratedImage) => {
    if (image.url) return image.url;
    if (image.base64) return `data:image/png;base64,${image.base64}`;
    return null;
  };

  const getModelDisplayName = (modelId: string) => {
    if (modelId.includes('gemini')) return 'Gemini Flash Image';
    if (modelId.includes('dall-e-3')) return 'DALL·E 3';
    if (modelId.includes('dall-e-2')) return 'DALL·E 2';
    if (modelId.includes('imagen')) return 'Imagen 3';
    return modelId;
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Generated with {getModelDisplayName(model)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {images.length} image{images.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Generate variations
          </button>
        )}
      </div>

      {/* Images Grid */}
      <div className={cn(
        'grid gap-3',
        images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'
      )}>
        {images.map((image, index) => {
          const src = getImageSrc(image);
          if (!src) return null;

          const isExpanded = expandedIndex === index;

          return (
            <div
              key={index}
              className={cn(
                'relative group rounded-lg overflow-hidden border-2 transition-all',
                'border-gray-200 dark:border-gray-700',
                'hover:border-purple-400 dark:hover:border-purple-500',
                isExpanded && 'col-span-2 row-span-2'
              )}
            >
              {/* Image */}
              <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                <img
                  src={src}
                  alt={`Generated image ${index + 1}`}
                  className={cn(
                    'w-full h-full object-cover transition-transform',
                    isExpanded ? 'object-contain' : 'group-hover:scale-105'
                  )}
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                />

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(index);
                    }}
                    disabled={downloading === index}
                    className="p-2 rounded-lg bg-white/90 hover:bg-white text-gray-900 transition-colors disabled:opacity-50"
                    title="Download image"
                  >
                    {downloading === index ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(src, '_blank');
                    }}
                    className="p-2 rounded-lg bg-white/90 hover:bg-white text-gray-900 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  {onSave && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSave(index);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors"
                    >
                      Save
                    </button>
                  )}
                </div>

                {/* Image Index Badge */}
                <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/50 text-white text-xs font-medium">
                  {index + 1}
                </div>
              </div>

              {/* Revised Prompt (if available) */}
              {image.revisedPrompt && image.revisedPrompt !== prompt && (
                <div className="p-2 bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
                  <div className="font-medium mb-1">Revised prompt:</div>
                  <div className="line-clamp-2">{image.revisedPrompt}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Original Prompt */}
      {prompt && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Prompt:</span> {prompt}
          </div>
        </div>
      )}
    </div>
  );
});

















