'use client';

import { motion } from 'framer-motion';
import { LucideIcon, Check } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface StrategyFeature {
  label: string;
  included: boolean;
}

interface StrategyCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  features: StrategyFeature[];
  recommended?: boolean;
  currentAPY: string;
  onSelect: () => void;
  isSelected?: boolean;
}

export default function StrategyCard({
  title,
  description,
  icon: Icon,
  color,
  features,
  recommended = false,
  currentAPY,
  onSelect,
  isSelected = false
}: StrategyCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="relative h-full"
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
            Recommended
          </div>
        </div>
      )}

      <Card className={`h-full border-2 transition-all duration-300 ${
        isSelected
          ? 'border-emerald-500 shadow-xl shadow-emerald-500/50'
          : 'border-gray-700 hover:border-gray-600'
      }`}>
        <CardHeader>
          <div className="flex items-start justify-between mb-4">
            <div className={`w-16 h-16 rounded-xl ${color} flex items-center justify-center`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            {isSelected && (
              <div className="bg-emerald-500 rounded-full p-1">
                <Check className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-gray-400 mt-2">{description}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Performance */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Current Average APY</div>
            <div className="text-3xl font-bold text-white">{currentAPY}</div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Strategy Factors
            </div>
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                  feature.included
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-gray-700 text-gray-500'
                }`}>
                  {feature.included ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="text-xs">−</span>
                  )}
                </div>
                <span className={`text-sm ${
                  feature.included ? 'text-gray-200' : 'text-gray-500'
                }`}>
                  {feature.label}
                </span>
              </div>
            ))}
          </div>

          {/* Select Button */}
          <Button
            onClick={onSelect}
            className={`w-full ${
              isSelected
                ? 'bg-emerald-500 hover:bg-emerald-400'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isSelected ? 'Selected' : 'Select Strategy'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
