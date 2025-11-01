import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import MapComponent from '../components/MapComponent.jsx';

export default function Dashboard() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['6am', '9am', '12pm', '3pm', '6pm', '9pm'],
        datasets: [
          {
            label: 'Foot Traffic Density',
            data: [10, 28, 35, 25, 40, 20],
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167,139,250,0.2)'
          }
        ]
      },
      options: { responsive: true, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#ddd' } }, y: { ticks: { color: '#ddd' } } } }
    });
    return () => chart.destroy();
  }, []);

  return (
    <div className="h-full w-full grid grid-rows-[1fr_auto] lg:grid-rows-1 lg:grid-cols-[1fr_420px] gap-4 p-4">
      <div className="relative">
        <div className="absolute inset-0">
          <MapComponent />
        </div>
      </div>
      <div className="space-y-4 order-first lg:order-none">
        <div className="glass rounded-2xl p-4">
          <div className="font-semibold mb-2">Foot Traffic Density</div>
          <canvas ref={canvasRef} height="160" />
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="font-semibold mb-2">Top Zones</div>
          <div className="text-sm opacity-90">Safest: MG Road, Indiranagar, Koramangala</div>
          <div className="text-sm opacity-90">Riskiest: KR Market, Shivajinagar</div>
        </div>
      </div>
    </div>
  );
}


