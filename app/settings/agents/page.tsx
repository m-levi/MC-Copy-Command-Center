'use client'

/**
 * Marketing Agent Settings Page
 * Configure daily/weekly insights, manage preferences, and manually trigger analysis
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { Loader2, Sparkles, TrendingUp, Calendar } from 'lucide-react'

interface AgentSettings {
  id?: string
  daily_enabled: boolean
  weekly_enabled: boolean
  preferred_hour: number
  timezone: string
  topics: string[]
  email_digest: boolean
}

interface Brand {
  id: string
  name: string
}

export default function AgentSettingsPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [settings, setSettings] = useState<AgentSettings>({
    daily_enabled: true,
    weekly_enabled: true,
    preferred_hour: 9,
    timezone: 'America/New_York',
    topics: ['campaigns', 'strategies', 'trends'],
    email_digest: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [triggeringDaily, setTriggeringDaily] = useState(false)
  const [triggeringWeekly, setTriggeringWeekly] = useState(false)
  const [lastRuns, setLastRuns] = useState<any[]>([])

  const supabase = createClient()

  // Load brands on mount
  useEffect(() => {
    loadBrands()
  }, [])

  // Load settings when brand selected
  useEffect(() => {
    if (selectedBrandId) {
      loadSettings()
      loadLastRuns()
    }
  }, [selectedBrandId])

  async function loadBrands() {
    try {
      // Use the API route which handles the query correctly
      const response = await fetch('/api/brands')
      if (!response.ok) {
        throw new Error('Failed to fetch brands')
      }

      const data = await response.json()

      setBrands(data || [])
      if (data && data.length > 0 && !selectedBrandId) {
        setSelectedBrandId(data[0].id)
      }
    } catch (error) {
      console.error('Error loading brands:', error)
      toast.error('Failed to load brands')
    } finally {
      setLoading(false)
    }
  }

  async function loadSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('brand_agent_settings')
        .select('*')
        .eq('brand_id', selectedBrandId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's okay, we'll use defaults
        throw error
      }

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load settings')
    }
  }

  async function loadLastRuns() {
    try {
      const { data, error } = await supabase
        .from('agent_insights')
        .select('id, insight_type, trigger_source, status, started_at, completed_at, conversation_id')
        .eq('brand_id', selectedBrandId)
        .order('started_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setLastRuns(data || [])
    } catch (error) {
      console.error('Error loading last runs:', error)
    }
  }

  async function saveSettings() {
    if (!selectedBrandId) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        brand_id: selectedBrandId,
        user_id: user.id,
        ...settings,
      }

      const { error } = await supabase
        .from('brand_agent_settings')
        .upsert(payload, {
          onConflict: 'brand_id,user_id',
        })

      if (error) throw error

      toast.success('Settings saved successfully')
      loadSettings() // Reload to get the ID if newly created
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function triggerInsights(type: 'daily' | 'weekly') {
    if (!selectedBrandId) return

    const setLoading = type === 'daily' ? setTriggeringDaily : setTriggeringWeekly

    setLoading(true)
    try {
      const response = await fetch('/api/agents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          type,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to trigger insights')
      }

      const result = await response.json()

      toast.success(
        `${type === 'daily' ? 'Daily' : 'Weekly'} insights are being generated! Check your conversations in a moment.`,
        { duration: 5000 }
      )

      // Reload last runs after a delay to see the new insight
      setTimeout(() => loadLastRuns(), 2000)
    } catch (error) {
      console.error('Error triggering insights:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to trigger insights')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Marketing Agent Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure automated insights and analysis for your brands
        </p>
      </div>

      {/* Brand Selection */}
      {brands.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {selectedBrandId && (
        <>
          {/* Manual Trigger */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Manual Trigger
              </CardTitle>
              <CardDescription>
                Generate insights on-demand for testing or immediate needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => triggerInsights('daily')}
                  disabled={triggeringDaily}
                  className="flex-1"
                >
                  {triggeringDaily ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Calendar className="w-4 h-4 mr-2" /> Generate Daily Insights</>
                  )}
                </Button>
                <Button
                  onClick={() => triggerInsights('weekly')}
                  disabled={triggeringWeekly}
                  variant="secondary"
                  className="flex-1"
                >
                  {triggeringWeekly ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><TrendingUp className="w-4 h-4 mr-2" /> Generate Weekly Report</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Automated Insights</CardTitle>
              <CardDescription>
                Configure when and how the marketing agent analyzes your brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="daily">Daily Insights</Label>
                  <div className="text-sm text-muted-foreground">
                    Quick campaign ideas every morning
                  </div>
                </div>
                <Switch
                  id="daily"
                  checked={settings.daily_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, daily_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly">Weekly Strategic Review</Label>
                  <div className="text-sm text-muted-foreground">
                    Comprehensive analysis every Monday
                  </div>
                </div>
                <Switch
                  id="weekly"
                  checked={settings.weekly_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, weekly_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email">Email Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Get notified via email when insights are ready
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={settings.email_digest}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, email_digest: checked })
                  }
                />
              </div>

              <div className="pt-4">
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {lastRuns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Insights</CardTitle>
                <CardDescription>
                  Last 5 insight generations for this brand
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lastRuns.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium capitalize">
                          {run.insight_type} ({run.trigger_source})
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(run.started_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            run.status === 'completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : run.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {run.status}
                        </span>
                        {run.conversation_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              router.push(`/brands/${selectedBrandId}/chat?conversation=${run.conversation_id}`)
                            }}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}















