import { defineChain } from "viem";
import { createConfig, http } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const polkadotHubTestnet = defineChain({
  id: 420420421,
  name: "Polkadot Hub Testnet",
  nativeCurrency: { name: "DOT", symbol: "DOT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-passet-hub.parity-testnet.parity.io",
    },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: "PolyStable",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "polystable-dev",
  chains: [polkadotHubTestnet],
  transports: {
    [polkadotHubTestnet.id]: http(
      "https://testnet-passet-hub-eth-rpc.polkadot.io"
    ),
  },
  ssr: true,
});
