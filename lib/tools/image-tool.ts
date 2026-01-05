/**
 * Image Generation Tool - AI SDK 6.0 Integration
 *
 * Allows the AI to generate images using text-to-image models like
 * DALL·E 3, Gemini Flash Image ("Nano Banana"), and Imagen 3.
 */

import { z } from 'zod';
import { tool } from 'ai';
import { generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { gateway } from '@/lib/ai-providers';
import { logger } from '@/lib/logger';

// ============================================================================
// SCHEMAS
// ============================================================================

export const ImageGenerationSchema = z.object({
  prompt: z.string().min(10).max(4000)
    .describe('Detailed prompt describing the image to generate. Be specific about style, composition, lighting, and mood.'),
  model: z.enum([
    'openai/dall-e-3',
    'openai/dall-e-2',
    'openai/gpt-image-1',
    'google/gemini-2.5-flash-image',
    'google/imagen-3',
  ]).optional()
    .describe('Image model to use. If not specified, uses the mode default.'),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).optional()
    .describe('Image dimensions. Default: 1024x1024'),
  style: z.enum(['natural', 'vivid']).optional()
    .describe('Style for DALL-E 3: natural (realistic) or vivid (dramatic). Ignored for other models.'),
  n: z.number().min(1).max(4).optional()
    .describe('Number of images to generate (1-4). Default: 1'),
});

export type ImageGenerationInput = z.infer<typeof ImageGenerationSchema>;

// ============================================================================
// TOOL DEFINITION
// ============================================================================

/**
 * Create image generation tool with mode-specific configuration
 */
export function createImageGenerationTool(config?: {
  defaultModel?: string;
  defaultSize?: '1024x1024' | '1024x1792' | '1792x1024';
  defaultStyle?: 'natural' | 'vivid';
  maxImages?: number;
  allowedModels?: string[];
}) {
  const defaultModel = config?.defaultModel || 'google/gemini-2.5-flash-image';
  const defaultSize = config?.defaultSize || '1024x1024';
  const defaultStyle = config?.defaultStyle || 'natural';
  const maxImages = config?.maxImages || 2;

  return tool({
    description: `Generate images from text descriptions using AI image models.

USE THIS TOOL WHEN:
- User explicitly asks for an image, visual, picture, or graphic
- User needs a hero image, banner, product visualization, or illustration
- User describes something they want to see visually
- User mentions "show me", "create a visual", "generate an image"

PROMPT BEST PRACTICES (share these with user when refining prompts):
- Be specific: "golden retriever puppy playing in autumn leaves" beats "dog"
- Describe style: "watercolor painting", "photorealistic", "3D render", "digital illustration"
- Set the scene: lighting (morning sun, studio lights), mood (cozy, energetic, serene)
- Composition: camera angle, framing, depth of field
- Add details: colors, textures, time of day, weather, setting

EXAMPLE GOOD PROMPTS:
- "A cozy coffee shop interior, morning sunlight streaming through large windows, warm wooden furniture, barista preparing latte art, steam rising from cups, photorealistic style, shallow depth of field, golden hour lighting"
- "Summer sale banner, tropical beach theme, palm trees silhouette against orange-pink sunset gradient, floating shopping bags with sale tags, confetti, modern minimal design, wide format 16:9, commercial quality"
- "Product photography of a minimalist watch on white background, soft studio lighting, shallow depth of field, luxury aesthetic, high-end commercial style"

MODELS AVAILABLE:
- google/gemini-2.5-flash-image: Fast, high-quality (default - "Nano Banana")
- openai/dall-e-3: Best quality, supports style variations
- openai/dall-e-2: Faster, lower cost
- google/imagen-3: Google's flagship model`,

    inputSchema: ImageGenerationSchema,

    execute: async (input: ImageGenerationInput) => {
      try {
        const modelId = input.model || defaultModel;
        const size = input.size || defaultSize;
        const style = input.style || defaultStyle;
        const n = Math.min(input.n || 1, maxImages);

        // Validate model is allowed
        if (config?.allowedModels && !config.allowedModels.includes(modelId)) {
          return {
            success: false,
            error: `Model ${modelId} is not allowed in this mode. Allowed models: ${config.allowedModels.join(', ')}`,
          };
        }

        logger.log('[Image Tool] Generating image:', {
          model: modelId,
          prompt: input.prompt.substring(0, 100) + '...',
          size,
          n,
        });

        // Get image model from provider
        // OpenAI: Use direct provider
        // Google: Use gateway (which routes to Google API)
        let imageModel;
        
        if (modelId.startsWith('openai/')) {
          const modelName = modelId.replace('openai/', '') as 'dall-e-3' | 'dall-e-2' | 'gpt-image-1';
          imageModel = openai.image(modelName);
        } else if (modelId.startsWith('google/')) {
          // For Google models, use gateway which handles routing
          // The gateway should support image models via the model ID format
          // Note: Google image generation may use language models with image capabilities
          // For now, we'll try gateway first, and if that doesn't work, we'll need
          // to check if @ai-sdk/google has image() method or use a different approach
          
          // Try gateway - it may support image models
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gatewayImageModel = (gateway as any).imageModel?.(modelId);
          if (gatewayImageModel) {
            imageModel = gatewayImageModel;
          } else {
            // Fallback: For Gemini Flash Image, it might be accessed via language model
            // with image generation capabilities, or we need to wait for SDK support
            // For now, throw a helpful error
            throw new Error(
              `Google image model ${modelId} is not yet fully supported. ` +
              `Please use OpenAI models (dall-e-3, dall-e-2) for now, or check if the gateway supports this model.`
            );
          }
        } else {
          throw new Error(`Unsupported image model: ${modelId}`);
        }
        
        if (!imageModel) {
          throw new Error(`Could not create image model for ${modelId}`);
        }

        // Generate the image
        const result = await generateImage({
          model: imageModel,
          prompt: input.prompt,
          size,
          n,
          providerOptions: modelId.startsWith('openai/') ? {
            openai: { style },
          } : {},
        });

        logger.log('[Image Tool] Image generated successfully:', {
          imageCount: result.images.length,
          model: modelId,
        });

        return {
          success: true,
          images: result.images.map((img, i) => ({
            index: i,
            base64: img.base64,
            url: (img as { url?: string }).url,
            revisedPrompt: (img as { revisedPrompt?: string }).revisedPrompt || input.prompt,
          })),
          model: modelId,
          originalPrompt: input.prompt,
          size,
        };
      } catch (error) {
        logger.error('[Image Tool] Error generating image:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate image',
        };
      }
    },
  });
}

