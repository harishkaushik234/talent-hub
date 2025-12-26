import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const queryClient = new QueryClient();

// Suppress known noisy dev warnings in dev environment (local convenience only)
if (import.meta.env.DEV) {
  const _warn = console.warn;
  const _log = console.log;

  console.warn = (...args) => {
    try {
      const msg = args[0] && typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("Clerk has been loaded with development keys")) return;
      if (msg.includes("[CallState]: Participant with sessionId")) return;
    } catch (e) {
      // ignore
    }
    _warn.apply(console, args);
  };

  console.log = (...args) => {
    try {
      const msg = args[0] && typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("[CallState]: Participant with sessionId")) return;
    } catch (e) {
      // ignore
    }
    _log.apply(console, args);
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <App />
        </ClerkProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
