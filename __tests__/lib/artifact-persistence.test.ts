import { persistArtifactFromToolInput } from '@/lib/chat/artifact-persistence';

function buildSupabaseMock(insertResult: { data: unknown; error: { message: string } | null }) {
  const single = jest.fn().mockResolvedValue(insertResult);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  const from = jest.fn().mockReturnValue({ insert });
  return { from, insert, select, single };
}

describe('persistArtifactFromToolInput', () => {
  it('rejects artifact kinds not allowed by mode', async () => {
    const supabase = buildSupabaseMock({ data: null, error: null });

    const result = await persistArtifactFromToolInput({
      supabase: supabase as unknown as Parameters<typeof persistArtifactFromToolInput>[0]['supabase'],
      conversationId: 'conv-1',
      userId: 'user-1',
      brandId: 'brand-1',
      allowedKinds: ['calendar'],
      toolInput: {
        kind: 'email',
        title: 'Email',
        content: '<version_a>Long enough content for artifact creation validation and persistence to pass the length threshold.</version_a><version_b>Alternative content.</version_b><version_c>Third variation.</version_c>',
      },
      userMessage: 'create an artifact',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('not allowed');
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('persists valid artifact payload and returns saved artifact metadata', async () => {
    const supabase = buildSupabaseMock({
      data: { id: 'artifact-123', kind: 'email', title: 'Launch Email' },
      error: null,
    });

    const result = await persistArtifactFromToolInput({
      supabase: supabase as unknown as Parameters<typeof persistArtifactFromToolInput>[0]['supabase'],
      conversationId: 'conv-1',
      userId: 'user-1',
      brandId: 'brand-1',
      toolInput: {
        kind: 'email',
        title: 'Launch Email',
        content:
          '<version_a>This launch email outlines value proposition, customer segment fit, and a strong CTA with sufficient body length to exceed artifact thresholds.</version_a><version_b>Second variant with different hook and incentive.</version_b><version_c>Third variant optimized for urgency and trust.</version_c>',
        versions: [
          { id: 'a', content: 'A content body that is sufficiently descriptive.' },
          { id: 'b', content: 'B content body that is sufficiently descriptive.' },
          { id: 'c', content: 'C content body that is sufficiently descriptive.' },
        ],
      },
      userMessage: 'Please create an email artifact',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artifact.id).toBe('artifact-123');
      expect(result.artifact.kind).toBe('email');
      expect(result.artifact.title).toBe('Launch Email');
    }
    expect(supabase.from).toHaveBeenCalledWith('artifacts');
  });
});
