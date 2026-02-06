import { useState, useCallback, useEffect, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import { Escrow, EscrowStatus, CreateEscrowParams, TransactionResult } from '@/lib/types';
import { EscrowSDK, EscrowAccountData } from '@/lib/escrowSDK';
import { useToast } from '@/hooks/use-toast';
import { lamportsToSol } from '@/lib/utils';

/**
 * Convert on-chain escrow data to UI-friendly format
 */
const convertEscrowData = (
  publicKey: PublicKey,
  account: EscrowAccountData
): Escrow => {
  const now = Date.now();
  const deadline = account.deadline.toNumber() * 1000; // Convert seconds to ms
  
  let status: EscrowStatus = 'pending';
  if (account.isReleased) {
    status = 'completed';
  } else if (account.isSubmitted && deadline < now) {
    status = 'expired'; // Ready for auto-release
  } else if (account.isSubmitted) {
    status = 'submitted';
  }

  return {
    id: publicKey.toString(),
    client: account.client.toString(),
    freelancer: account.freelancer.toString(),
    amount: account.amount.toNumber() / LAMPORTS_PER_SOL,
    deadline,
    status,
    metadataRef: account.metadataRef || undefined,
    isSubmitted: account.isSubmitted,
    isReleased: account.isReleased,
    createdAt: now, // Not stored on-chain
    pda: publicKey.toString(),
  };
};

export const useEscrow = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { toast } = useToast();
  
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [programReady, setProgramReady] = useState(false);

  // Initialize SDK
  const sdk = useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) return null;

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: 'confirmed' }
      );
      return new EscrowSDK(provider);
    } catch (error) {
      console.error('Failed to initialize SDK:', error);
      return null;
    }
  }, [connection, publicKey, signTransaction, signAllTransactions]);

  // Check if SDK is ready
  useEffect(() => {
    setProgramReady(!!sdk);
  }, [sdk]);

  // Fetch all escrows for current user
  const fetchEscrows = useCallback(async () => {
    if (!sdk || !publicKey) {
      setEscrows([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all escrows and filter by user
      const result = await sdk.fetchAllEscrows();
      
      if (result.success && result.data) {
        const userAddress = publicKey.toString();
        const userEscrows = result.data
          .filter(
            (e) =>
              e.account.client.toString() === userAddress ||
              e.account.freelancer.toString() === userAddress
          )
          .map((e) => convertEscrowData(e.publicKey, e.account));

        setEscrows(userEscrows);
      } else {
        console.error('Failed to fetch escrows:', result.error);
        setEscrows([]);
      }
    } catch (error) {
      console.error('Error fetching escrows:', error);
      setEscrows([]);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, publicKey]);

  // Initial fetch when SDK is ready
  useEffect(() => {
    if (sdk && publicKey) {
      fetchEscrows();
    } else {
      setEscrows([]);
    }
  }, [sdk, publicKey, fetchEscrows]);

  // Create new escrow
  const createEscrow = useCallback(
    async (params: CreateEscrowParams): Promise<TransactionResult> => {
      if (!sdk) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        const escrowId = sdk.generateEscrowId();
        
        const result = await sdk.createEscrow({
          escrowId,
          freelancer: params.freelancer,
          amount: params.amount,
          deadline: params.deadline.getTime(),
        });

        if (result.success && result.data) {
          toast({
            title: 'Escrow Created',
            description: `Transaction: ${result.data.signature.slice(0, 8)}...`,
          });
          
          // Refresh escrows
          await fetchEscrows();
          
          return { success: true, signature: result.data.signature };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error: any) {
        console.error('Create escrow error:', error);
        return { success: false, error: error.message || 'Failed to create escrow' };
      }
    },
    [sdk, fetchEscrows, toast]
  );

  // Submit work (freelancer)
  const submitWork = useCallback(
    async (escrowId: string, metadataRef: string): Promise<TransactionResult> => {
      if (!sdk) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        const escrowAddress = new PublicKey(escrowId);
        const result = await sdk.submitWork(escrowAddress, metadataRef);

        if (result.success && result.data) {
          toast({
            title: 'Work Submitted',
            description: `Transaction: ${result.data.signature.slice(0, 8)}...`,
          });
          
          // Refresh escrows
          await fetchEscrows();
          
          return { success: true, signature: result.data.signature };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error: any) {
        console.error('Submit work error:', error);
        return { success: false, error: error.message || 'Failed to submit work' };
      }
    },
    [sdk, fetchEscrows, toast]
  );

  // Approve release (client)
  const approveRelease = useCallback(
    async (escrowId: string): Promise<TransactionResult> => {
      if (!sdk) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        const escrowAddress = new PublicKey(escrowId);
        const result = await sdk.approveRelease(escrowAddress);

        if (result.success && result.data) {
          toast({
            title: 'Funds Released',
            description: `Transaction: ${result.data.signature.slice(0, 8)}...`,
          });
          
          // Refresh escrows
          await fetchEscrows();
          
          return { success: true, signature: result.data.signature };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error: any) {
        console.error('Approve release error:', error);
        return { success: false, error: error.message || 'Failed to approve release' };
      }
    },
    [sdk, fetchEscrows, toast]
  );

  // Trigger auto-release
  const triggerAutoRelease = useCallback(
    async (escrowId: string): Promise<TransactionResult> => {
      if (!sdk) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        const escrowAddress = new PublicKey(escrowId);
        const result = await sdk.triggerAutoRelease(escrowAddress);

        if (result.success && result.data) {
          toast({
            title: 'Auto-Release Triggered',
            description: `Transaction: ${result.data.signature.slice(0, 8)}...`,
          });
          
          // Refresh escrows
          await fetchEscrows();
          
          return { success: true, signature: result.data.signature };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error: any) {
        console.error('Auto release error:', error);
        return { success: false, error: error.message || 'Failed to trigger auto-release' };
      }
    },
    [sdk, fetchEscrows, toast]
  );

  // Get escrow by ID
  const getEscrow = useCallback(
    (id: string): Escrow | undefined => {
      return escrows.find((e) => e.id === id);
    },
    [escrows]
  );

  return {
    escrows,
    isLoading,
    programReady,
    fetchEscrows,
    createEscrow,
    submitWork,
    approveRelease,
    triggerAutoRelease,
    getEscrow,
  };
};
