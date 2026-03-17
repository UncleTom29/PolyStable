"use client";

import { useEffect, useMemo, useState } from "react";

export interface TokenPrice {
  symbol: string;
  usd: number;
  updatedAt: number;
}

const PRICE_FEEDS: Record<string, string> = {
  DOT: "polkadot",
  pUSD: "usd-coin", // peg to 1 USD
};

export function usePrices(symbols: string[] = ["DOT", "pUSD"]) {
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({
    pUSD: { symbol: "pUSD", usd: 1.0, updatedAt: Date.now() },
  });
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the joined symbols string to avoid spurious re-renders
  const symbolsKey = useMemo(() => symbols.slice().sort().join(","), [symbols]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = symbols
          .filter((s) => s !== "pUSD")
          .map((s) => PRICE_FEEDS[s])
          .filter(Boolean)
          .join(",");

        if (!ids) {
          setIsLoading(false);
          return;
        }

        // Use CoinGecko public API (no key required for basic price data)
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Price fetch failed");
        const data: Record<string, { usd: number }> = await res.json();

        const updated: Record<string, TokenPrice> = {
          pUSD: { symbol: "pUSD", usd: 1.0, updatedAt: Date.now() },
        };

        for (const symbol of symbols) {
          const id = PRICE_FEEDS[symbol];
          if (id && data[id]) {
            updated[symbol] = {
              symbol,
              usd: data[id].usd,
              updatedAt: Date.now(),
            };
          }
        }

        setPrices(updated);
      } catch {
        // Use fallback prices on error
        setPrices({
          DOT: { symbol: "DOT", usd: 10.0, updatedAt: Date.now() },
          pUSD: { symbol: "pUSD", usd: 1.0, updatedAt: Date.now() },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000);
    return () => clearInterval(interval);
  }, [symbolsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { prices, isLoading };
}
