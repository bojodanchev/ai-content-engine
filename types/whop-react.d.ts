declare module "@whop/react" {
  export function useIframeSdk(): {
    inAppPurchase: (input: any) => Promise<{ status: "ok" | "error"; data?: any; error?: string }>;
  };
}


