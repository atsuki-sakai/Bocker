import { ClerkProvider as ClerkProviderBase } from '@clerk/nextjs';
import { ReactNode } from 'react';

export default function ClerkProvider({ children }: { children: ReactNode }) {
  return <ClerkProviderBase>{children}</ClerkProviderBase>;
}
