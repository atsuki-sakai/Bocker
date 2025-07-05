interface Window {
  gtag: (
    command: "config" | "event",
    targetId: string,
    config?: Gtag.ConfigParams | Gtag.EventParams
  ) => void;
}

declare namespace Gtag {
  interface ConfigParams {
    page_path?: URL;
  }

  type EventNames = "login" | "purchase" | "sign_up";

  interface EventParams {
    method?: string;
    value?: number;
    currency?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
}
