import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";
import { validateEnvironment } from "./lib/env-validator";

// Validate environment variables before starting the app
validateEnvironment();

createRoot(document.getElementById("root")!).render(<App />);
