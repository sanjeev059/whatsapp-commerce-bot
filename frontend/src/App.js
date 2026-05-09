import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { Toaster } from "@/components/ui/sonner";
import StorefrontShell from "@/components/StorefrontShell";
import Landing from "@/pages/Landing";
import StorefrontHome from "@/pages/StorefrontHome";
import Categories from "@/pages/Categories";
import Products from "@/pages/Products";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Confirmation from "@/pages/Confirmation";
import TrackOrder from "@/pages/TrackOrder";
import DeliveryHandoff from "@/pages/DeliveryHandoff";
import StoreClosed from "@/pages/StoreClosed";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminStore from "@/pages/admin/AdminStore";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminOffers from "@/pages/admin/AdminOffers";
import MasterDashboard from "@/pages/admin/MasterDashboard";
import MasterVendors from "@/pages/admin/MasterVendors";
import MasterSecurity from "@/pages/admin/MasterSecurity";
import MasterBilling from "@/pages/admin/MasterBilling";
import MasterPayments from "@/pages/admin/MasterPayments";
import MasterOffers from "@/pages/admin/MasterOffers";

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
                <Route path="offers" element={<AdminOffers />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="store" element={<AdminStore />} />
                {/* Master admin pages */}
                <Route path="master" element={<MasterDashboard />} />
                <Route path="master/vendors" element={<MasterVendors />} />
                <Route path="master/billing" element={<MasterBilling />} />
                <Route path="master/payments" element={<MasterPayments />} />
                <Route path="master/offers" element={<MasterOffers />} />
                <Route path="master/security" element={<MasterSecurity />} />
              </Route>

              {/* Customer storefront — slug-scoped, age-gated */}
              <Route path="/" element={<Landing />} />
              <Route path="/store/:slug" element={<StorefrontShell />}>
                <Route index element={<StorefrontHome />} />
                <Route path="menu" element={<Categories />} />
                <Route path="c/:categoryId" element={<Products />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="closed" element={<StoreClosed />} />
              </Route>
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
              <Route
                path="/d/:token"
                element={
                  <div className="app-shell">
                    <DeliveryHandoff />
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
