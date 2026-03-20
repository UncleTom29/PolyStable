import { defineChain } from "viem";
import { http } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub Testnet",
  nativeCurrency: { name: "DOT", symbol: "DOT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://services.polkadothub-rpc.com/testnet"],
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
      "https://services.polkadothub-rpc.com/testnet"
    ),
  },
  ssr: true,
});