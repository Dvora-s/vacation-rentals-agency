import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingPublishButton from './FloatingPublishButton';
import BrandingBadge from './BrandingBadge';
import DiroBot from './DiroBot';
import './Layout.css';

function Layout() {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout-main">
        <Outlet />
      </main>
      <Footer />
      <FloatingPublishButton />
      <BrandingBadge />
      <DiroBot />
    </div>
  );
}

export default Layout;
