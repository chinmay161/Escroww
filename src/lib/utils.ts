import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a Solana address for display
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format SOL amount with proper decimals
 */
export function formatSol(lamports: number, decimals: number = 4): string {
  return lamports.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Get time remaining until deadline
 */
export function getTimeRemaining(deadline: number): { display: string; isExpired: boolean } {
  const now = Date.now();
  const diff = deadline - now;

  if (diff <= 0) {
    return { display: 'Expired', isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { display: `${days}d ${hours}h remaining`, isExpired: false };
  } else if (hours > 0) {
    return { display: `${hours}h ${minutes}m remaining`, isExpired: false };
  } else {
    return { display: `${minutes}m remaining`, isExpired: false };
  }
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}