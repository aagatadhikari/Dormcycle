import Stripe from "stripe";

export function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Missing STRIPE_SECRET_KEY.");
  return new Stripe(secret);
}

/**
 * DormCycle's agreed platform fee is 5%.
 * Calculate fees on the server using an authoritative database price.
 * This helper expects an integer amount in the smallest currency unit (e.g. cents).
 */
export function calculatePlatformFee(amountInCents: number) {
  if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
    throw new Error("Amount must be a positive integer in the smallest currency unit.");
  }
  return Math.round(amountInCents * 0.05);
}
