import { getEnv } from '@/lib/env-config'
const authConfig = {
  providers: [
    {
      domain: getEnv('CLERK_JWT_ISSUER_DOMAIN'),
      applicationID: getEnv('NEXT_PUBLIC_CONVEX_AUD'),
    },
  ],
};

export default authConfig;
