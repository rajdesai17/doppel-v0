import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App } from "./app";
import { LandingPage } from "./pages/landing";
import { SetupPage } from "./pages/setup";
import { LoadingPage } from "./pages/loading";
import { ConversationPage } from "./pages/conversation";
import { ReplayPage } from "./pages/replay";
import { ConversationPreviewPage } from "./pages/conversation-preview";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<LandingPage />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="loading/:sessionId" element={<LoadingPage />} />
          <Route path="conversation-preview" element={<ConversationPreviewPage />} />
          <Route path="conversation/:sessionId" element={<ConversationPage />} />
          <Route path="replay/:sessionId" element={<ReplayPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
