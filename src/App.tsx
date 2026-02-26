import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Lightbulb, Gauge, Info, Settings2, Battery, ShieldAlert as Wolf, RotateCcw, Volume2, VolumeX, HelpCircle, X } from 'lucide-react';

// Types
interface Stats {
  voltage: number;
  r1: number;
  r2: number;
  r3: number;
  rInternal: number;
  iTotal: number;
  i1: number;
  i2: number;
  v3: number;
  rTotal: number;
}

// Helper to convert numbers to Persian digits
const toPersianDigits = (num: string | number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [r1, setR1] = useState<number>(50); // Rheostat
  const [voltage, setVoltage] = useState<number>(10);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [activeHelp, setActiveHelp] = useState<'voltage' | 'rheostat' | null>(null);
  
  // Audio Refs
  const audioCtx = useRef<AudioContext | null>(null);
  const humOsc = useRef<OscillatorNode | null>(null);
  const humGain = useRef<GainNode | null>(null);
  const filter = useRef<BiquadFilterNode | null>(null);

  // Fixed values for other components
  const rInternal = 2; // r
  const r2 = 50;       // R2
  const r3 = 10;       // R3

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const rParallel = (r1 * r2) / (r1 + r2);
    const rTotal = rInternal + r3 + rParallel;
    const iTotal = voltage / rTotal;
    const v3 = iTotal * r3;
    const vParallel = iTotal * rParallel;
    const i1 = vParallel / r1;
    const i2 = vParallel / r2;

    return {
      voltage,
      r1,
      r2,
      r3,
      rInternal,
      iTotal,
      i1,
      i2,
      v3,
      rTotal
    };
  }, [r1, voltage]);

  // Audio Initialization & Control
  useEffect(() => {
    if (isAudioEnabled && !audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Hum Sound (Low frequency electrical hum)
      humOsc.current = audioCtx.current.createOscillator();
      humGain.current = audioCtx.current.createGain();
      filter.current = audioCtx.current.createBiquadFilter();

      humOsc.current.type = 'triangle';
      humOsc.current.frequency.setValueAtTime(50, audioCtx.current.currentTime); // 50Hz hum
      
      filter.current.type = 'lowpass';
      filter.current.frequency.setValueAtTime(150, audioCtx.current.currentTime);

      humGain.current.gain.setValueAtTime(0, audioCtx.current.currentTime);

      humOsc.current.connect(filter.current);
      filter.current.connect(humGain.current);
      humGain.current.connect(audioCtx.current.destination);

      humOsc.current.start();
    }

    if (!isAudioEnabled && audioCtx.current) {
      humGain.current?.gain.setTargetAtTime(0, audioCtx.current.currentTime, 0.1);
      setTimeout(() => {
        audioCtx.current?.close();
        audioCtx.current = null;
      }, 200);
    }
  }, [isAudioEnabled]);

  // Update Hum Volume based on Current
  useEffect(() => {
    if (audioCtx.current && humGain.current) {
      // Map current (0.1 to ~2A) to gain (0 to 0.15)
      const targetGain = Math.min(0.15, stats.iTotal * 0.05);
      humGain.current.gain.setTargetAtTime(targetGain, audioCtx.current.currentTime, 0.1);
      
      // Slightly shift frequency with current for "load" effect
      const targetFreq = 50 + stats.iTotal * 2;
      humOsc.current?.frequency.setTargetAtTime(targetFreq, audioCtx.current.currentTime, 0.1);
    }
  }, [stats.iTotal]);

  // Slider Sound Effect
  const playSliderSound = () => {
    if (audioCtx.current && isAudioEnabled) {
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200 + Math.random() * 50, audioCtx.current.currentTime);
      
      gain.gain.setValueAtTime(0.02, audioCtx.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      
      osc.start();
      osc.stop(audioCtx.current.currentTime + 0.05);
    }
  };

  const electronDuration = useMemo(() => {
    return Math.max(0.2, 1 / stats.iTotal);
  }, [stats.iTotal]);

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans overflow-x-hidden">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden"
          >
            {/* Background Particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: Math.random() * window.innerWidth, 
                    y: Math.random() * window.innerHeight,
                    opacity: 0 
                  }}
                  animate={{ 
                    y: [null, Math.random() * -100],
                    opacity: [0, 0.5, 0]
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 3, 
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute w-1 h-1 bg-cyan-400 rounded-full blur-[1px]"
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-6 z-10"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="text-cyan-400 text-xs font-mono tracking-[0.3em] uppercase glow-text-electric mb-2"
              >
                made with alonewolf studio
              </motion.div>

              <div className="relative">
                <motion.div
                  animate={{ 
                    opacity: [1, 0.8, 1],
                    scale: [1, 1.02, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.3)] bg-slate-900 flex items-center justify-center p-2"
                >
                  <img 
                    src="https://picsum.photos/seed/alonewolf-logo/400/400" 
                    alt="Alonewolf Logo" 
                    className="w-full h-full object-cover rounded-full mix-blend-lighten grayscale hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
                <div className="absolute -inset-4 bg-cyan-400/10 blur-3xl rounded-full -z-10" />
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-white glow-text-electric flicker uppercase mt-4 -translate-x-4">
                Alonewolf Laboratory
              </h1>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="p-4 md:p-8 flex flex-col items-center"
            dir="rtl"
          >
            {/* Header */}
            <header className="w-full max-w-4xl mb-8 flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <Wolf className="w-8 h-8 text-cyan-400" />
                <h1 className="text-2xl font-bold text-white glow-text-electric uppercase tracking-tighter">
                  Alonewolf Laboratory
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className={`p-2 rounded-full transition-all ${isAudioEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}
                  title={isAudioEnabled ? "قطع صدا" : "وصل صدا"}
                >
                  {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <div className="text-slate-500 text-xs font-mono hidden md:block">
                  نسخه ۱.۰.۰ | شبیه‌ساز فیزیک
                </div>
              </div>
            </header>

            <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Stats Column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-6">
                    <Gauge className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">اندازه‌گیری‌های زنده</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard 
                      label="ولتاژ کل (V)" 
                      value={toPersianDigits(stats.voltage.toFixed(1))} 
                      unit="V" 
                      color="text-blue-400" 
                      icon={<Battery className="w-3 h-3" />}
                    />
                    <StatCard 
                      label="جریان کل (I کل)" 
                      value={toPersianDigits(stats.iTotal.toFixed(3))} 
                      unit="A" 
                      color="text-cyan-400" 
                      icon={<Zap className="w-3 h-3" />}
                    />
                    <StatCard 
                      label="جریان شاخه ۱ (I۱)" 
                      value={toPersianDigits(stats.i1.toFixed(3))} 
                      unit="A" 
                      color="text-emerald-400" 
                    />
                    <StatCard 
                      label="جریان شاخه ۲ (I۲)" 
                      value={toPersianDigits(stats.i2.toFixed(3))} 
                      unit="A" 
                      color="text-emerald-400" 
                    />
                    <StatCard 
                      label="ولتاژ R۳ (V۳)" 
                      value={toPersianDigits(stats.v3.toFixed(2))} 
                      unit="V" 
                      color="text-amber-400" 
                    />
                    <StatCard 
                      label="مقاومت کل" 
                      value={toPersianDigits(stats.rTotal.toFixed(1))} 
                      unit="Ω" 
                      color="text-slate-400" 
                    />
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-bold text-white">کنترل ولتاژ باتری</h2>
                    </div>
                    <button 
                      onClick={() => setActiveHelp(activeHelp === 'voltage' ? null : 'voltage')}
                      className={`p-1.5 rounded-lg transition-colors ${activeHelp === 'voltage' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {activeHelp === 'voltage' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 top-16 left-6 right-6 bg-blue-900/90 border border-blue-500/30 backdrop-blur-md p-4 rounded-xl text-xs text-blue-100 leading-relaxed shadow-xl"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold">راهنمای ولتاژ:</span>
                          <button onClick={() => setActiveHelp(null)}><X className="w-3 h-3" /></button>
                        </div>
                        افزایش ولتاژ باعث افزایش فشار الکتریکی و در نتیجه افزایش جریان کل مدار می‌شود (رابطه مستقیم). کاهش آن باعث ضعیف شدن جریان می‌گردد.
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-mono">
                      <span className="text-slate-500">{toPersianDigits(5)} ولت</span>
                      <span className="text-blue-400 font-bold">{toPersianDigits(voltage)} ولت</span>
                      <span className="text-slate-500">{toPersianDigits(20)} ولت</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      step="0.5"
                      value={voltage}
                      onChange={(e) => {
                        setVoltage(parseFloat(e.target.value));
                        playSliderSound();
                      }}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-amber-400" />
                      <h2 className="text-lg font-bold text-white">کنترل رئوستا (R۱)</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setActiveHelp(activeHelp === 'rheostat' ? null : 'rheostat')}
                        className={`p-1.5 rounded-lg transition-colors ${activeHelp === 'rheostat' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setR1(50);
                          playSliderSound();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition-all active:scale-95 group"
                        title="بازنشانی به ۵۰ اهم"
                      >
                        <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform" />
                        <span>بازنشانی</span>
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {activeHelp === 'rheostat' && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 top-16 left-6 right-6 bg-amber-900/90 border border-amber-500/30 backdrop-blur-md p-4 rounded-xl text-xs text-amber-100 leading-relaxed shadow-xl"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold">راهنمای رئوستا:</span>
                          <button onClick={() => setActiveHelp(null)}><X className="w-3 h-3" /></button>
                        </div>
                        افزایش مقاومت رئوستا باعث دشوارتر شدن عبور جریان در این شاخه و کاهش جریان کل می‌شود (رابطه معکوس). همچنین ولتاژ دو سر مقاومت‌های دیگر را تغییر می‌دهد.
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-mono">
                      <span className="text-slate-500">{toPersianDigits(1)} اهم</span>
                      <span className="text-amber-400 font-bold">{toPersianDigits(r1)} اهم</span>
                      <span className="text-slate-500">{toPersianDigits(100)} اهم</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={r1}
                      onChange={(e) => {
                        setR1(parseInt(e.target.value));
                        playSliderSound();
                      }}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Circuit Column */}
              <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[550px] lab-grid">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.08),transparent_70%)]" />
                
                <svg viewBox="0 0 600 500" className="w-full h-full max-w-lg z-10 drop-shadow-2xl">
                  <defs>
                    <linearGradient id="batteryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="resistorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="50%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="meterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
                    </marker>
                  </defs>

                  {/* Main Circuit Path */}
                  <path
                    id="circuit-path"
                    d="M 100 250 L 100 150 L 500 150 L 500 400 L 100 400 L 100 350"
                    fill="none"
                    stroke="rgba(34, 211, 238, 0.3)"
                    strokeWidth="3"
                    className="glow-wire"
                  />
                  
                  {/* Parallel Branch 1 (Middle) */}
                  <path 
                    d="M 350 150 L 350 400" 
                    fill="none" 
                    stroke="rgba(34, 211, 238, 0.3)" 
                    strokeWidth="3" 
                    className="glow-wire" 
                  />

                  {/* Junction Nodes */}
                  <circle cx="350" cy="150" r="4" fill="#22d3ee" className="glow-wire" />
                  <circle cx="350" cy="400" r="4" fill="#22d3ee" className="glow-wire" />
                  <circle cx="500" cy="150" r="4" fill="#22d3ee" className="glow-wire" />
                  <circle cx="500" cy="400" r="4" fill="#22d3ee" className="glow-wire" />

                  {/* Battery */}
                  <g transform="translate(80, 250)" className="glow-component">
                    <rect x="0" y="0" width="40" height="100" rx="6" fill="url(#batteryGrad)" stroke="#60a5fa" strokeWidth="2" />
                    <rect x="10" y="-5" width="20" height="5" rx="1" fill="#60a5fa" />
                    <Battery className="w-8 h-8 text-white/80" x="4" y="34" />
                    <text x="-15" y="50" textAnchor="middle" fill="#60a5fa" fontSize="14" fontWeight="bold" transform="rotate(-90, -15, 50)">{toPersianDigits(voltage.toFixed(1))}V</text>
                  </g>

                  {/* Internal Resistance r */}
                  <g transform="translate(80, 355)" className="glow-component">
                    <rect x="0" y="0" width="40" height="30" rx="4" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                    <path d="M 5 15 L 10 5 L 15 25 L 20 5 L 25 25 L 30 5 L 35 15" fill="none" stroke="#94a3b8" strokeWidth="2" />
                    <text x="50" y="20" textAnchor="start" fill="#94a3b8" fontSize="12" fontWeight="bold">r = {toPersianDigits(rInternal)}Ω</text>
                  </g>

                  {/* Resistor R3 (Top) */}
                  <g transform="translate(210, 135)" className="glow-component">
                    <rect x="0" y="0" width="80" height="30" rx="4" fill="url(#resistorGrad)" stroke="#fbbf24" strokeWidth="2" />
                    <path d="M 5 15 L 15 5 L 25 25 L 35 5 L 45 25 L 55 5 L 65 25 L 75 15" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
                    <text x="40" y="-12" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">R۳ = {toPersianDigits(r3)}Ω</text>
                  </g>

                  {/* Voltmeter V across R3 */}
                  <g transform="translate(210, 70)" className="glow-meter">
                    <path d="M 0 65 L 0 10 L 80 10 L 80 65" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4" />
                    <circle cx="40" cy="10" r="22" fill="url(#meterGrad)" stroke="#3b82f6" strokeWidth="2" />
                    <text x="40" y="15" textAnchor="middle" fill="#3b82f6" fontSize="16" fontWeight="bold">V</text>
                    <text x="40" y="-20" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold" className="font-mono">{toPersianDigits(stats.v3.toFixed(2))}V</text>
                  </g>

                  {/* Branch 1: Rheostat R1 + Ammeter A1 */}
                  <g transform="translate(325, 200)" className="glow-component">
                    <rect x="0" y="0" width="50" height="80" rx="6" fill="url(#resistorGrad)" stroke="#fbbf24" strokeWidth="2" />
                    <path d="M 25 10 L 10 20 L 40 30 L 10 40 L 40 50 L 10 60 L 25 70" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
                    <line x1="5" y1="75" x2="45" y2="5" stroke="#fbbf24" strokeWidth="3" markerEnd="url(#arrowhead)" />
                    <text x="60" y="45" textAnchor="start" fill="#fbbf24" fontSize="14" fontWeight="bold">R۱ = {toPersianDigits(r1)}Ω</text>
                  </g>
                  <g transform="translate(328, 300)" className="glow-meter">
                    <circle cx="22" cy="22" r="20" fill="url(#meterGrad)" stroke="#22d3ee" strokeWidth="2" />
                    <text x="22" y="28" textAnchor="middle" fill="#22d3ee" fontSize="14" fontWeight="bold">A۱</text>
                    <text x="22" y="58" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold" className="font-mono">{toPersianDigits(stats.i1.toFixed(3))}A</text>
                  </g>

                  {/* Branch 2: Resistor R2 + Ammeter A2 */}
                  <g transform="translate(475, 200)" className="glow-component">
                    <rect x="0" y="0" width="50" height="80" rx="6" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                    <path d="M 25 10 L 10 20 L 40 30 L 10 40 L 40 50 L 10 60 L 25 70" fill="none" stroke="#94a3b8" strokeWidth="2" />
                    <text x="-10" y="45" textAnchor="end" fill="#94a3b8" fontSize="14" fontWeight="bold">R۲ = {toPersianDigits(r2)}Ω</text>
                  </g>
                  <g transform="translate(478, 300)" className="glow-meter">
                    <circle cx="22" cy="22" r="20" fill="url(#meterGrad)" stroke="#22d3ee" strokeWidth="2" />
                    <text x="22" y="28" textAnchor="middle" fill="#22d3ee" fontSize="14" fontWeight="bold">A۲</text>
                    <text x="22" y="58" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold" className="font-mono">{toPersianDigits(stats.i2.toFixed(3))}A</text>
                  </g>

                  {/* Electrons - Main Path */}
                  {[...Array(12)].map((_, i) => (
                    <motion.circle
                      key={`main-${i}`}
                      r="2.5"
                      fill="#22d3ee"
                      initial={{ offsetDistance: `${(i / 12) * 100}%` }}
                      animate={{ offsetDistance: ['0%', '100%'] }}
                      transition={{
                        duration: electronDuration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: -(i / 12) * electronDuration
                      }}
                      style={{ offsetPath: "path('M 100 250 L 100 150 L 350 150 L 350 400 L 100 400 L 100 350')" }}
                    />
                  ))}
                  
                  {/* Electrons - Branch 2 */}
                  {[...Array(6)].map((_, i) => (
                    <motion.circle
                      key={`branch2-${i}`}
                      r="2.5"
                      fill="#22d3ee"
                      initial={{ offsetDistance: `${(i / 6) * 100}%` }}
                      animate={{ offsetDistance: ['0%', '100%'] }}
                      transition={{
                        duration: electronDuration * (stats.iTotal / stats.i2),
                        repeat: Infinity,
                        ease: "linear",
                        delay: -(i / 6) * (electronDuration * (stats.iTotal / stats.i2))
                      }}
                      style={{ offsetPath: "path('M 350 150 L 500 150 L 500 400 L 350 400')" }}
                    />
                  ))}
                </svg>

                {/* Digital Ammeter (Total) */}
                <div className="absolute top-6 left-6 bg-black/80 border border-slate-700 rounded-lg p-2.5 font-mono backdrop-blur-xl shadow-2xl border-l-4 border-l-cyan-500">
                  <div className="text-slate-500 text-[9px] mb-0.5 uppercase tracking-widest text-right">آمپرمتر کل (I کل)</div>
                  <div className="text-cyan-400 text-lg font-bold tracking-widest flex items-baseline gap-1 justify-end">
                    {toPersianDigits(stats.iTotal.toFixed(3))}<span className="text-[10px] opacity-70">A</span>
                  </div>
                </div>

                {/* Scientific Analysis Overlay */}
                <div className="mt-8 w-full bg-slate-900/60 border border-slate-800/50 rounded-2xl p-5 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-white">تحلیل اثر رئوستا (R۱)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                    <div className="space-y-2 text-slate-300 text-right">
                      <p>• با <span className="text-amber-400 font-bold">افزایش R۱</span>، مقاومت معادل کل مدار افزایش یافته و <span className="text-cyan-400 font-bold">جریان کل (I کل)</span> کاهش می‌یابد.</p>
                      <p>• در نتیجه عدد <span className="text-blue-400 font-bold">ولت‌سنج (V)</span> که ولتاژ دو سر R۳ را نشان می‌دهد کاهش می‌یابد.</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-700/50">
                      <span className="text-[10px] text-slate-500 mb-1">رابطه ولتاژ خروجی باتری</span>
                      <span className="text-lg font-bold text-white font-mono tracking-widest">V = ε - rI</span>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            <footer className="w-full max-w-4xl mt-12">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-cyan-500/10 p-4 rounded-2xl">
                  <Info className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="text-white font-bold text-lg mb-1">تحلیل علمی و قانون اهم</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    طبق رابطه <span className="font-mono text-cyan-400">R = V / I</span>، وقتی مقاومت ثابت باشد، ولتاژ با جریان رابطه مستقیم دارد. اما در صورت متغیر بودن مقاومت (مانند رئوستا)، مقاومت با ولتاژ رابطه مستقیم و با جریان رابطه معکوس دارد. در این مدار، تغییر <span className="text-amber-400">R۱</span> باعث تغییر تقسیم جریان و ولتاژ در کل سیستم می‌شود.
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-800/80 px-8 py-4 rounded-2xl border border-slate-700 shadow-inner min-w-[160px]">
                  <span className="text-xs text-slate-500 font-bold mb-1">فرمول پایه</span>
                  <span className="text-2xl font-bold text-white font-mono tracking-widest">R = V / I</span>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, unit, color, icon }: { label: string; value: string; unit: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col items-start shadow-inner group hover:bg-slate-800/80 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className={color}>{icon}</span>}
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
      </div>
      <div className={`text-xl font-bold font-mono ${color}`}>
        {value}<span className="text-xs mr-2 opacity-60">{unit}</span>
      </div>
    </div>
  );
}
