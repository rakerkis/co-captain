import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme } from "./hooks/useTheme";

// Apply saved theme (defaults to dark)
const saved = localStorage.getItem("co-captain-theme");
applyTheme(saved === "light" ? "light" : "dark");

createRoot(document.getElementById("root")!).render(<App />);
