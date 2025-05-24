

// Clerk
// Clerkエラーのコード一覧
enum ClerkSignInErrorCode {
    session_exists = 'session_exists',
    identifier_already_signed_in = 'identifier_already_signed_in',
    account_transfer_invalid = 'account_transfer_invalid',
    client_state_invalid = 'client_state_invalid',
    strategy_for_user_invalid = 'strategy_for_user_invalid',
    identification_claimed = 'identification_claimed',
    resource_forbidden = 'resource_forbidden',
    resource_not_found = 'resource_not_found',
    no_second_factors = 'no_second_factors',
    sign_in_no_identification_for_user = 'sign_in_no_identification_for_user',
    sign_in_identification_or_user_deleted = 'sign_in_identification_or_user_deleted',
  }
  
  // Clerkエラーの翻訳
  export function translateClerkError(errorCode: ClerkSignInErrorCode) {
    const errorTranslations = {
      session_exists: {
        shortMessage: '既にセッションが存在します',
        longMessage:
          '現在、シングルセッションモードでログイン中です。同時に複数のアカウントにはサインインできません。',
      },
      identifier_already_signed_in: {
        shortMessage: '既にサインインしています',
        longMessage: 'この識別子は既にサインインしています。',
      },
      account_transfer_invalid: {
        shortMessage: '無効なアカウント転送',
        longMessage: '転送可能なアカウントが存在しません。',
      },
      client_state_invalid: {
        shortMessage: '無効な操作',
        longMessage: 'このクライアントに対して操作を完了できませんでした。',
      },
      strategy_for_user_invalid: {
        shortMessage: '無効な認証戦略',
        longMessage: 'このアカウントには無効な認証戦略が指定されています。',
      },
      identification_claimed: {
        shortMessage: '識別子が他のユーザーに使用されています',
        longMessage:
          'このサインアップに使用された識別子の一部が、他のユーザーに接続されています。再度サインアップしてください。',
      },
      resource_forbidden: {
        shortMessage: '操作が許可されていません',
        longMessage: 'このリソースに対する操作は許可されていません。',
      },
      resource_not_found: {
        shortMessage: 'リソースが見つかりません',
        longMessage: '指定されたIDのリソースが見つかりませんでした。',
      },
      no_second_factors: {
        shortMessage: '二要素認証が設定されていません',
        longMessage: '指定された戦略に対する二要素認証が見つかりませんでした。',
      },
      sign_in_no_identification_for_user: {
        shortMessage: 'ユーザーに識別子がありません',
        longMessage: 'このトークンには、作成者であるユーザーに関連付けられた識別子がありません。',
      },
      sign_in_identification_or_user_deleted: {
        shortMessage: '識別子またはユーザーが削除されました',
        longMessage: 'ユーザーまたは選択された識別子が削除されました。最初からやり直してください。',
      },
    }
  
    return (
      errorTranslations[errorCode] || {
        shortMessage: '不明なエラー',
        longMessage: '予期しないエラーが発生しました。詳細についてはサポートにお問い合わせください。',
      }
    )
  }
  