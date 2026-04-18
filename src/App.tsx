// App.tsx — top-level component that wires up routing and global providers.
// Every page lives under <Layout /> so the sidebar/mobile nav is always visible.
// <ToastProvider> hoists the toast context above the router so any page can fire toasts.

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/ui/toast";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import Return from "./pages/Return";
import Inventory from "./pages/Inventory";
import Students from "./pages/Students";
import History from "./pages/History";
import Logs from "./pages/Logs";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Parent route renders <Layout /> which itself renders <Outlet />
              for whichever child route matches the URL. */}
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/return" element={<Return />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/students" element={<Students />} />
            <Route path="/history" element={<History />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
