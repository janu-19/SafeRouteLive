import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import RoutePlanner from './pages/RoutePlanner.jsx';
import LiveTracking from './pages/LiveTracking.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Share from './pages/Share.jsx';
import SOS from './pages/SOS.jsx';

export default function App() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100">
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
      </div>
    </div>
  );
}


