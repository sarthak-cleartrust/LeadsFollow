import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="leadfollow-theme">
      <Toaster />
      <App />
    </ThemeProvider>
  </QueryClientProvider>
);
