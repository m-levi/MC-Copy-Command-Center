import { act, renderHook } from '@testing-library/react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const createBeforeInstallPromptEvent = (): BeforeInstallPromptEvent => {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
  Object.defineProperty(event, 'platforms', {
    value: ['web'],
    configurable: true,
  });
  Object.defineProperty(event, 'prompt', {
    value: jest.fn().mockResolvedValue(undefined),
    configurable: true,
  });
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    configurable: true,
  });
  return event;
};

describe('usePWAInstall', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to non-installable state', () => {
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it('becomes installable after beforeinstallprompt event', () => {
    const { result } = renderHook(() => usePWAInstall());

    act(() => {
      window.dispatchEvent(createBeforeInstallPromptEvent());
    });

    expect(result.current.canInstall).toBe(true);
  });

  it('dismisses install prompt and stores dismiss marker', () => {
    const { result } = renderHook(() => usePWAInstall());

    act(() => {
      window.dispatchEvent(createBeforeInstallPromptEvent());
    });

    expect(result.current.canInstall).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.canInstall).toBe(false);
    expect(localStorage.getItem('pwa_install_prompt_dismissed_at')).toBeTruthy();
  });
});

