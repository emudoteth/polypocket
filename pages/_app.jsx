import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';

import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { chains, publicClient } = configureChains(
  [polygon],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'PolyPocket',
  projectId: 'polypocket', // WalletConnect project ID — replace with real one for production
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

const queryClient = new QueryClient();

const rk_theme = lightTheme({
  accentColor: '#7c3aed',
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
});

export default function App({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider chains={chains} theme={rk_theme}>
          <Component {...pageProps} />
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
