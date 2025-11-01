import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center">
      <div className="mx-auto max-w-5xl px-6 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-violet-400 to-indigo-400">SafeRoute Live</span>
          </h1>
          <p className="mt-4 text-slate-300 text-lg">Travel Smart. Travel Safe.</p>
          <p className="mt-2 text-slate-400">Plan safer routes, share live tracking, and get real-time safety insights.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link to="/route-planner" className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 font-semibold">Plan a Route</Link>
            <Link to="/share" className="px-5 py-3 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:brightness-110 font-semibold">🔵 Share Live Location</Link>
            <Link to="/dashboard" className="px-5 py-3 rounded-xl glass hover:bg-white/10">View Live Safety Map</Link>
          </div>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[{ t: 'Plan', d: 'Choose safer paths based on lighting and crowd data.' }, { t: 'Track', d: 'Share your journey with friends in real time.' }, { t: 'Arrive Safely', d: 'Receive alerts and re-routing suggestions.' }].map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="glass rounded-2xl p-5">
              <div className="font-semibold">{c.t}</div>
              <div className="mt-2 text-sm text-slate-300">{c.d}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}


