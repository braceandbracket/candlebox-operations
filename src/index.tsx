import "./init";
import React from "react";
import { createRoot } from "react-dom/client";
import "@vibe/core/tokens";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const root = createRoot(document.getElementById("root")!);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
