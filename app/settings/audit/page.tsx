'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface AuditLog {
  id: string;
  event_type: string;
  ip_address: string | null;
  created_at: string;
}

export default function AuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: auditData } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (auditData) setAuditLogs(auditData);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login':
        return '🔓';
      case 'logout':
        return '🔒';
      case 'password_change':
        return '🔑';
      case 'failed_login':
        return '❌';
      case 'account_locked':
        return '🚫';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Security Audit Log
      </h2>
      
      {auditLogs.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No security events</p>
      ) : (
        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getEventIcon(log.event_type)}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {log.event_type.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {log.ip_address && `IP: ${log.ip_address}`}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {formatDate(log.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




















