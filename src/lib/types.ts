export type EscrowStatus = 'pending' | 'submitted' | 'completed' | 'expired';

export interface Escrow {
  id: string;
  client: string;
  freelancer: string;
  amount: number; // in SOL
  deadline: number; // Unix timestamp
  status: EscrowStatus;
  metadataRef?: string; // CID, URL, or hash
  isSubmitted: boolean;
  isReleased: boolean;
  createdAt: number;
  pda?: string; // Program Derived Address
}

export interface EscrowAccount {
  client: string;
  freelancer: string;
  amount: bigint;
  deadline: bigint;
  isSubmitted: boolean;
  isReleased: boolean;
  metadataRef: string;
  bump: number;
}

export interface CreateEscrowParams {
  freelancer: string;
  amount: number;
  deadline: Date;
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}
