import type { TokenUsage } from './types.js';

interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreate: number;
}

const PRICES: Record<string, ModelPrice> = {
  'claude-opus-4-7': { input: 15, output: 75, cacheRead: 1.5, cacheCreate: 18.75 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3, cacheCreate: 3.75 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheRead: 0.1, cacheCreate: 1.25 },
};

const lookup = (model: string): ModelPrice | null => {
  if (PRICES[model]) return PRICES[model];
  for (const key of Object.keys(PRICES)) {
    if (model.startsWith(key)) return PRICES[key];
  }
  return null;
};

export const computeCostUsd = (model: string, tokens: TokenUsage): number => {
  const price = lookup(model);
  if (!price) return 0;
  const M = 1_000_000;
  return (
    (tokens.input * price.input + tokens.output * price.output +
     tokens.cacheRead * price.cacheRead + tokens.cacheCreate * price.cacheCreate) / M
  );
};
