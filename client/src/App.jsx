import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ApartmentsPage from './pages/ApartmentsPage';
import ApartmentDetailPage from './pages/ApartmentDetailPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';
import { PricingPage, BlogPage } from './pages/PlaceholderPages';
import FaqPage from './pages/FaqPage';
import LegalPage from './pages/LegalPage';
import { PRIVACY_POLICY, TERMS_OF_USE } from './data/legal';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MyApartmentsPage from './pages/MyApartmentsPage';
import ListApartmentPage from './pages/ListApartmentPage';
import EditApartmentPage from './pages/EditApartmentPage';
import RenewApartmentPage from './pages/RenewApartmentPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminPricingPage from './pages/AdminPricingPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminFaqPage from './pages/AdminFaqPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="apartments" element={<ApartmentsPage />} />
            <Route path="apartments/:id" element={<ApartmentDetailPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="privacy" element={<LegalPage doc={PRIVACY_POLICY} />} />
            <Route path="terms" element={<LegalPage doc={TERMS_OF_USE} />} />

            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />

            <Route
              path="my-apartments"
              element={
                <ProtectedRoute>
                  <MyApartmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-apartments/:id/edit"
              element={
                <ProtectedRoute>
                  <EditApartmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-apartments/:id/renew"
              element={
                <ProtectedRoute>
                  <RenewApartmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="list-apartment"
              element={
                <ProtectedRoute>
                  <ListApartmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute role="admin">
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="admin/pricing"
              element={
                <ProtectedRoute role="admin">
                  <AdminPricingPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="admin/faq"
              element={
                <ProtectedRoute role="admin">
                  <AdminFaqPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
