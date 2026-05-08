import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import StorefrontHome from "@/pages/StorefrontHome";
import Categories from "@/pages/Categories";
import Products from "@/pages/Products";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Confirmation from "@/pages/Confirmation";
import TrackOrder from "@/pages/TrackOrder";
import StoreClosed from "@/pages/StoreClosed";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminStore from "@/pages/admin/AdminStore";
import MasterDashboard from "@/pages/admin/MasterDashboard";
import MasterVendors from "@/pages/admin/MasterVendors";

function App() {
  return (
    <div className="App">
      <AdminAuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Admin (auto-routes to master or vendor by role) */}
              <Route path="/admin" element={<AdminLayout />}>
                {/* Vendor admin pages */}
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="store" element={<AdminStore />} />
                {/* Master admin pages */}
                <Route path="master" element={<MasterDashboard />} />
                <Route path="master/vendors" element={<MasterVendors />} />
              </Route>

              {/* Customer storefront — slug-scoped */}
              <Route path="/" element={<Landing />} />
              <Route
                path="/store/:slug"
                element={
                  <div className="app-shell">
                    <StorefrontHome />
                  </div>
                }
              />
              <Route
                path="/store/:slug/menu"
                element={
                  <div className="app-shell">
                    <Categories />
                  </div>
                }
              />
              <Route
                path="/store/:slug/c/:categoryId"
                element={
                  <div className="app-shell">
                    <Products />
                  </div>
                }
              />
              <Route
                path="/store/:slug/cart"
                element={
                  <div className="app-shell">
                    <Cart />
                  </div>
                }
              />
              <Route
                path="/store/:slug/checkout"
                element={
                  <div className="app-shell">
                    <Checkout />
                  </div>
                }
              />
              <Route
                path="/store/:slug/closed"
                element={
                  <div className="app-shell">
                    <StoreClosed />
                  </div>
                }
              />
              <Route
                path="/confirmation"
                element={
                  <div className="app-shell">
                    <Confirmation />
                  </div>
                }
              />
              <Route
                path="/track/:token"
                element={
                  <div className="app-shell">
                    <TrackOrder />
                  </div>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AdminAuthProvider>
      <Toaster theme="dark" richColors position="top-center" toastOptions={{ style: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" } }} />
    </div>
  );
}

export default App;
