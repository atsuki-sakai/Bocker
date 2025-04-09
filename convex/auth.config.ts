const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: process.env.NEXT_PUBLIC_CONVEX_AUD,
    },
  ],
};

export default authConfig;
