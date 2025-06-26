import { Card, CardContent, CardFooter } from '../ui/card'

export function Processing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border bg-card/90 backdrop-blur-sm rounded-3xl">
        <CardContent className="flex flex-col items-center justify-center space-y-6 py-10">
          {/* やわらかなローディングアニメーション */}
          <div className="relative">
            {/* 外側のやわらかなリング */}
            <div className="w-16 h-16 rounded-full border-3 border-muted">
              <div
                className="w-full h-full rounded-full border-t-3 border-pop animate-spin"
                style={{
                  animation: 'spin 2s linear infinite',
                }}
              ></div>
            </div>

            {/* 内側のやわらかなパルス */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-6 h-6 bg-gradient-to-r from-pop to-active rounded-full animate-pulse opacity-70"
                style={{
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              ></div>
            </div>

            {/* 中央のアイコン風 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-button rounded-full flex items-center justify-center shadow-sm">
                <div className="w-2 h-2 bg-button-foreground rounded-full opacity-80"></div>
              </div>
            </div>
          </div>

          {/* やさしいアニメーション付きテキスト */}
          <div className="space-y-3 text-center">
            <p
              className="text-lg font-medium text-primary"
              style={{
                animation: 'fadeInOut 3s ease-in-out infinite',
              }}
            >
              認証情報を確認中
              <span className="inline-flex ml-1">
                <span
                  className="animate-bounce"
                  style={{ animationDelay: '0s', animationDuration: '1.5s' }}
                >
                  .
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: '0.2s', animationDuration: '1.5s' }}
                >
                  .
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: '0.4s', animationDuration: '1.5s' }}
                >
                  .
                </span>
              </span>
            </p>

            <div className="space-y-1 max-w-xs mx-auto">
              <p className="text-sm text-muted-foreground leading-relaxed">
                LINEアカウント情報を確認し、
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                安全にログイン処理を行っています
              </p>
            </div>
          </div>

          {/* やわらかなプログレスバー */}
          <div className="w-full max-w-xs">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pop to-active rounded-full animate-pulse opacity-80"
                style={{
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              ></div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 pt-0 pb-6">
          <div className="text-xs text-muted-foreground/70 text-center leading-relaxed">
            画面が切り替わらない場合は、
            <br />
            再度画面を戻ってからやり直してください
          </div>
        </CardFooter>
      </Card>

      {/* やわらかな背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-64 h-64 bg-palette-3/20 rounded-full"
          style={{
            animation: 'float 6s ease-in-out infinite',
          }}
        ></div>
        <div
          className="absolute -bottom-32 -left-32 w-64 h-64 bg-palette-5/20 rounded-full"
          style={{
            animation: 'float 6s ease-in-out infinite reverse',
          }}
        ></div>
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          0%,
          100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(10px, -10px) scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}
