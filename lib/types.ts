
// Stripe types
export interface StripeLineItem {
    id: string;
    description: string | null;
    amount: number;
    proration: boolean;
    plan?: {
      nickname?: string;
      id: string;
    };
    type: string;
  }
  
  export interface StripePreviewInvoice {
    total: number;
    lines: {
      data: StripeLineItem[];
    };
  }
  
  export interface StripePreviewData {
    items: Array<{
      id: string;
      price: string;
    }>;
    status: string;
    previewInvoice: StripePreviewInvoice;
    prorationDate: number;
    success: boolean;
  }
  
  export type BillingPeriod = "monthly" | "yearly";
  