'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { X, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import {
  useUserVaultPosition,
  useConvertToAssets,
} from '@/hooks/useVault';
import {
  useRequestRedeem,
  useClaimRedeem,
  formatUSDC,
  formatShares,
  parseUSDC,
} from '@/hooks/useVaultTransactions';
import { parseUnits } from 'viem';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'redeem' | 'claim'>('input');

  // Fetch user position (only when modal is open and connected)
  const { data: position, refetch: refetchPosition } = useUserVaultPosition(isOpen && isConnected);

  // Calculate USDC to receive
  const sharesToRedeem = amount ? parseUnits(amount, 18) : undefined;
  const { data: usdcToReceive } = useConvertToAssets(sharesToRedeem);

  // Transaction hooks
  const {
    requestRedeem,
    isPending: isRedeeming,
    isConfirming: isRedeemConfirming,
    isSuccess: isRedeemRequested,
    hash: redeemHash,
    error: redeemError,
  } = useRequestRedeem();

  const {
    claimRedeem,
    isPending: isClaiming,
    isConfirming: isClaimConfirming,
    isSuccess: isClaimed,
    hash: claimHash,
    error: claimError,
  } = useClaimRedeem();

  // Auto-advance steps
  useEffect(() => {
    if (isRedeemRequested && step === 'redeem') {
      setStep('claim');
      refetchPosition();
    }
  }, [isRedeemRequested, step, refetchPosition]);

  useEffect(() => {
    if (isClaimed) {
      refetchPosition();
    }
  }, [isClaimed, refetchPosition]);

  // Handle close
  const handleClose = () => {
    if (!isRedeeming && !isClaiming) {
      setAmount('');
      setStep('input');
      onClose();
    }
  };

  // Handle max button
  const handleMax = () => {
    if (position?.shares) {
      setAmount(formatShares(position.shares));
    }
  };

  // Handle redeem request
  const handleRedeem = async () => {
    if (!sharesToRedeem) return;
    try {
      setStep('redeem');
      await requestRedeem(sharesToRedeem);
    } catch (error) {
      console.error('Redeem error:', error);
      setStep('input');
    }
  };

  // Handle claim
  const handleClaim = async () => {
    try {
      await claimRedeem();
    } catch (error) {
      console.error('Claim error:', error);
    }
  };

  // Check if user has pending redeem
  const hasPendingRedeem = position?.pendingRedeem && position.pendingRedeem > 0n;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-gray-900 border border-emerald-500/30 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <h2 className="text-2xl font-bold text-white">Withdraw USDC</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isRedeeming || isClaiming}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-400">Please connect your wallet to continue</p>
            </div>
          ) : (
            <>
              {/* Step 1: Input Amount */}
              {step === 'input' && (
                <>
                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Withdraw Amount (BIS-YO Shares)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.000000"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        step="0.000001"
                        min="0"
                      />
                      <button
                        onClick={handleMax}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                    {position && (
                      <p className="text-sm text-gray-400 mt-1">
                        Available: {formatShares(position.shares)} BIS-YO
                      </p>
                    )}
                  </div>

                  {/* USDC to Receive */}
                  {usdcToReceive && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">You will receive</p>
                      <p className="text-xl font-bold text-white">
                        {formatUSDC(usdcToReceive)} USDC
                      </p>
                    </div>
                  )}

                  {/* Pending Redeem Notice */}
                  {hasPendingRedeem && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-500">
                            You have a pending withdrawal
                          </p>
                          <p className="text-xs text-yellow-500/80 mt-1">
                            {formatShares(position!.pendingRedeem)} shares waiting to be claimed
                          </p>
                          <button
                            onClick={() => setStep('claim')}
                            className="text-xs text-yellow-400 underline mt-2 hover:text-yellow-300"
                          >
                            Claim now
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={handleRedeem}
                    disabled={
                      !amount ||
                      parseFloat(amount) <= 0 ||
                      (position ? sharesToRedeem! > position.shares : true)
                    }
                    className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Request Withdrawal
                  </button>

                  {/* Info */}
                  <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                    <p className="text-sm text-blue-400">
                      <strong>Note:</strong> Withdrawals are processed asynchronously. After requesting a
                      withdrawal, you'll need to claim your USDC once the operator processes the batch.
                    </p>
                  </div>
                </>
              )}

              {/* Step 2: Redeeming */}
              {step === 'redeem' && (
                <div className="text-center py-8">
                  {isRedeeming || isRedeemConfirming ? (
                    <>
                      <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
                      <p className="text-white font-medium">
                        {isRedeeming ? 'Waiting for confirmation...' : 'Processing withdrawal request...'}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Confirm the transaction in your wallet
                      </p>
                      {redeemHash && (
                        <a
                          href={`https://explorer.hyperliquid.xyz/tx/${redeemHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-flex items-center gap-1"
                        >
                          View on Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </>
                  ) : redeemError ? (
                    <>
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <p className="text-white font-medium">Withdrawal Request Failed</p>
                      <p className="text-sm text-gray-400 mt-2">{redeemError.message}</p>
                      <button
                        onClick={() => setStep('input')}
                        className="mt-4 px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                      >
                        Try Again
                      </button>
                    </>
                  ) : null}
                </div>
              )}

              {/* Step 3: Claim */}
              {step === 'claim' && (
                <div className="text-center py-8">
                  {isClaimed ? (
                    <>
                      <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                      <p className="text-white font-medium text-xl">USDC Claimed!</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Your USDC has been sent to your wallet
                      </p>
                      {claimHash && (
                        <a
                          href={`https://explorer.hyperliquid.xyz/tx/${claimHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-flex items-center gap-1"
                        >
                          View on Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={handleClose}
                        className="mt-6 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/50"
                      >
                        Close
                      </button>
                    </>
                  ) : isClaiming || isClaimConfirming ? (
                    <>
                      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                      <p className="text-white font-medium">
                        {isClaiming ? 'Waiting for confirmation...' : 'Claiming USDC...'}
                      </p>
                      {claimHash && (
                        <a
                          href={`https://explorer.hyperliquid.xyz/tx/${claimHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-flex items-center gap-1"
                        >
                          View on Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </>
                  ) : hasPendingRedeem ? (
                    <>
                      <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <p className="text-white font-medium text-xl">Ready to Claim</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Your withdrawal has been processed. Claim your USDC now!
                      </p>
                      <div className="bg-gray-800/50 p-4 rounded-lg mt-4">
                        <p className="text-sm text-gray-400">Claimable shares</p>
                        <p className="text-2xl font-bold text-white mt-1">
                          {formatShares(position!.pendingRedeem)} BIS-YO
                        </p>
                      </div>
                      <button
                        onClick={handleClaim}
                        className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/50"
                      >
                        Claim USDC
                      </button>
                      {claimError && (
                        <div className="mt-4 text-sm text-red-400">
                          Error: {claimError.message}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                      <p className="text-white font-medium text-xl">Withdrawal Requested</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Your withdrawal is queued for processing. Come back after the next rebalance to
                        claim your USDC.
                      </p>
                      <button
                        onClick={handleClose}
                        className="mt-6 px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
