declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: Record<string, unknown>,
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export {};
