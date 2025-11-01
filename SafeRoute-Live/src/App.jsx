import { Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext.jsx';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import RoutePlanner from './pages/RoutePlanner.jsx';
import LiveTracking from './pages/LiveTracking.jsx';
import ShareTracking from './pages/ShareTracking.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Share from './pages/Share.jsx';
import SOS from './pages/SOS.jsx';

export default function App() {
  return (
<<<<<<< HEAD
    <SocketProvider>
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100">
        <Navbar />
        <div className="pt-16 h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/route-planner" element={<RoutePlanner />} />
            <Route path="/track/:roomId" element={<LiveTracking />} />
            <Route path="/share" element={<Share />} />
            <Route path="/share/track/:sessionId" element={<ShareTracking />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/sos" element={<SOS />} />
          </Routes>
        </div>
=======
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-900 dark:from-slate-900 dark:via-slate-950 dark:to-black dark:text-slate-100">
      <Navbar />
      <div className="pt-16 h-[calc(100vh-4rem)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/route-planner" element={<RoutePlanner />} />
          <Route path="/track/:roomId" element={<LiveTracking />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/share" element={<Share />} />
          <Route path="/sos" element={<SOS />} />
        </Routes>
>>>>>>> fb5b880 (Fix theme toggle and add light mode support)
      </div>
    </SocketProvider>
  );
}


