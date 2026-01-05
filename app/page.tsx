'use client';

import { useEffect, useState, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand, Organization, OrganizationRole, ConversationMode } from '@/types';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { logger } from '@/lib/logger';
import { MoonCommerceLogo } from '@/components/MoonCommerceLogo';
import { RequestCoalescer } from '@/lib/performance-utils';
import { PERSONAL_AI_INFO } from '@/lib/personal-ai';
import { AI_MODELS } from '@/lib/ai-models';
import { useEnabledModels } from '@/hooks/useEnabledModels';
import { Menu, Settings, Users, LogOut } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

// Home components
import {
  HomeSidebar,
  HomeGreeting,
  HomeComposeBox,
  ClientPickerChips,
  QuickActionPresets,
} from '@/components/home';

// Lazy load the modal since it's not needed on initial render
const BrandModal = lazy(() => import('@/components/BrandModal'));

export const dynamic = 'force-dynamic';

interface Conversation {
  id: string;
  title: string;
  brand_id: string;
  updated_at: string;
  last_message_preview?: string;
}

export default function HomePage() {
  // Data state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandActivityMap, setBrandActivityMap] = useState<Map<string, string>>(new Map());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [canManageBrands, setCanManageBrands] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  // UI state
  const [selectedBrandId, setSelectedBrandId] = useState<string>(PERSONAL_AI_INFO.id);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [mode, setMode] = useState<ConversationMode>('planning');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const { models: enabledModels, defaultModel } = useEnabledModels();
  const supabase = createClient();
  const router = useRouter();
  const requestCoalescerRef = useRef(new RequestCoalescer<void>());

  // Recent brand IDs from activity map
  const recentBrandIds = useMemo(() => {
    if (!brandActivityMap || brandActivityMap.size === 0) return [];
    return [...brandActivityMap.entries()]
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .slice(0, 3)
      .map(([brandId]) => brandId);
  }, [brandActivityMap]);

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('homeSidebarCollapsed');
    if (saved) setIsSidebarCollapsed(saved === 'true');
  }, []);

  // Save sidebar state
  useEffect(() => {
    localStorage.setItem('homeSidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Set default model when loaded
  useEffect(() => {
    if (defaultModel && enabledModels.some(m => m.id === defaultModel)) {
      setSelectedModel(defaultModel);
    } else if (enabledModels.length > 0) {
      setSelectedModel(enabledModels[0].id);
    }
  }, [defaultModel, enabledModels]);

  // Load data
  const loadData = useCallback(async (silent = false) => {
    return requestCoalescerRef.current.execute(async () => {
      try {
        if (!silent) setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setCurrentUserId(user.id);

        // Get user's organization membership
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('role, organization_id')
          .eq('user_id', user.id)
          .single();

        if (memberError || !memberData) {
          toast.error('You are not part of any organization. Please contact an admin.');
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        const role = memberData.role as OrganizationRole;
        const orgId = memberData.organization_id;

        // Parallelize: org details, brands, and conversations all have their dependencies
        const [orgResult, brandsResult, conversationsResult] = await Promise.all([
          // Get organization details
          supabase
            .from('organizations')
            .select('id, name, slug')
            .eq('id', orgId)
            .single(),

          // Load brands (uses org id from membership)
          supabase
            .from('brands')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false }),

          // Load conversations (uses user id)
          supabase
            .from('conversations')
            .select('id, title, updated_at, brand_id, last_message_preview')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(100),
        ]);

        // Process organization result
        if (orgResult.error || !orgResult.data) {
          toast.error('Failed to load organization details.');
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        const org = orgResult.data as Organization;
        setOrganization(org);
        setUserRole(role);
        setCanManageBrands(role === 'admin' || role === 'brand_manager');

        // Process brands result
        if (brandsResult.error) throw brandsResult.error;
        setBrands(brandsResult.data || []);

        // Process conversations result
        if (conversationsResult.data) {
          const activityMap = new Map<string, string>();
          conversationsResult.data.forEach(item => {
            if (!activityMap.has(item.brand_id)) {
              activityMap.set(item.brand_id, item.updated_at);
            }
          });
          setBrandActivityMap(activityMap);
          setConversations(conversationsResult.data);
        }

      } catch (error: any) {
        logger.error('Error loading data:', error);
        toast.error(error.message || 'Failed to load data');
      } finally {
        if (!silent) setLoading(false);
      }
    });
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [supabase, router]);

  const handleNewChat = useCallback(() => {
    router.push(`/brands/${selectedBrandId}/chat`);
  }, [router, selectedBrandId]);

  const handleBrandSelect = useCallback((brandId: string) => {
    setSelectedBrandId(brandId);
  }, []);

  const handleCreateBrand = useCallback(() => {
    setEditingBrand(null);
    setIsModalOpen(true);
  }, []);

  const handleSaveBrand = useCallback(async (brandData: Partial<Brand>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !organization) return;

    try {
      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update({
            ...brandData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBrand.id);

        if (error) throw error;
        toast.success('Brand updated successfully');
      } else {
        const { error } = await supabase
          .from('brands')
          .insert({
            ...brandData,
            user_id: user.id,
            organization_id: organization.id,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success('Brand created successfully');
      }

      if (editingBrand) {
        setIsModalOpen(false);
      }
      await loadData(true);
    } catch (error: any) {
      logger.error('Error saving brand:', error);
      toast.error(error.message || 'Failed to save brand');
    }
  }, [editingBrand, organization, supabase, loadData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Cmd/Ctrl + N to create brand
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        if (canManageBrands) handleCreateBrand();
      }

      // Cmd/Ctrl + K to focus composer
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const textarea = document.querySelector('textarea');
        if (textarea) textarea.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canManageBrands, handleCreateBrand]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950 flex animate-in fade-in duration-300">
        <Toaster position="top-right" />

        {/* Sidebar Skeleton */}
        <div className="hidden lg:flex flex-col w-[260px] h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
          <div className="h-14 flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 p-3">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="flex-1 p-3 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-2xl">
            <div className="h-10 w-64 mx-auto mb-8 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="flex gap-2 justify-center mb-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
              ))}
            </div>
            <div className="h-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#fafafa] dark:bg-gray-950 animate-in fade-in duration-300">
      <Toaster position="top-right" />

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-[300px] sm:w-[340px] z-50 lg:hidden bg-white dark:bg-gray-900 flex flex-col animate-in slide-in-from-left duration-200">
            <HomeSidebar
              brands={brands}
              conversations={conversations}
              recentBrandIds={recentBrandIds}
              onBrandSelect={handleBrandSelect}
              onNewChat={handleNewChat}
              onCreateBrand={handleCreateBrand}
              onEditBrand={(brand) => {
                setEditingBrand(brand);
                setIsModalOpen(true);
              }}
              canManageBrands={canManageBrands}
              isMobile
              onMobileClose={() => setIsMobileSidebarOpen(false)}
            />
          </aside>
        </>
      )}

      {/* Desktop Layout with Resizable Panels */}
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full hidden lg:flex"
        autoSaveId="home-layout-panels"
      >
        {/* Sidebar Panel */}
        <ResizablePanel
          id="home-sidebar-panel"
          defaultSize={20}
          minSize={15}
          maxSize={35}
          collapsible
          collapsedSize={4}
          onCollapse={() => setIsSidebarCollapsed(true)}
          onExpand={() => setIsSidebarCollapsed(false)}
        >
          <HomeSidebar
            brands={brands}
            conversations={conversations}
            recentBrandIds={recentBrandIds}
            onBrandSelect={handleBrandSelect}
            onNewChat={handleNewChat}
            onCreateBrand={handleCreateBrand}
            onEditBrand={(brand) => {
              setEditingBrand(brand);
              setIsModalOpen(true);
            }}
            canManageBrands={canManageBrands}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </ResizablePanel>

        {/* Resize Handle */}
        <ResizableHandle withHandle />

        {/* Main Content Panel */}
        <ResizablePanel id="home-main-panel" defaultSize={80} minSize={50}>
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="h-14 flex items-center justify-end px-4 border-b border-gray-100 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
              {/* Right-side icons */}
              <div className="flex items-center gap-1">
                {userRole === 'admin' && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    title="Team"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                )}
                <NotificationCenter />
                <button
                  onClick={() => router.push('/settings')}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 lg:px-6 py-8 lg:py-12 overflow-auto">
              <div className="w-full max-w-2xl">
                {/* Greeting */}
                <HomeGreeting />

                {/* Client Picker Chips */}
                <ClientPickerChips
                  brands={brands}
                  selectedBrandId={selectedBrandId}
                  onBrandSelect={handleBrandSelect}
                />

                {/* Compose Box */}
                <HomeComposeBox
                  selectedBrandId={selectedBrandId}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  mode={mode}
                  onModeChange={setMode}
                />

                {/* Quick Action Presets */}
                <QuickActionPresets
                  brands={brands}
                  selectedBrandId={selectedBrandId}
                />
              </div>
            </main>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Mobile Layout */}
      <div className="flex flex-col h-full lg:hidden">
        {/* Mobile Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <MoonCommerceLogo className="h-4 w-auto text-gray-900 dark:text-white" />
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <button
              onClick={() => router.push('/settings')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-auto">
          <div className="w-full max-w-2xl">
            <HomeGreeting />
            <ClientPickerChips
              brands={brands}
              selectedBrandId={selectedBrandId}
              onBrandSelect={handleBrandSelect}
            />
            <HomeComposeBox
              selectedBrandId={selectedBrandId}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              mode={mode}
              onModeChange={setMode}
            />
            <QuickActionPresets
              brands={brands}
              selectedBrandId={selectedBrandId}
            />
          </div>
        </main>
      </div>

      {/* Brand Modal */}
      <Suspense fallback={null}>
        {isModalOpen && (
          <BrandModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingBrand(null);
            }}
            onSave={handleSaveBrand}
            brand={editingBrand}
          />
        )}
      </Suspense>
    </div>
  );
}
