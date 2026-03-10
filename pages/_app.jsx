import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';

import {
  RainbowKitProvider,
  connectorsForWallets,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
  braveWallet,
  rabbyWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { chains, publicClient } = configureChains([polygon], [publicProvider()]);

// Only include WalletConnect if a project ID is configured
const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

const connectors = connectorsForWallets([
  {
    groupName: 'Browser Wallets',
    wallets: [
      injectedWallet({ chains }),
      metaMaskWallet({ chains, projectId: wcProjectId || 'polypocket' }),
      braveWallet({ chains }),
      rabbyWallet({ chains }),
    ],
  },
  {
    groupName: 'Mobile & More',
    wallets: [
      coinbaseWallet({ appName: 'PolyPocket', chains }),
      rainbowWallet({ chains, projectId: wcProjectId || 'polypocket' }),
      ...(wcProjectId ? [walletConnectWallet({ projectId: wcProjectId, chains })] : []),
    ],
  },
]);

const wagmiConfig = createConfig({ autoConnect: true, connectors, publicClient });
const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider
          chains={chains}
          theme={lightTheme({
            accentColor: '#7c3aed',
            accentColorForeground: 'white',
            borderRadius: 'large',
            fontStack: 'system',
          })}
          modalSize="compact"
        >
          <Component {...pageProps} />
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
