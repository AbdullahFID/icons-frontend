import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/ui/toast";
import { isAuthenticated, onAuthChange } from "./lib/auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import Return from "./pages/Return";
import Inventory from "./pages/Inventory";
import Students from "./pages/Students";
import History from "./pages/History";
import Logs from "./pages/Logs";
import Analytics from "./pages/Analytics";

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [loginFading, setLoginFading] = useState(false);

  useEffect(() => onAuthChange(setAuthed), []);

  function handleLogin() {
    setAuthed(true);
    setLoginFading(true);
  }

  return (
    <>
      {authed && (
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
                <Route path="/analytics" element={<Analytics />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      )}
      {(!authed || loginFading) && (
        <LoginPage
          onLogin={handleLogin}
          pageFading={loginFading}
          onPageFaded={() => setLoginFading(false)}
        />
      )}
    </>
  );
}
