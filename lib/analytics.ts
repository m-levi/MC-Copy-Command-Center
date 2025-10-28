/**
 * Analytics and event tracking
 */

export type EventCategory = 
  | 'chat'
  | 'message'
  | 'conversation'
  | 'performance'
  | 'error'
  | 'ui';

export interface AnalyticsEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private maxEvents: number = 500;
  private enabled: boolean = true;

  /**
   * Track an event
   */
  track(
    category: EventCategory,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      category,
      action,
      label,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.events.push(event);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Analytics] ${category}.${action}`, { label, value, metadata });
    }
  }

  /**
   * Get events by category
   */
  getEvents(category?: EventCategory, limit?: number): AnalyticsEvent[] {
    let filtered = category 
      ? this.events.filter((e) => e.category === category)
      : this.events;

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Get event count
   */
  getEventCount(category?: EventCategory, action?: string): number {
    return this.events.filter((e) => {
      if (category && e.category !== category) return false;
      if (action && e.action !== action) return false;
      return true;
    }).length;
  }

  /**
   * Get most common actions
   */
  getMostCommonActions(category?: EventCategory, limit: number = 10): Array<{
    action: string;
    count: number;
  }> {
    const events = category 
      ? this.events.filter((e) => e.category === category)
      : this.events;

    const actionCounts = new Map<string, number>();

    events.forEach((e) => {
      const key = `${e.category}.${e.action}`;
      actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
    });

    return Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get average value for an action
   */
  getAverageValue(category: EventCategory, action: string): number {
    const events = this.events.filter(
      (e) => e.category === category && e.action === action && e.value !== undefined
    );

    if (events.length === 0) return 0;

    const sum = events.reduce((acc, e) => acc + (e.value || 0), 0);
    return sum / events.length;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Export events as JSON
   */
  export(): string {
    return JSON.stringify({
      events: this.events,
      summary: {
        totalEvents: this.events.length,
        byCategory: {
          chat: this.getEventCount('chat'),
          message: this.getEventCount('message'),
          conversation: this.getEventCount('conversation'),
          performance: this.getEventCount('performance'),
          error: this.getEventCount('error'),
          ui: this.getEventCount('ui'),
        },
        mostCommon: this.getMostCommonActions(undefined, 5),
      },
      timestamp: Date.now(),
    }, null, 2);
  }
}

// Global instance
export const analytics = new Analytics();

// Convenience methods for common events

export function trackMessageSent(metadata?: Record<string, any>): void {
  analytics.track('message', 'send', undefined, undefined, metadata);
}

export function trackMessageRegenerated(metadata?: Record<string, any>): void {
  analytics.track('message', 'regenerate', undefined, undefined, metadata);
}

export function trackMessageEdited(metadata?: Record<string, any>): void {
  analytics.track('message', 'edit', undefined, undefined, metadata);
}

export function trackSectionRegenerated(sectionType: string, metadata?: Record<string, any>): void {
  analytics.track('message', 'regenerate_section', sectionType, undefined, metadata);
}

export function trackConversationCreated(metadata?: Record<string, any>): void {
  analytics.track('conversation', 'create', undefined, undefined, metadata);
}

export function trackConversationDeleted(metadata?: Record<string, any>): void {
  analytics.track('conversation', 'delete', undefined, undefined, metadata);
}

export function trackConversationSwitched(metadata?: Record<string, any>): void {
  analytics.track('conversation', 'switch', undefined, undefined, metadata);
}

export function trackQuickAction(action: string, metadata?: Record<string, any>): void {
  analytics.track('chat', 'quick_action', action, undefined, metadata);
}

export function trackModelSwitch(fromModel: string, toModel: string): void {
  analytics.track('chat', 'model_switch', undefined, undefined, { fromModel, toModel });
}

export function trackStreamInterruption(reason: string): void {
  analytics.track('error', 'stream_interruption', reason);
}

export function trackError(error: Error, context?: string): void {
  analytics.track('error', 'exception', context, undefined, {
    message: error.message,
    stack: error.stack,
  });
}

export function trackResponseSpeed(speed: 'fast' | 'medium' | 'slow', duration: number): void {
  analytics.track('performance', 'response_speed', speed, duration);
}

export function trackCacheHit(hit: boolean): void {
  analytics.track('performance', 'cache', hit ? 'hit' : 'miss', hit ? 1 : 0);
}

export function trackDraftSaved(): void {
  analytics.track('chat', 'draft_saved');
}

export function trackDraftRestored(): void {
  analytics.track('chat', 'draft_restored');
}

export function trackOfflineMode(isOffline: boolean): void {
  analytics.track('chat', 'offline', isOffline ? 'offline' : 'online');
}

export function trackCopyAction(what: 'message' | 'section'): void {
  analytics.track('ui', 'copy', what);
}

export function trackViewToggle(view: 'markdown' | 'sections'): void {
  analytics.track('ui', 'view_toggle', view);
}

/**
 * Generic event tracking (wrapper)
 */
export function trackEvent(eventName: string, metadata?: Record<string, any>): void {
  analytics.track('chat', eventName, JSON.stringify(metadata || {}));
}

/**
 * Performance tracking (wrapper)
 */
export function trackPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
  const category = duration < 100 ? 'fast' : duration < 500 ? 'medium' : 'slow';
  analytics.track('performance', operation, `${duration}ms (${category})`);
  
  if (metadata) {
    analytics.track('performance', `${operation}_details`, JSON.stringify(metadata));
  }
}

