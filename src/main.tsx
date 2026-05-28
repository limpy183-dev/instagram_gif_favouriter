import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./AuthContext";

const pageName = document.body.dataset.page;
if (pageName && !window.location.hash) {
  window.location.hash = `#/${pageName}`;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
