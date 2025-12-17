/**
 * FIP-11: Sign in with Farcaster implementation
 * 
 * Based on: https://github.com/farcasterxyz/protocol/discussions/110
 * 
 * FIP-11 defines a standard for Farcaster authentication using EIP-4361 "Sign in With Ethereum" (SIWE).
 * 
 * Signature Format Requirements:
 * - Statement: "Farcaster Auth"
 * - Chain ID: 10 (Optimism Mainnet)
 * - Resource: farcaster://fids/<fid>
 */

// Type definition for Ethereum address (compatible with viem)
type Address = `0x${string}`;

export interface FarcasterSignInResult {
  address: Address;
  fid?: number;
  message?: string;
  signature?: string;
}

/**
 * Generate a FIP-11 compliant SIWE message
 * 
 * @param address - The Ethereum address (custody address) that will sign
 * @param fid - The Farcaster ID (optional, will be included in resource if provided)
 * @param domain - The domain requesting the signature
 * @param uri - The URI where the signature will be used
 * @param nonce - A random nonce for replay protection
 * @param issuedAt - ISO timestamp when the message was issued
 * @param expirationTime - ISO timestamp when the message expires
 * @returns EIP-4361 SIWE message string
 */
export function generateFIP11SIWEMessage(
  address: Address,
  fid?: number,
  domain: string = typeof window !== 'undefined' ? window.location.hostname : 'base-piggy-bank.vercel.app',
  uri: string = typeof window !== 'undefined' ? window.location.origin : 'https://base-piggy-bank.vercel.app',
  nonce?: string,
  issuedAt?: string,
  expirationTime?: string
): string {
  const now = new Date();
  const issued = issuedAt || now.toISOString();
  const expires = expirationTime || new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 minutes
  const nonceValue = nonce || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

  const resources: string[] = [];
  if (fid) {
    resources.push(`farcaster://fids/${fid}`);
  }

  // Build EIP-4361 SIWE message according to FIP-11
  const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Farcaster Auth
URI: ${uri}
Version: 1
Chain ID: 10
Nonce: ${nonceValue}
Issued At: ${issued}
Expiration Time: ${expires}${resources.length > 0 ? `\nResources:\n${resources.map(r => `- ${r}`).join('\n')}` : ''}`;

  return message;
}

/**
 * Verify a FIP-11 SIWE message format
 * 
 * @param message - The SIWE message to verify
 * @returns true if message matches FIP-11 format
 */
export function verifyFIP11MessageFormat(message: string): boolean {
  // Check for required FIP-11 fields
  const hasStatement = message.includes('Farcaster Auth');
  const hasChainId = message.includes('Chain ID: 10');
  const hasFarcasterResource = message.includes('farcaster://fids/');

  return hasStatement && hasChainId && hasFarcasterResource;
}

/**
 * Extract FID from a FIP-11 SIWE message
 * 
 * @param message - The SIWE message
 * @returns The FID if found, undefined otherwise
 */
export function extractFIDFromMessage(message: string): number | undefined {
  const match = message.match(/farcaster:\/\/fids\/(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

