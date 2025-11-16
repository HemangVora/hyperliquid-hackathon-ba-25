'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { X, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import {
  useUserVaultPosition,
  useVaultStats,
  useConvertToShares,
} from '@/hooks/useVault';
import {
  useApproveUSDC,
  useRequestDeposit,
  useClaimDeposit,
  parseUSDC,
  formatUSDC,
  formatShares,
} from '@/hooks/useVaultTransactions';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approve' | 'deposit' | 'claim'>('input');

  // Fetch user position and vault stats
  const { data: position, refetch: refetchPosition } = useUserVaultPosition();
  const { data: vaultStats } = useVaultStats();

  // Calculate shares to receive
  const depositAmount = amount ? parseUSDC(amount) : undefined;
  const { data: sharesToReceive } = useConvertToShares(depositAmount);

  // Transaction hooks
  const {
    approve,
    isPending: isApproving,
    isConfirming: isApprovingConfirming,
    isSuccess: isApproved,
    hash: approveHash,
    error: approveError,
  } = useApproveUSDC();

  const {
    requestDeposit,
    isPending: isDepositing,
    isConfirming: isDepositConfirming,
    isSuccess: isDepositRequested,
    hash: depositHash,
    error: depositError,
  } = useRequestDeposit();

  const {
    claimDeposit,
    isPending: isClaiming,
    isConfirming: isClaimConfirming,
    isSuccess: isClaimed,
    hash: claimHash,
    error: claimError,
  } = useClaimDeposit();

  // Auto-advance steps
  useEffect(() => {
    if (isApproved && step === 'approve') {
      setStep('deposit');
      refetchPosition();
    }
  }, [isApproved, step, refetchPosition]);

  useEffect(() => {
    if (isDepositRequested && step === 'deposit') {
      setStep('claim');
      refetchPosition();
    }
  }, [isDepositRequested, step, refetchPosition]);

  useEffect(() => {
    if (isClaimed) {
      refetchPosition();
    }
  }, [isClaimed, refetchPosition]);

  // Handle close
  const handleClose = () => {
    if (!isApproving && !isDepositing && !isClaiming) {
      setAmount('');
      setStep('input');
      onClose();
    }
  };

  // Handle max button
  const handleMax = () => {
    if (position?.usdcBalance) {
      setAmount(formatUSDC(position.usdcBalance));
    }
  };

  // Handle approve
  const handleApprove = async () => {
    try {
      setStep('approve');
      await approve();
    } catch (error) {
      console.error('Approval error:', error);
      setStep('input');
    }
  };

  // Handle deposit request
  const handleDeposit = async () => {
    if (!depositAmount) return;
    try {
      await requestDeposit(depositAmount);
    } catch (error) {
      console.error('Deposit error:', error);
    }
  };

  // Handle claim
  const handleClaim = async () => {
    try {
      await claimDeposit();
    } catch (error) {
      console.error('Claim error:', error);
    }
  };

  // Check if user needs approval
  const needsApproval =
    depositAmount && position?.usdcAllowance
      ? depositAmount > position.usdcAllowance
      : false;

  // Check if user has pending deposit
  const hasPendingDeposit = position?.pendingDeposit && position.pendingDeposit > 0n;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-gray-900 border border-emerald-500/30 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <h2 className="text-2xl font-bold text-white">Deposit USDC</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isApproving || isDepositing || isClaiming}
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
                      Deposit Amount (USDC)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        step="0.01"
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
                        Available: {formatUSDC(position.usdcBalance)} USDC
                      </p>
                    )}
                  </div>

                  {/* Shares to Receive */}
                  {sharesToReceive && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">You will receive</p>
                      <p className="text-xl font-bold text-white">
                        {formatShares(sharesToReceive)} BIS-YO Shares
                      </p>
                      {vaultStats && (
                        <p className="text-xs text-gray-500 mt-1">
                          Current share price: ${formatUSDC((vaultStats.sharePrice * 1000000n) / 10n ** 18n)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pending Deposit Notice */}
                  {hasPendingDeposit && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-500">
                            You have a pending deposit
                          </p>
                          <p className="text-xs text-yellow-500/80 mt-1">
                            {formatUSDC(position!.pendingDeposit)} USDC waiting to be claimed
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
                    onClick={needsApproval ? handleApprove : handleDeposit}
                    disabled={
                      !amount ||
                      parseFloat(amount) <= 0 ||
                      (position ? depositAmount! > position.usdcBalance : true)
                    }
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {needsApproval ? 'Approve USDC' : 'Request Deposit'}
                  </button>

                  {/* Info */}
                  <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                    <p className="text-sm text-blue-400">
                      <strong>Note:</strong> Deposits are processed asynchronously. After requesting a
                      deposit, you'll need to claim your shares once the operator processes the batch.
                    </p>
                  </div>
                </>
              )}

              {/* Step 2: Approving */}
              {step === 'approve' && (
                <div className="text-center py-8">
                  {isApproving || isApprovingConfirming ? (
                    <>
                      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                      <p className="text-white font-medium">
                        {isApproving ? 'Waiting for confirmation...' : 'Processing approval...'}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Confirm the transaction in your wallet
                      </p>
                      {approveHash && (
                        <a
                          href={`https://explorer.hyperliquid.xyz/tx/${approveHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-flex items-center gap-1"
                        >
                          View on Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </>
                  ) : approveError ? (
                    <>
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <p className="text-white font-medium">Approval Failed</p>
                      <p className="text-sm text-gray-400 mt-2">{approveError.message}</p>
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

              {/* Step 3: Depositing */}
              {step === 'deposit' && (
                <div className="text-center py-8">
                  {isDepositing || isDepositConfirming ? (
                    <>
                      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                      <p className="text-white font-medium">
                        {isDepositing ? 'Waiting for confirmation...' : 'Processing deposit request...'}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Confirm the transaction in your wallet
                      </p>
                      {depositHash && (
                        <a
                          href={`https://explorer.hyperliquid.xyz/tx/${depositHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-flex items-center gap-1"
                        >
                          View on Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </>
                  ) : depositError ? (
                    <>
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <p className="text-white font-medium">Deposit Request Failed</p>
                      <p className="text-sm text-gray-400 mt-2">{depositError.message}</p>
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

              {/* Step 4: Claim */}
              {step === 'claim' && (
                <div className="text-center py-8">
                  {isClaimed ? (
                    <>
                      <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                      <p className="text-white font-medium text-xl">Shares Claimed!</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Your BIS-YO shares are now in your wallet
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
                        {isClaiming ? 'Waiting for confirmation...' : 'Claiming shares...'}
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
                  ) : hasPendingDeposit ? (
                    <>
                      <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <p className="text-white font-medium text-xl">Ready to Claim</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Your deposit has been processed. Claim your shares now!
                      </p>
                      <div className="bg-gray-800/50 p-4 rounded-lg mt-4">
                        <p className="text-sm text-gray-400">Claimable amount</p>
                        <p className="text-2xl font-bold text-white mt-1">
                          {formatUSDC(position!.pendingDeposit)} USDC
                        </p>
                      </div>
                      <button
                        onClick={handleClaim}
                        className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/50"
                      >
                        Claim Shares
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
                      <p className="text-white font-medium text-xl">Deposit Requested</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Your deposit is queued for processing. Come back after the next rebalance to
                        claim your shares.
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
