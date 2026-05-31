import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ApartmentsPage from './pages/ApartmentsPage';
import ApartmentDetailPage from './pages/ApartmentDetailPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';
import { PricingPage, FaqPage, ContactPage, BlogPage } from './pages/PlaceholderPages';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyApartmentsPage from './pages/MyApartmentsPage';
import ListApartmentPage from './pages/ListApartmentPage';
import EditApartmentPage from './pages/EditApartmentPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

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

            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />

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

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
