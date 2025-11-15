'use client';

import { RebalanceConditions } from '@/types/rebalancing';

interface DecisionGaugesProps {
  conditions: RebalanceConditions;
  allocationChangePct?: number;
}

interface GaugeProps {
  label: string;
  description: string;
  value: number; // 0-100
  currentValue: number;
  requiredValue: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  met: boolean;
}

function CircularGauge({ label, description, value, currentValue, requiredValue, unit, status, met }: GaugeProps) {
  // Calculate SVG circle parameters
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Color based on status
  const getColor = () => {
    if (met) return '#10b981'; // green-500
    if (status === 'warning') return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center">
      {/* Circular progress */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-white">{progress.toFixed(0)}%</p>
          {met && <p className="text-green-400 text-xs">✓</p>}
        </div>
      </div>

      {/* Label and details */}
      <div className="mt-4 text-center">
        <h3 className="text-white font-semibold text-sm mb-1">{label}</h3>
        <p className="text-gray-400 text-xs mb-2">{description}</p>
        <p className="text-gray-300 text-xs font-mono">
          {currentValue.toFixed(unit === 'seconds' ? 0 : 2)} / {requiredValue.toFixed(unit === 'seconds' ? 0 : 2)} {unit}
        </p>
      </div>
    </div>
  );
}

export default function DecisionGauges({ conditions, allocationChangePct = 0 }: DecisionGaugesProps) {
  // Convert conditions to gauge data
  const timeDelayGauge: GaugeProps = {
    label: 'Time Delay',
    description: conditions.timeDelaySatisfied.description,
    value: (conditions.timeDelaySatisfied.currentValue / conditions.timeDelaySatisfied.requiredValue) * 100,
    currentValue: conditions.timeDelaySatisfied.currentValue,
    requiredValue: conditions.timeDelaySatisfied.requiredValue,
    unit: conditions.timeDelaySatisfied.unit,
    status: conditions.timeDelaySatisfied.met ? 'good' : 'warning',
    met: conditions.timeDelaySatisfied.met,
  };

  const improvementGauge: GaugeProps = {
    label: 'Improvement Potential',
    description: conditions.improvementThresholdMet.description,
    value: Math.min(100, (conditions.improvementThresholdMet.currentValue / conditions.improvementThresholdMet.requiredValue) * 100),
    currentValue: conditions.improvementThresholdMet.currentValue,
    requiredValue: conditions.improvementThresholdMet.requiredValue,
    unit: conditions.improvementThresholdMet.unit,
    status: conditions.improvementThresholdMet.met ? 'good' : 'critical',
    met: conditions.improvementThresholdMet.met,
  };

  const gasCostGauge: GaugeProps = {
    label: 'Gas Efficiency',
    description: conditions.gasCostAcceptable.description,
    value: Math.min(100, (conditions.gasCostAcceptable.currentValue / conditions.gasCostAcceptable.requiredValue) * 100),
    currentValue: conditions.gasCostAcceptable.currentValue,
    requiredValue: conditions.gasCostAcceptable.requiredValue,
    unit: conditions.gasCostAcceptable.unit,
    status: conditions.gasCostAcceptable.met ? 'good' : 'warning',
    met: conditions.gasCostAcceptable.met,
  };

  const allocationDeltaGauge: GaugeProps = {
    label: 'Allocation Delta',
    description: 'Percentage of total funds that would move',
    value: Math.min(100, allocationChangePct),
    currentValue: allocationChangePct,
    requiredValue: 100,
    unit: '%',
    status: allocationChangePct > 20 ? 'warning' : 'good',
    met: allocationChangePct > 0,
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Decision Readiness Gauges</h2>
        <p className="text-gray-400 text-sm">
          Multi-factor analysis of conditions for pool switching
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <CircularGauge {...timeDelayGauge} />
        <CircularGauge {...improvementGauge} />
        <CircularGauge {...gasCostGauge} />
        <CircularGauge {...allocationDeltaGauge} />
      </div>

      {/* Overall status */}
      <div className="mt-8 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold mb-1">Overall Decision Status</h3>
            <p className="text-gray-400 text-sm">
              {conditions.allConditionsMet
                ? 'All conditions satisfied - ready to rebalance'
                : 'Some conditions not yet met - waiting'}
            </p>
          </div>
          <div
            className={`px-6 py-3 rounded-lg font-semibold ${
              conditions.allConditionsMet
                ? 'bg-green-500/20 text-green-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {conditions.allConditionsMet ? '✓ GO' : '⏸ WAIT'}
          </div>
        </div>
      </div>
    </div>
  );
}
