'use client';

import { RebalanceConditions } from '@/types/rebalancing';

interface ConditionsChecklistProps {
  conditions: RebalanceConditions;
}

export default function ConditionsChecklist({ conditions }: ConditionsChecklistProps) {
  const conditionsArray = [
    conditions.timeDelaySatisfied,
    conditions.improvementThresholdMet,
    conditions.gasCostAcceptable,
    conditions.backendServiceHealthy,
  ];

  const metCount = conditionsArray.filter((c) => c.met).length;
  const totalCount = conditionsArray.length;
  const progressPercentage = (metCount / totalCount) * 100;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Conditions Checklist</h2>
        <p className="text-gray-400 text-sm">
          All conditions must be satisfied for automatic rebalancing
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-semibold">
            {metCount} of {totalCount} conditions met
          </span>
          <span className="text-gray-400 text-sm">{progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              metCount === totalCount ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Conditions list */}
      <div className="space-y-4">
        {conditionsArray.map((condition) => (
          <div
            key={condition.id}
            className={`p-4 rounded-lg border ${
              condition.met
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-gray-700/20 border-gray-700'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Checkbox/Status icon */}
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  condition.met
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 border-2 border-gray-600'
                }`}
              >
                {condition.met ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <div className="w-2 h-2 bg-gray-600 rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-1">
                  <h3
                    className={`font-semibold ${
                      condition.met ? 'text-green-400' : 'text-gray-300'
                    }`}
                  >
                    {condition.label}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      condition.met
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {condition.met ? 'MET' : 'PENDING'}
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-2">{condition.description}</p>

                {/* Value indicator */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="bg-gray-900/50 px-3 py-1.5 rounded font-mono">
                    <span className={condition.met ? 'text-green-400' : 'text-gray-300'}>
                      {condition.unit === 'seconds'
                        ? formatSeconds(condition.currentValue)
                        : condition.currentValue.toFixed(2)}
                    </span>
                    <span className="text-gray-500 mx-1">/</span>
                    <span className="text-gray-400">
                      {condition.unit === 'seconds'
                        ? formatSeconds(condition.requiredValue)
                        : condition.requiredValue.toFixed(2)}
                    </span>
                    <span className="text-gray-500 ml-1">{condition.unit}</span>
                  </div>

                  {/* Progress bar for non-binary conditions */}
                  {condition.id !== 'backend_healthy' && (
                    <div className="flex-1 bg-gray-700 rounded-full h-1.5 max-w-xs">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          condition.met ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (condition.currentValue / condition.requiredValue) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div
        className={`mt-6 p-4 rounded-lg ${
          conditions.allConditionsMet
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-amber-500/10 border border-amber-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              conditions.allConditionsMet
                ? 'bg-green-500 text-white'
                : 'bg-amber-500 text-white'
            }`}
          >
            {conditions.allConditionsMet ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3
              className={`font-semibold ${
                conditions.allConditionsMet ? 'text-green-400' : 'text-amber-400'
              }`}
            >
              {conditions.allConditionsMet ? 'All Systems Go!' : 'Waiting for Conditions'}
            </h3>
            <p className="text-gray-400 text-sm">
              {conditions.allConditionsMet
                ? 'System is ready to execute rebalancing when triggered'
                : `${totalCount - metCount} condition${
                    totalCount - metCount !== 1 ? 's' : ''
                  } remaining before rebalance can execute`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format seconds
function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
