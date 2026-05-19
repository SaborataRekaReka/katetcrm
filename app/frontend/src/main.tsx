
  import { createRoot } from "react-dom/client";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { ThemeProvider } from "next-themes";
  import App from "./app/App.tsx";
  import { AuthProvider } from "./app/auth/AuthProvider";
  import { Toaster } from "./app/components/ui/sonner";
  import { PrimaryCtaProvider } from "./app/components/shell/primaryCtaStore";
  import "./styles/index.css";

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });

  createRoot(document.getElementById("root")!).render(
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem={false}
      storageKey="katet-crm.theme"
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PrimaryCtaProvider>
            <App />
            <Toaster richColors position="bottom-right" />
          </PrimaryCtaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  