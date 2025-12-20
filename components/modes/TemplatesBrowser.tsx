'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ModeTemplate, TEMPLATE_CATEGORY_META } from '@/lib/mode-templates';
import { ModeColor, MODE_COLOR_META } from '@/types';

interface TemplatesBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFromTemplate: (mode: any) => void;
}

type Category = keyof typeof TEMPLATE_CATEGORY_META;

export default function TemplatesBrowser({ isOpen, onClose, onCreateFromTemplate }: TemplatesBrowserProps) {
  const [templates, setTemplates] = useState<ModeTemplate[]>([]);
  const [categories, setCategories] = useState<typeof TEMPLATE_CATEGORY_META>(TEMPLATE_CATEGORY_META);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ModeTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/modes/templates?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const debounce = setTimeout(loadTemplates, 300);
      return () => clearTimeout(debounce);
    }
  }, [selectedCategory, searchQuery]);

  const handleCreateFromTemplate = async (template: ModeTemplate) => {
    setCreating(true);
    try {
      const response = await fetch('/api/modes/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: template.id }),
      });

      if (!response.ok) throw new Error('Failed to create mode');

      const newMode = await response.json();
      toast.success(`Created "${template.name}" mode!`);
      onCreateFromTemplate(newMode);
      onClose();
    } catch (error) {
      console.error('Error creating from template:', error);
      toast.error('Failed to create mode from template');
    } finally {
      setCreating(false);
    }
  };

  const getColorClasses = (color: ModeColor) => {
    const meta = MODE_COLOR_META[color];
    return `${meta.bg} ${meta.text} ${meta.darkBg} ${meta.darkText}`;
  };

  const getDifficultyColor = (difficulty: ModeTemplate['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'advanced': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(query) ||
             t.description.toLowerCase().includes(query) ||
             t.tags.some(tag => tag.includes(query));
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/30 dark:to-pink-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mode Templates</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start with a pre-built template and customize it
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Categories */}
          <div className="w-56 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex flex-col">
            <div className="p-4">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                All Templates
                <span className="ml-2 text-xs text-gray-500">({templates.length})</span>
              </button>

              <div className="mt-4 space-y-1">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</p>
                {Object.entries(categories).map(([key, meta]) => {
                  const count = templates.filter(t => t.category === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key as Category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        selectedCategory === key
                          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span className="flex-1">{meta.label}</span>
                      <span className="text-xs text-gray-500">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Templates Grid */}
            <div className={`${selectedTemplate ? 'w-1/2' : 'w-full'} overflow-y-auto p-4`}>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No templates found
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`text-left p-4 rounded-lg border transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${getColorClasses(template.color)}`}>
                          {template.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {template.name}
                            </h3>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getDifficultyColor(template.difficulty)}`}>
                              {template.difficulty}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                {tag}
                              </span>
                            ))}
                            {template.tags.length > 3 && (
                              <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
                                +{template.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-800/30">
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <span className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${getColorClasses(selectedTemplate.color)}`}>
                      {selectedTemplate.icon}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedTemplate.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {selectedTemplate.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getDifficultyColor(selectedTemplate.difficulty)}`}>
                          {selectedTemplate.difficulty}
                        </span>
                        <span className="text-xs text-gray-500">
                          {categories[selectedTemplate.category]?.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Use Cases */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Best For</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.use_cases.map((useCase, i) => (
                        <span key={i} className="px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplate.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Preview */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">System Prompt Preview</h4>
                    <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                        {selectedTemplate.system_prompt.substring(0, 800)}
                        {selectedTemplate.system_prompt.length > 800 && '...'}
                      </pre>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleCreateFromTemplate(selectedTemplate)}
                    disabled={creating}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Use This Template
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


