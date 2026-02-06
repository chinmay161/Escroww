/**
 * Solana Escrow Program SDK
 * 
 * SDK for interacting with the Trustless Escrow Program on Solana.
 * Handles escrow creation, work submission, approval, and auto-release.
 */

import { BN, Program, Provider } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import IDL from "../idl/escrowIDL.json";
import { PROGRAM_ID } from "./configAddress";

// Type Definitions from IDL
export interface EscrowAccountData {
  client: PublicKey;
  freelancer: PublicKey;
  amount: BN;
  deadline: BN;
  isSubmitted: boolean;
  isReleased: boolean;
  metadataRef: string;
  escrowId: string;
  bump: number;
}

// Parameter interfaces
export interface CreateEscrowParams {
  escrowId: string;
  freelancer: string;
  amount: number; // in SOL
  deadline: number; // Unix timestamp in ms
}

export interface SubmitWorkParams {
  escrowAddress: PublicKey;
  metadataRef: string;
}

// Generic result wrapper
export interface SDKResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Main SDK class for interacting with the Escrow Program
 */
export class EscrowSDK {
  private readonly provider: Provider;
  private readonly program: Program<any>;
  private readonly programId: PublicKey;

  constructor(provider: Provider) {
    this.provider = provider;
    this.programId = new PublicKey(PROGRAM_ID);
    this.program = new Program(IDL as any, this.provider);
  }

  /**
   * Safe BN constructor that validates input
   */
  private safeBN(value: any, defaultValue: number | string = 0): BN {
    if (value === null || value === undefined) {
      return new BN(defaultValue);
    }

    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        return new BN(defaultValue);
      }
      return new BN(Math.floor(value).toString());
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
        return new BN(defaultValue);
      }
      try {
        return new BN(Math.floor(parseFloat(trimmed)).toString());
      } catch {
        return new BN(defaultValue);
      }
    }

    if (value instanceof BN) {
      return value;
    }

    return new BN(defaultValue);
  }

  /**
   * Safely convert BN to number
   */
  private safeBNToNumber(value: any, defaultValue: number = 0): number {
    try {
      return value && typeof value.toNumber === 'function' ? value.toNumber() : defaultValue;
    } catch {
      if (value && typeof value.toString === 'function') {
        const parsed = parseInt(value.toString());
        if (!isNaN(parsed)) return parsed;
      }
      return defaultValue;
    }
  }

  /**
   * Generate PDA for escrow account
   */
  private getEscrowPDA(client: PublicKey, freelancer: PublicKey, escrowId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        client.toBuffer(),
        freelancer.toBuffer(),
        Buffer.from(escrowId),
      ],
      this.programId
    );
  }

  /**
   * Convert SOL to lamports
   */
  private solToLamports(sol: number): BN {
    return this.safeBN(Math.floor(sol * LAMPORTS_PER_SOL));
  }

  /**
   * Convert lamports to SOL
   */
  private lamportsToSol(lamports: BN): number {
    return this.safeBNToNumber(lamports, 0) / LAMPORTS_PER_SOL;
  }

  /**
   * Test RPC connection
   */
  private async testConnection(): Promise<boolean> {
    try {
      if (!this.provider?.connection) return false;
      const { value } = await this.provider.connection.getLatestBlockhashAndContext('finalized');
      return !!(value && value.blockhash);
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique escrow ID
   */
  generateEscrowId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`.substring(0, 32);
  }

  /**
   * Create a new escrow
   */
  async createEscrow(params: CreateEscrowParams): Promise<SDKResult<{ signature: string; escrowAddress: string }>> {
    if (!this.provider.publicKey) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      if (!(await this.testConnection())) {
        return { success: false, error: "Network unavailable" };
      }

      // Validate params
      if (!params.escrowId?.trim()) {
        return { success: false, error: "Escrow ID required" };
      }
      if (params.escrowId.length > 32) {
        return { success: false, error: "Escrow ID must be 32 characters or less" };
      }
      if (params.amount <= 0) {
        return { success: false, error: "Amount must be greater than 0" };
      }
      if (params.deadline <= Date.now()) {
        return { success: false, error: "Deadline must be in the future" };
      }

      // Parse freelancer address
      let freelancerPubkey: PublicKey;
      try {
        freelancerPubkey = new PublicKey(params.freelancer);
      } catch {
        return { success: false, error: "Invalid freelancer address" };
      }

      // Derive escrow PDA
      const [escrowAddress] = this.getEscrowPDA(
        this.provider.publicKey,
        freelancerPubkey,
        params.escrowId
      );

      // Convert parameters
      const amountLamports = this.solToLamports(params.amount);
      const deadlineUnix = this.safeBN(Math.floor(params.deadline / 1000)); // Convert ms to seconds

      // Build and send transaction
      const tx = await this.program.methods
        .createEscrow(params.escrowId, amountLamports, deadlineUnix)
        .accounts({
          escrow: escrowAddress,
          client: this.provider.publicKey,
          freelancer: freelancerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return {
        success: true,
        data: {
          signature: tx,
          escrowAddress: escrowAddress.toString(),
        },
      };
    } catch (error: any) {
      console.error("Create escrow error:", error);
      return { success: false, error: error.message || "Failed to create escrow" };
    }
  }

  /**
   * Submit work (freelancer only)
   */
  async submitWork(escrowAddress: PublicKey, metadataRef: string): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      if (!(await this.testConnection())) {
        return { success: false, error: "Network unavailable" };
      }

      if (!metadataRef?.trim()) {
        return { success: false, error: "Metadata reference required" };
      }
      if (metadataRef.length > 256) {
        return { success: false, error: "Metadata reference must be 256 characters or less" };
      }

      const tx = await this.program.methods
        .submitWork(metadataRef)
        .accounts({
          escrow: escrowAddress,
          freelancer: this.provider.publicKey,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error: any) {
      console.error("Submit work error:", error);
      return { success: false, error: error.message || "Failed to submit work" };
    }
  }

  /**
   * Approve release (client only)
   */
  async approveRelease(escrowAddress: PublicKey): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      if (!(await this.testConnection())) {
        return { success: false, error: "Network unavailable" };
      }

      // Fetch escrow to get freelancer address
      const escrowAccount = await this.program.account.escrowAccount.fetch(escrowAddress);

      const tx = await this.program.methods
        .approveRelease()
        .accounts({
          escrow: escrowAddress,
          client: this.provider.publicKey,
          freelancer: escrowAccount.freelancer,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error: any) {
      console.error("Approve release error:", error);
      return { success: false, error: error.message || "Failed to approve release" };
    }
  }

  /**
   * Trigger auto-release (anyone can call if conditions met)
   */
  async triggerAutoRelease(escrowAddress: PublicKey): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      if (!(await this.testConnection())) {
        return { success: false, error: "Network unavailable" };
      }

      // Fetch escrow to get freelancer address
      const escrowAccount = await this.program.account.escrowAccount.fetch(escrowAddress);

      const tx = await this.program.methods
        .triggerAutoRelease()
        .accounts({
          escrow: escrowAddress,
          freelancer: escrowAccount.freelancer,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error: any) {
      console.error("Auto release error:", error);
      return { success: false, error: error.message || "Failed to trigger auto-release" };
    }
  }

  /**
   * Fetch a single escrow account
   */
  async fetchEscrow(escrowAddress: PublicKey): Promise<SDKResult<EscrowAccountData>> {
    try {
      if (!(await this.testConnection())) {
        return { success: false, error: "Network unavailable" };
      }

      const escrowAccount = await this.program.account.escrowAccount.fetch(escrowAddress);
      return { success: true, data: escrowAccount as EscrowAccountData };
    } catch (error: any) {
      if (error.message?.includes('Account does not exist')) {
        return { success: false, error: "Escrow not found" };
      }
      return { success: false, error: error.message || "Failed to fetch escrow" };
    }
  }

  /**
   * Fetch all escrows
   */
  async fetchAllEscrows(): Promise<SDKResult<Array<{ publicKey: PublicKey; account: EscrowAccountData }>>> {
    try {
      if (!(await this.testConnection())) {
        return { success: false, error: "Network unavailable" };
      }

      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 15000)
      );
      
      const fetchPromise = this.program.account.escrowAccount.all();
      
      let allEscrows: any[];
      try {
        allEscrows = await Promise.race([fetchPromise, timeout]);
      } catch (raceError: any) {
        if (raceError.message?.includes('timeout')) {
          return { success: false, error: "Request timed out" };
        }
        throw raceError;
      }

      if (!allEscrows?.length) {
        return { success: true, data: [] };
      }

      return {
        success: true,
        data: allEscrows.map((e: any) => ({
          publicKey: e.publicKey,
          account: e.account as EscrowAccountData,
        })),
      };
    } catch (error: any) {
      if (error.message?.includes('Account does not exist')) {
        return { success: true, data: [] };
      }
      return { success: false, error: error.message || "Failed to fetch escrows" };
    }
  }

  /**
   * Fetch escrows where user is client
   */
  async fetchEscrowsByClient(client?: PublicKey): Promise<SDKResult<Array<{ publicKey: PublicKey; account: EscrowAccountData }>>> {
    const targetClient = client || this.provider.publicKey;
    if (!targetClient) {
      return { success: false, error: "No client address provided" };
    }

    try {
      const allResult = await this.fetchAllEscrows();
      if (!allResult.success) return allResult;

      const filtered = allResult.data!.filter(
        (e) => e.account.client.toString() === targetClient.toString()
      );

      return { success: true, data: filtered };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to fetch escrows" };
    }
  }

  /**
   * Fetch escrows where user is freelancer
   */
  async fetchEscrowsByFreelancer(freelancer?: PublicKey): Promise<SDKResult<Array<{ publicKey: PublicKey; account: EscrowAccountData }>>> {
    const targetFreelancer = freelancer || this.provider.publicKey;
    if (!targetFreelancer) {
      return { success: false, error: "No freelancer address provided" };
    }

    try {
      const allResult = await this.fetchAllEscrows();
      if (!allResult.success) return allResult;

      const filtered = allResult.data!.filter(
        (e) => e.account.freelancer.toString() === targetFreelancer.toString()
      );

      return { success: true, data: filtered };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to fetch escrows" };
    }
  }

  /**
   * Fetch SOL balance
   */
  async fetchSolBalance(account?: PublicKey): Promise<SDKResult<number>> {
    const targetAccount = account || this.provider.publicKey;
    if (!targetAccount) {
      return { success: false, error: "No account provided" };
    }

    try {
      const balance = await this.provider.connection.getBalance(targetAccount);
      return { success: true, data: balance / LAMPORTS_PER_SOL };
    } catch (error: any) {
      return { success: false, error: "Failed to fetch SOL balance" };
    }
  }
}

export default EscrowSDK;
