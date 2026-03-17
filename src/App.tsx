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

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/return" element={<Return />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/students" element={<Students />} />
            <Route path="/history" element={<History />} />
            <Route path="/logs" element={<Logs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
