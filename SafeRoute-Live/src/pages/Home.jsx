import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex-1 flex items-center">
        <div className="mx-auto max-w-5xl px-6 w-full">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
              SafeRoute Live
            </h1>
            <p className="mt-6 text-slate-600 dark:text-slate-300 text-xl font-medium">Travel Smart. Travel Safe.</p>
            <p className="mt-3 text-slate-500 dark:text-slate-400 text-base max-w-2xl mx-auto">Plan safer routes, share live tracking, and get real-time safety insights.
            </p>
            <div className="mt-10 flex justify-center gap-4 flex-wrap">
              <Link to="/route-planner" className="btn-primary px-6 py-3.5 rounded-xl text-white font-semibold shadow-lg transition-all hover:shadow-xl hover:brightness-110 hover:-translate-y-0.5">Plan a Route</Link>
              <Link to="/share" className="btn-success px-6 py-3.5 rounded-xl text-white font-semibold shadow-lg transition-all hover:shadow-xl hover:brightness-110 hover:-translate-y-0.5">Share Live Location</Link>
              <Link to="/dashboard" className="px-6 py-3.5 rounded-xl glass hover:bg-slate-100 dark:hover:bg-white/15 font-semibold text-slate-700 dark:text-slate-200 transition-all hover:-translate-y-0.5">View Live Safety Map</Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Full-width feature grid at bottom */}
      <div className="w-full px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { 
              t: 'Plan', 
              d: 'Choose safer paths based on lighting and crowd data.',
              details: 'Our intelligent routing system analyzes real-time safety metrics including street lighting, crowd density, and historical incident data to recommend the safest routes for your journey.'
            }, 
            { 
              t: 'Track', 
              d: 'Share your journey with friends in real time.',
              details: 'Enable live location sharing with trusted contacts. They can follow your journey in real-time and receive notifications when you reach your destination safely.'
            }, 
            { 
              t: 'Arrive Safely', 
              d: 'Receive alerts and re-routing suggestions.',
              details: 'Get instant notifications about potential safety concerns along your route. Our system continuously monitors conditions and suggests alternative paths when needed.'
            }
          ].map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass rounded-2xl p-10 sm:p-12 h-full min-h-[280px] hover:bg-white/80 dark:hover:bg-white/15 transition-all border-2 border-primary/20 hover:border-primary/40"
            >
              <div className="text-center">
                <div className="font-bold text-2xl text-slate-900 dark:text-white mb-4">{c.t}</div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">{c.d}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{c.details}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}



