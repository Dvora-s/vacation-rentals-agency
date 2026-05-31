import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingPublishButton from './FloatingPublishButton';
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
    </div>
  );
}

export default Layout;
