import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { LanguageRoot } from "./i18n/LanguageRoot";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <LanguageRoot>
      <App />
    </LanguageRoot>
  </HelmetProvider>
);
