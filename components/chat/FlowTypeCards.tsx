'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FlowType, FlowTemplate } from '@/types';
import { FLOW_TEMPLATES } from '@/lib/flow-templates';
import { 
  Gift, 
  ShoppingCart, 
  Eye, 
  ArrowLeft, 
  Heart, 
  Mail, 
  Rocket, 
  BookOpen, 
  Search,
  Sparkles
} from 'lucide-react';

interface FlowTypeCardsProps {
  onSelectType: (type: FlowType) => void;
  isLoading?: boolean;
  selectedType?: FlowType | null;
}

// Map flow type IDs to Lucide icons
const flowTypeIcons: Record<FlowType, React.ReactNode> = {
  welcome_series: <Gift className="w-5 h-5" />,
  abandoned_cart: <ShoppingCart className="w-5 h-5" />,
  browse_abandonment: <Eye className="w-5 h-5" />,
  site_abandonment: <ArrowLeft className="w-5 h-5" />,
  post_purchase: <Heart className="w-5 h-5" />,
  winback: <Mail className="w-5 h-5" />,
  product_launch: <Rocket className="w-5 h-5" />,
  educational_series: <BookOpen className="w-5 h-5" />,
  do_your_research: <Search className="w-5 h-5" />,
};

// Category colors
const categoryColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  transactional: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'bg-blue-500 dark:bg-blue-600'
  },
  promotional: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'bg-purple-500 dark:bg-purple-600'
  },
  nurture: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'bg-emerald-500 dark:bg-emerald-600'
  }
};

function FlowTypeCard({ 
  template, 
  onSelect, 
  isSelected,
  isLoading,
  index 
}: { 
  template: FlowTemplate; 
  onSelect: () => void;
  isSelected: boolean;
  isLoading?: boolean;
  index: number;
}) {
  const colors = categoryColors[template.category] || categoryColors.transactional;
  const icon = flowTypeIcons[template.id] || <Sparkles className="w-5 h-5" />;
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={onSelect}
      disabled={isLoading}
      className={`
        relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200
        ${isSelected 
          ? 'border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-950/40 ring-2 ring-violet-500/20' 
          : `${colors.border} ${colors.bg} hover:border-violet-400 dark:hover:border-violet-500`
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
        text-left w-full
      `}
    >
      {/* Icon */}
      <div className={`
        p-2.5 rounded-lg mb-3 text-white
        ${isSelected ? 'bg-violet-500' : colors.icon}
      `}>
        {icon}
      </div>
      
      {/* Content */}
      <h4 className={`
        font-semibold text-sm mb-1
        ${isSelected ? 'text-violet-700 dark:text-violet-300' : 'text-gray-900 dark:text-gray-100'}
      `}>
        {template.name}
      </h4>
      
      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
        {template.description}
      </p>
      
      {/* Email count badge */}
      <span className={`
        text-[10px] font-medium px-2 py-0.5 rounded-full
        ${isSelected 
          ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }
      `}>
        {template.defaultEmailCount} emails
      </span>
      
      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center"
        >
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}

export function FlowTypeCards({ onSelectType, isLoading, selectedType }: FlowTypeCardsProps) {
  // Group templates by category
  const transactional = FLOW_TEMPLATES.filter(t => t.category === 'transactional');
  const promotional = FLOW_TEMPLATES.filter(t => t.category === 'promotional');
  const nurture = FLOW_TEMPLATES.filter(t => t.category === 'nurture');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-violet-100 dark:bg-violet-900/40 rounded-lg">
          <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Choose a Flow Type
        </h3>
      </div>
      
      {/* Transactional flows */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Transactional
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {transactional.map((template, index) => (
            <FlowTypeCard
              key={template.id}
              template={template}
              onSelect={() => onSelectType(template.id)}
              isSelected={selectedType === template.id}
              isLoading={isLoading}
              index={index}
            />
          ))}
        </div>
      </div>
      
      {/* Promotional flows */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Promotional
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {promotional.map((template, index) => (
            <FlowTypeCard
              key={template.id}
              template={template}
              onSelect={() => onSelectType(template.id)}
              isSelected={selectedType === template.id}
              isLoading={isLoading}
              index={index + transactional.length}
            />
          ))}
        </div>
      </div>
      
      {/* Nurture flows */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Nurture
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {nurture.map((template, index) => (
            <FlowTypeCard
              key={template.id}
              template={template}
              onSelect={() => onSelectType(template.id)}
              isSelected={selectedType === template.id}
              isLoading={isLoading}
              index={index + transactional.length + promotional.length}
            />
          ))}
        </div>
      </div>
      
      {/* Helper text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        Select a flow type to get started. I&apos;ll help you create a customized email sequence.
      </p>
    </motion.div>
  );
}

export default FlowTypeCards;




