# Implementation Plan

- [x] 1. Analyze current environment configuration and identify all missing variables
  - Read the complete `EnvConfig` type definition from `lib/env-config.ts`
  - Compare against existing `.env.test` file to identify missing variables
  - Document the complete list of missing environment variables
  - _Requirements: 1.1, 2.1_

- [x] 2. Update .env.test with all missing Stripe configuration variables
  - Add `NEXT_PUBLIC_MICRO_MONTHLY_PRC_ID` with test value `price_test_mock_micro_monthly`
  - Add `NEXT_PUBLIC_MICRO_YEARLY_PRC_ID` with test value `price_test_mock_micro_yearly`
  - Add `NEXT_PUBLIC_LITE_MONTHLY_PRC_ID` with test value `price_test_mock_lite_monthly`
  - Add `NEXT_PUBLIC_LITE_YEARLY_PRC_ID` with test value `price_test_mock_lite_yearly`
  - Add `NEXT_PUBLIC_PRO_MONTHLY_PRC_ID` with test value `price_test_mock_pro_monthly`
  - Add `NEXT_PUBLIC_PRO_YEARLY_PRC_ID` with test value `price_test_mock_pro_yearly`
  - _Requirements: 1.1, 3.2_

- [x] 3. Add missing Stripe product configuration variables
  - Add `NEXT_PUBLIC_MICRO_PROD_ID` with test value `prod_test_mock_micro`
  - Add `NEXT_PUBLIC_LITE_PROD_ID` with test value `prod_test_mock_lite`
  - Add `NEXT_PUBLIC_PRO_PROD_ID` with test value `prod_test_mock_pro`
  - _Requirements: 1.1, 3.2_

- [x] 4. Configure authentication and security test variables
  - Add `NEXT_PUBLIC_APP_COOKIE_SECRET` with test value `test_app_cookie_secret_key`
  - Add `APP_JWT_SECRET` with test value `test_app_jwt_secret_key`
  - Add `SYSMTE_COOKIE_SECRET` with test value `test_system_cookie_secret_key`
  - Add `SYSTEM_JWT_SECRET` with test value `test_system_jwt_secret_key`
  - Add `NEXT_PUBLIC_LOGIN_SESSION` with test value `test_login_session`
  - Add `NEXT_PUBLIC_SESSION_SERCRET` with test value `test_session_secret_key`
  - _Requirements: 1.1, 3.1_

- [x] 5. Add Clerk authentication configuration variables
  - Add `CLERK_WEBHOOK_SIGNING_SECRET` with test value `whsec_test_clerk_webhook`
  - Add `NEXT_PUBLIC_CLERK_SIGN_UP_URL` with test value `/sign-up`
  - Add `NEXT_PUBLIC_CLERK_SIGN_UP_REDIRECT_URL` with test value `/dashboard`
  - Add `NEXT_PUBLIC_CLERK_SIGN_IN_REDIRECT_URL` with test value `/dashboard`
  - _Requirements: 1.1, 3.1_

- [x] 6. Configure GCP and storage service test variables
  - Add `GCP_AI_STUDIO_API_KEY` with test value `test_gcp_ai_studio_key`
  - Add `GCP_PROJECT` with test value `test-project-id`
  - Add `GCP_CLIENT_EMAIL` with test value `test@test-project.iam.gserviceaccount.com`
  - Add `GCP_PRIVATE_KEY` with test value for service account private key
  - Add `NEXT_PUBLIC_GCP_PROJECT_ID` with test value `test-project-id`
  - Add `NEXT_PUBLIC_GCP_STORAGE_BUCKET_NAME` with test value `test-storage-bucket`
  - _Requirements: 1.1, 3.1_

- [x] 7. Add GCS lifecycle and monitoring configuration
  - Add `GCS_LIFECYCLE_ENABLED` with test value `false`
  - Add `GCS_HOT_TIER_DAYS` with test value `30`
  - Add `GCS_WARM_TIER_DAYS` with test value `90`
  - Add `GCP_MONITORING_ENABLED` with test value `false`
  - _Requirements: 1.1, 3.1_

- [x] 8. Configure additional service variables
  - Add `NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY` with test value `test_channel_talk_key`
  - Add `RESEND_FROM_EMAIL` with test value `test@example.com`
  - _Requirements: 1.1, 3.1_

- [x] 9. Verify environment configuration completeness
  - Run the application in test mode to check for any remaining missing variables
  - Compare the updated `.env.test` against the complete `EnvConfig` type
  - Ensure all required variables are present with appropriate test values
  - _Requirements: 1.1, 2.2_

- [x] 10. Test the e2e test suite execution
  - Run `pnpm test:e2e` to verify tests can start without environment errors
  - Confirm the application starts successfully during test execution
  - Verify that basic page rendering works without configuration errors
  - _Requirements: 1.1, 1.2_

- [x] 11. Validate test environment isolation
  - Verify that all test values are mock/test values and not production credentials
  - Confirm that external service calls use test endpoints or are mocked
  - Ensure no real data or services are accessed during test execution
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 12. Document the test environment configuration
  - Add comments to `.env.test` explaining the purpose of each variable group
  - Create documentation for maintaining test environment configuration
  - Document the process for adding new environment variables to test config
  - _Requirements: 2.1, 2.2_