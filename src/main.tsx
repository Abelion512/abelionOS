import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import App from "./App";
import "./index.css";

// ponytail: tanpa QueryClientProvider (semua data via Convex reactive hooks)
// dan tanpa Toaster (tidak ada pemanggil toast di seluruh aplikasi).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexClientProvider>
      <App />
    </ConvexClientProvider>
  </StrictMode>
);
