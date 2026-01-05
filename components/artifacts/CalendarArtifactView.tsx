'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MailIcon,
  XIcon,
  ClockIcon,
  TagIcon,
  FileTextIcon,
  MessageSquareIcon,
  SendIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarSlot, CalendarArtifactMetadata } from '@/types/artifacts';

interface CalendarArtifactViewProps {
  slots: CalendarSlot[];
  month: string; // YYYY-MM format
  title: string;
  metadata?: CalendarArtifactMetadata;
  className?: string;
  isStreaming?: boolean;
  onSlotClick?: (slot: CalendarSlot) => void;
  onCreateEmail?: (slot: CalendarSlot) => void;
}

// Email type colors and icons
const EMAIL_TYPE_CONFIG: Record<string, { color: string; bgColor: string; icon: typeof MailIcon }> = {
  promotional: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
    icon: TagIcon
  },
  content: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: FileTextIcon
  },
  announcement: {
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
    icon: MessageSquareIcon
  },
  transactional: {
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    icon: SendIcon
  },
  nurture: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: MailIcon
  },
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-400',
  scheduled: 'bg-blue-500',
  sent: 'bg-green-500',
  approved: 'bg-emerald-500',
  pending: 'bg-yellow-500',
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_OF_WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get days in a month for calendar grid
 */
function getCalendarDays(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Add days from previous month
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  // Add days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Add days from next month to complete the grid
  const remainingDays = 42 - days.length; // 6 rows * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  return days;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calendar Artifact View - Visual email calendar with scheduled items
 */
export const CalendarArtifactView = memo(function CalendarArtifactView({
  slots,
  month,
  title,
  metadata,
  className = '',
  isStreaming = false,
  onSlotClick,
  onCreateEmail,
}: CalendarArtifactViewProps) {
  // Parse month from YYYY-MM format
  const [yearStr, monthStr] = month.split('-');
  const initialYear = parseInt(yearStr, 10);
  const initialMonth = parseInt(monthStr, 10) - 1; // JS months are 0-indexed

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);

  // Get calendar days for current view
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map: Record<string, CalendarSlot[]> = {};
    slots.forEach(slot => {
      const dateKey = slot.date.split('T')[0]; // Handle both YYYY-MM-DD and ISO dates
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(slot);
    });
    return map;
  }, [slots]);

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [viewMonth]);

  const handleSlotClick = useCallback((slot: CalendarSlot) => {
    setSelectedSlot(slot);
    onSlotClick?.(slot);
  }, [onSlotClick]);

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {slots.length} email{slots.length !== 1 ? 's' : ''} scheduled
                {isStreaming && (
                  <span className="ml-2 inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                    Building calendar...
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="min-w-[140px] text-center font-medium text-gray-900 dark:text-white text-sm">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Days of week header */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_OF_WEEK.map(day => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const dateKey = formatDateKey(day.date);
            const daySlots = slotsByDate[dateKey] || [];
            const isToday = formatDateKey(new Date()) === dateKey;

            return (
              <motion.div
                key={`${dateKey}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.005 }}
                className={cn(
                  'min-h-[100px] p-1.5 rounded-lg border transition-colors',
                  day.isCurrentMonth
                    ? 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-50',
                  isToday && 'ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-gray-900'
                )}
              >
                {/* Date number */}
                <div className={cn(
                  'text-xs font-medium mb-1',
                  day.isCurrentMonth
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-600',
                  isToday && 'text-violet-600 dark:text-violet-400'
                )}>
                  {day.date.getDate()}
                </div>

                {/* Email slots for this day */}
                <div className="space-y-1">
                  {daySlots.map((slot, slotIndex) => {
                    const typeConfig = EMAIL_TYPE_CONFIG[slot.email_type || 'content'] || EMAIL_TYPE_CONFIG.content;
                    const TypeIcon = typeConfig.icon;

                    return (
                      <motion.button
                        key={slot.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: slotIndex * 0.05 }}
                        onClick={() => handleSlotClick(slot)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-md text-xs border transition-all cursor-pointer',
                          'hover:scale-[1.02] hover:shadow-sm',
                          typeConfig.bgColor
                        )}
                      >
                        <div className="flex items-start gap-1.5">
                          <TypeIcon className={cn('w-3 h-3 mt-0.5 flex-shrink-0', typeConfig.color)} />
                          <span className={cn('font-medium truncate', typeConfig.color)}>
                            {slot.title}
                          </span>
                        </div>
                        {slot.timing && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                            <ClockIcon className="w-2.5 h-2.5" />
                            {slot.timing}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Email Types:</span>
          {Object.entries(EMAIL_TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <div key={type} className="flex items-center gap-1.5">
                <Icon className={cn('w-3 h-3', config.color)} />
                <span className="text-gray-600 dark:text-gray-300 capitalize">{type}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slot Detail Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedSlot(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className={cn(
                'px-6 py-4 border-b',
                EMAIL_TYPE_CONFIG[selectedSlot.email_type || 'content']?.bgColor || 'bg-gray-100 dark:bg-gray-700'
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const config = EMAIL_TYPE_CONFIG[selectedSlot.email_type || 'content'] || EMAIL_TYPE_CONFIG.content;
                      const Icon = config.icon;
                      return (
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          config.color,
                          'bg-white/80 dark:bg-gray-900/50'
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {selectedSlot.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                          {selectedSlot.email_type || 'Email'}
                        </span>
                        {selectedSlot.status && (
                          <>
                            <span className="text-gray-400">•</span>
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                'w-2 h-2 rounded-full',
                                STATUS_COLORS[selectedSlot.status] || 'bg-gray-400'
                              )} />
                              <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                                {selectedSlot.status}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* Date & Time */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(selectedSlot.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    {selectedSlot.timing && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedSlot.timing}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedSlot.description && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedSlot.description}
                    </p>
                  </div>
                )}

                {/* Action Button */}
                {onCreateEmail && !selectedSlot.email_artifact_id && (
                  <button
                    onClick={() => {
                      onCreateEmail(selectedSlot);
                      setSelectedSlot(null);
                    }}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all',
                      'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
                      'hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5'
                    )}
                  >
                    <MailIcon className="w-4 h-4" />
                    Create Email for This Slot
                  </button>
                )}

                {selectedSlot.email_artifact_id && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <MailIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Email created
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default CalendarArtifactView;
