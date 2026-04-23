
  import { createRoot } from "react-dom/client";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import App from "./app/App.tsx";
  import { AuthProvider } from "./app/auth/AuthProvider";
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PrimaryCtaProvider>
          <App />
        </PrimaryCtaProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  