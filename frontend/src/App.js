import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Categories from "@/pages/Categories";
import Products from "@/pages/Products";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Confirmation from "@/pages/Confirmation";

function App() {
  return (
    <div className="App">
      <CartProvider>
        <BrowserRouter>
          <div className="app-shell" data-testid="app-shell">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/store" element={<Categories />} />
              <Route path="/store/:categoryId" element={<Products />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
        <Toaster
          theme="dark"
          richColors
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </CartProvider>
    </div>
  );
}

export default App;
