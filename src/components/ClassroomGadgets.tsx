"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Flame,
  Award,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// =========================================================================
// 1. SYNTHESIZED CLASSROOM AUDIO ENGINE (Web Audio API - 100% Offline Ready)
// =========================================================================
class ClassroomAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. Authentic Desk Bell (Brass resonance with harmonic overtone)
  playDeskBell() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Primary fundamental tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(2093, now); // C7
    gain1.gain.setValueAtTime(0.45, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 1.8);

    // Harmonic overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(3136, now); // G7
    gain2.gain.setValueAtTime(0.25, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 1.2);
  }

  // 2. Correct chime (Melodic ascending arpeggio)
  playCorrect() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.3, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  // 3. Buzzer / Wrong (Game show double buzz)
  playWrong() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    osc1.frequency.setValueAtTime(130, now);
    osc2.frequency.setValueAtTime(138, now); // Dissonance
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  // 4. Applause cheer (Filtered noise bursts)
  playApplause() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 24; i++) {
      const clapTime = now + i * 0.045 + Math.random() * 0.02;
      const bufferSize = Math.floor(ctx.sampleRate * 0.035);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.25));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1300 + Math.random() * 400;
      const gain = ctx.createGain();
      gain.gain.value = 0.22 + Math.random() * 0.12;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(clapTime);
    }
  }

  // 5. Drumroll (Snare drum roll + Final hit)
  playDrumroll() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const totalHits = 26;
    for (let i = 0; i < totalHits; i++) {
      const hitTime = now + i * 0.038;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140 + Math.random() * 25, hitTime);
      gain.gain.setValueAtTime(0.08 + (i / totalHits) * 0.16, hitTime);
      gain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(hitTime);
      osc.stop(hitTime + 0.04);
    }
    // Final crash
    const crashTime = now + totalHits * 0.038 + 0.02;
    const oscCrash = ctx.createOscillator();
    const gainCrash = ctx.createGain();
    oscCrash.type = "square";
    oscCrash.frequency.setValueAtTime(520, crashTime);
    gainCrash.gain.setValueAtTime(0.3, crashTime);
    gainCrash.gain.exponentialRampToValueAtTime(0.001, crashTime + 0.8);
    oscCrash.connect(gainCrash);
    gainCrash.connect(ctx.destination);
    oscCrash.start(crashTime);
    oscCrash.stop(crashTime + 0.8);
  }

  // 6. Whistle (Referee whistle tweet)
  playWhistle() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.linearRampToValueAtTime(2800, now + 0.08);
    osc.frequency.linearRampToValueAtTime(2200, now + 0.25);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // 7. Dice Clatter (Wood dice rolling and settling)
  playDiceRoll() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const clickTime = now + i * 0.06 + Math.random() * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(280 + Math.random() * 220, clickTime);
      gain.gain.setValueAtTime(0.28, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(clickTime);
      osc.stop(clickTime + 0.035);
    }
  }

  // 8. Timer Alarm chime (Melodic school bell)
  playAlarm() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const beeps = [880, 1174.66, 1318.51, 1760];
    beeps.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.35, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.45);
    });
  }
}

const audioFX = new ClassroomAudioEngine();

// =========================================================================
// 2. DICE COMPONENT (Single Die Face with Realistic Pips)
// =========================================================================
function DieFace({ value, isRolling }: { value: number; isRolling: boolean }) {
  // Pips position matrix 3x3 for values 1-6
  const pips = useMemo(() => {
    switch (value) {
      case 1:
        return [false, false, false, false, true, false, false, false, false];
      case 2:
        return [true, false, false, false, false, false, false, false, true];
      case 3:
        return [true, false, false, false, true, false, false, false, true];
      case 4:
        return [true, false, true, false, false, false, true, false, true];
      case 5:
        return [true, false, true, false, true, false, true, false, true];
      case 6:
        return [true, false, true, true, false, true, true, false, true];
      default:
        return [false, false, false, false, true, false, false, false, false];
    }
  }, [value]);

  return (
    <motion.div
      animate={
        isRolling
          ? {
              rotate: [0, 90, 180, 270, 360],
              scale: [1, 1.15, 0.9, 1.1, 1],
              x: [0, -10, 12, -8, 0],
              y: [0, -15, 5, -10, 0],
            }
          : { rotate: 0, scale: 1, x: 0, y: 0 }
      }
      transition={{ duration: 0.65, ease: "easeInOut" }}
      className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white border-4 border-slate-200/90 shadow-xl flex items-center justify-center p-3 sm:p-4 select-none relative overflow-hidden ring-4 ring-slate-100"
    >
      {/* Glossy top-left highlight */}
      <div className="absolute top-1 left-1 right-1 h-1/3 bg-gradient-to-b from-white/90 to-transparent rounded-t-2xl pointer-events-none" />

      {/* 3x3 Pips Grid */}
      <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1.5 items-center justify-items-center">
        {pips.map((hasDot, i) => (
          <div key={i} className="w-full h-full flex items-center justify-center">
            {hasDot ? (
              <span
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shadow-inner ${
                  value === 1 ? "bg-rose-600 ring-2 ring-rose-200" : "bg-slate-800"
                }`}
              />
            ) : (
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-0" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// =========================================================================
// 3. MAIN CLASSROOM GADGETS COMPONENT
// =========================================================================
export default function ClassroomGadgets() {
  const [gadgetFilter, setGadgetFilter] = useState<"all" | "timer" | "bell" | "dice">("all");

  // =========================================================================
  // GADGET 1: TIMER & STOPWATCH
  // =========================================================================
  const [timerMode, setTimerMode] = useState<"countdown" | "stopwatch">("countdown");
  const [initialSeconds, setInitialSeconds] = useState<number>(300); // 5 min default
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [isTimerFullscreen, setIsTimerFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const timerContainerRef = useRef<HTMLDivElement | null>(null);

  // Countdown / Stopwatch ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerRunning) {
      interval = setInterval(() => {
        if (timerMode === "countdown") {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              setIsTimeUp(true);
              if (soundEnabled) {
                audioFX.playAlarm();
              }
              return 0;
            }
            return prev - 1;
          });
        } else {
          // Stopwatch
          setTimeLeft((prev) => prev + 1);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerMode, soundEnabled]);

  // Handle Preset Time Selection
  const handleSelectPreset = (minutes: number) => {
    setIsTimerRunning(false);
    setIsTimeUp(false);
    const secs = minutes * 60;
    setInitialSeconds(secs);
    setTimeLeft(secs);
  };

  // Adjust time (+/- seconds)
  const handleAdjustTime = (deltaSec: number) => {
    setTimeLeft((prev) => {
      const updated = Math.max(0, prev + deltaSec);
      if (deltaSec > 0 && updated > initialSeconds) {
        setInitialSeconds(updated);
      }
      return updated;
    });
    setIsTimeUp(false);
  };

  // Reset Timer
  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setIsTimeUp(false);
    setTimeLeft(timerMode === "countdown" ? initialSeconds : 0);
  };

  // Format Time (MM:SS)
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Fullscreen toggle for timer
  const toggleFullscreen = () => {
    if (!timerContainerRef.current) return;
    if (!document.fullscreenElement) {
      timerContainerRef.current
        .requestFullscreen()
        .then(() => setIsTimerFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsTimerFullscreen(false))
        .catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsTimerFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Timer Progress Percentage (for SVG ring)
  const progressPercent = useMemo(() => {
    if (timerMode === "stopwatch") return 100;
    if (initialSeconds === 0) return 0;
    return (timeLeft / initialSeconds) * 100;
  }, [timeLeft, initialSeconds, timerMode]);

  // Color based on remaining percentage
  const ringColor = useMemo(() => {
    if (timerMode === "stopwatch") return "stroke-sky-500";
    if (isTimeUp || timeLeft === 0) return "stroke-rose-600";
    if (progressPercent <= 15) return "stroke-rose-500";
    if (progressPercent <= 40) return "stroke-amber-500";
    return "stroke-[#16453d]";
  }, [progressPercent, isTimeUp, timeLeft, timerMode]);

  // =========================================================================
  // GADGET 2: CLASSROOM DESK BELL & SOUNDBOARD
  // =========================================================================
  const [isBellPressed, setIsBellPressed] = useState<boolean>(false);
  const [bellRingsCount, setBellRingsCount] = useState<number>(0);

  const handleRingBell = () => {
    setIsBellPressed(true);
    setBellRingsCount((c) => c + 1);
    audioFX.playDeskBell();
    setTimeout(() => setIsBellPressed(false), 200);
  };

  const soundboardItems = [
    {
      id: "correct",
      title: "ตอบถูก!",
      desc: "เสียงดนตรีเฉลยถูก",
      icon: CheckCircle2,
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-700",
      bgLight: "bg-emerald-50 border-emerald-200",
      action: () => audioFX.playCorrect(),
    },
    {
      id: "wrong",
      title: "ตอบผิด / บัซเซอร์",
      desc: "เสียงเตือนข้อผิด",
      icon: XCircle,
      color: "from-rose-500 to-red-600",
      textColor: "text-rose-700",
      bgLight: "bg-rose-50 border-rose-200",
      action: () => audioFX.playWrong(),
    },
    {
      id: "applause",
      title: "เสียงปรบมือ",
      desc: "แสดงความยินดี",
      icon: Award,
      color: "from-sky-500 to-blue-600",
      textColor: "text-sky-700",
      bgLight: "bg-sky-50 border-sky-200",
      action: () => audioFX.playApplause(),
    },
    {
      id: "drumroll",
      title: "กลองรัวลุ้นระทึก",
      desc: "สร้างความตื่นเต้น",
      icon: Flame,
      color: "from-amber-500 to-orange-600",
      textColor: "text-amber-700",
      bgLight: "bg-amber-50 border-amber-200",
      action: () => audioFX.playDrumroll(),
    },
    {
      id: "whistle",
      title: "เสียงนกหวีด",
      desc: "สัญญาณหมดเวลา/หยุด",
      icon: HelpCircle,
      color: "from-indigo-500 to-purple-600",
      textColor: "text-indigo-700",
      bgLight: "bg-indigo-50 border-indigo-200",
      action: () => audioFX.playWhistle(),
    },
    {
      id: "alarm",
      title: "กริ่งโรงเรียน",
      desc: "เสียงเตือนเปลี่ยนคาบ",
      icon: Bell,
      color: "from-violet-500 to-pink-600",
      textColor: "text-violet-700",
      bgLight: "bg-violet-50 border-violet-200",
      action: () => audioFX.playAlarm(),
    },
  ];

  // =========================================================================
  // GADGET 3: 2-DICE ROLLER
  // =========================================================================
  const [die1, setDie1] = useState<number>(3);
  const [die2, setDie2] = useState<number>(5);
  const [isDiceRolling, setIsDiceRolling] = useState<boolean>(false);
  const [diceHistory, setDiceHistory] = useState<
    Array<{ id: number; d1: number; d2: number; sum: number; isDouble: boolean }>
  >([]);

  const handleRollDice = () => {
    if (isDiceRolling) return;
    setIsDiceRolling(true);
    audioFX.playDiceRoll();

    // Roll animation delay
    setTimeout(() => {
      const newD1 = Math.floor(Math.random() * 6) + 1;
      const newD2 = Math.floor(Math.random() * 6) + 1;
      const sum = newD1 + newD2;
      const isDouble = newD1 === newD2;

      setDie1(newD1);
      setDie2(newD2);
      setIsDiceRolling(false);

      setDiceHistory((prev) => [
        { id: Date.now(), d1: newD1, d2: newD2, sum, isDouble },
        ...prev.slice(0, 4),
      ]);

      if (isDouble) {
        audioFX.playCorrect();
        toast.success(`🎲 ออกเบิ้ล! ลูกเต๋าคู่ ${newD1} กับ ${newD2} (รวม ${sum} แต้ม)`);
      }
    }, 650);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs / Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setGadgetFilter("all")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              gadgetFilter === "all"
                ? "bg-[#16453d] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>📱 แสดงแกดเจ็ตทั้งหมด (3 เมนู)</span>
          </button>

          <button
            type="button"
            onClick={() => setGadgetFilter("timer")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              gadgetFilter === "timer"
                ? "bg-[#16453d] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>นาฬิกาจับเวลา</span>
          </button>

          <button
            type="button"
            onClick={() => setGadgetFilter("bell")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              gadgetFilter === "bell"
                ? "bg-[#16453d] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>กระดิ่ง & ซาวด์บอร์ด</span>
          </button>

          <button
            type="button"
            onClick={() => setGadgetFilter("dice")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              gadgetFilter === "dice"
                ? "bg-[#16453d] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>🎲</span>
            <span>ลูกเต๋า 2 ลูก</span>
          </button>
        </div>

        <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
          💡 แสดงเครื่องมือเรียงกันบนหน้าเดียว ใช้งานได้พร้อมกัน
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 1. GADGET: TIMER & STOPWATCH                                              */}
      {/* ========================================================================= */}
      {(gadgetFilter === "all" || gadgetFilter === "timer") && (
        <div
          ref={timerContainerRef}
          className={`bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm transition-all ${
            isTimerFullscreen ? "fixed inset-0 z-50 rounded-none flex flex-col justify-center items-center p-12 bg-slate-900 text-white" : ""
          }`}
        >
          {/* Top Controls Bar */}
          <div className="w-full flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTimerMode("countdown");
                  setIsTimerRunning(false);
                  setTimeLeft(initialSeconds);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  timerMode === "countdown"
                    ? "bg-[#16453d] text-white"
                    : isTimerFullscreen
                    ? "text-slate-400 hover:bg-white/10"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                นับถอยหลัง (Timer)
              </button>

              <button
                type="button"
                onClick={() => {
                  setTimerMode("stopwatch");
                  setIsTimerRunning(false);
                  setTimeLeft(0);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  timerMode === "stopwatch"
                    ? "bg-[#16453d] text-white"
                    : isTimerFullscreen
                    ? "text-slate-400 hover:bg-white/10"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                จับเวลาเดินหน้า (Stopwatch)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  soundEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}
                title={soundEnabled ? "ปิดเสียงเตือน" : "เปิดเสียงเตือน"}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isTimerFullscreen
                    ? "bg-white/20 text-white border-white/20"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
                title={isTimerFullscreen ? "ย่อหน้าจอ" : "ขยายเต็มจอ (เปิดขึ้นโปรเจกเตอร์)"}
              >
                {isTimerFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Big Circular Clock Display */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative flex items-center justify-center w-72 h-72 sm:w-84 sm:h-84">
              {/* SVG Circular Progress Bar */}
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className={isTimerFullscreen ? "stroke-slate-800" : "stroke-slate-100"}
                  strokeWidth="6"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className={`transition-all duration-500 ease-out ${ringColor}`}
                  strokeWidth="6"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Central Time Text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span
                  className={`font-black tracking-tight font-mono select-none ${
                    isTimerFullscreen
                      ? "text-6xl sm:text-7xl lg:text-8xl text-white"
                      : "text-5xl sm:text-6xl text-slate-900"
                  }`}
                >
                  {formatTime(timeLeft)}
                </span>
                <span
                  className={`text-xs sm:text-sm font-bold uppercase tracking-wider mt-1 ${
                    isTimeUp
                      ? "text-rose-500 animate-bounce"
                      : isTimerFullscreen
                      ? "text-slate-400"
                      : "text-slate-400"
                  }`}
                >
                  {isTimeUp
                    ? "⏰ หมดเวลาแล้ว!"
                    : isTimerRunning
                    ? "กำลังนับเวลา..."
                    : "หยุดชั่วคราว"}
                </span>
              </div>
            </div>

            {/* Quick Adjustment Badges */}
            {timerMode === "countdown" && (
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleAdjustTime(-30)}
                  disabled={timeLeft <= 30}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  -30 วิ
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTime(60)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                >
                  +1 นาที
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustTime(300)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                >
                  +5 นาที
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons: Play/Pause/Reset */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={handleResetTimer}
              className={`flex items-center gap-1.5 px-5 py-3 rounded-2xl border text-sm font-bold transition-all active:scale-95 cursor-pointer ${
                isTimerFullscreen
                  ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>รีเซ็ต</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-black text-base shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer ${
                isTimerRunning
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-[#16453d] hover:bg-[#113831]"
              }`}
            >
              {isTimerRunning ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
              <span>{isTimerRunning ? "พักเวลา" : "เริ่มจับเวลา"}</span>
            </button>
          </div>

          {/* Presets Grid (Countdown Mode) */}
          {timerMode === "countdown" && !isTimerFullscreen && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 block mb-3">
                ตั้งเวลาด่วน (นาที):
              </span>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 5, 10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectPreset(mins)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      initialSeconds === mins * 60
                        ? "bg-[#16453d] text-white border-[#16453d]"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {mins} นาที
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GADGET: CLASSROOM BELL & SOUNDBOARD                                   */}
      {/* ========================================================================= */}
      {(gadgetFilter === "all" || gadgetFilter === "bell") && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Left: Giant 3D Interactive Bell */}
            <div className="flex flex-col items-center text-center w-full lg:w-1/2 py-4">
              <div className="relative mb-6">
                {/* Sound waves animation on ring */}
                <AnimatePresence>
                  {isBellPressed && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.9 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7 }}
                      className="absolute inset-0 rounded-full border-4 border-amber-400 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Desk Bell Button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={handleRingBell}
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-2xl flex flex-col items-center justify-center relative cursor-pointer ring-8 ring-amber-100 hover:ring-amber-200 transition-all select-none"
                >
                  {/* Top Plunger / Knob */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-b from-slate-100 to-slate-400 shadow-md border-2 border-slate-300 absolute -top-3 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-slate-500/50 shadow-inner" />
                  </div>

                  {/* Bell Highlights & Icon */}
                  <div className="text-white drop-shadow-md flex flex-col items-center">
                    <span className="text-5xl sm:text-6xl filter drop-shadow">🛎️</span>
                    <span className="text-sm sm:text-base font-black tracking-wide mt-2">
                      กดสั่นกระดิ่ง!
                    </span>
                  </div>
                </motion.button>
              </div>

              <h4 className="text-base font-black text-slate-800">กระดิ่งครูตั้งโต๊ะ (Desk Bell)</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                กดเพื่อส่งสัญญาณเรียกสมาธิให้นักเรียนทั้งห้องหยุดคุยและหันมามองหน้าห้อง
              </p>
              {bellRingsCount > 0 && (
                <span className="mt-2 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  สั่นไปแล้ว: {bellRingsCount} ครั้ง
                </span>
              )}
            </div>

            {/* Right: Soundboard Grid */}
            <div className="w-full lg:w-1/2 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>ซาวด์บอร์ดกิจกรรมห้องเรียน</span>
                </span>
                <span className="text-[11px] text-slate-400">กดเพื่อเล่นเสียงทันที</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {soundboardItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={item.action}
                      className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all hover:shadow-md cursor-pointer ${item.bgLight}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shrink-0 shadow-sm`}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-black truncate ${item.textColor}`}>
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GADGET: 2-DICE ROLLER                                                  */}
      {/* ========================================================================= */}
      {(gadgetFilter === "all" || gadgetFilter === "dice") && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center text-center">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="text-2xl">🎲</span>
              <span>ทอยลูกเต๋า 2 ลูกแบบสุ่ม</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              ใช้สำหรับเล่นเกมตอบคำถาม สุ่มแต้มคะแนน หรือสุ่มเดินกระดานกิจกรรม
            </p>

            {/* Two Dice Display Box */}
            <div
              onClick={handleRollDice}
              className="mt-8 flex items-center justify-center gap-6 sm:gap-10 p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100/80 border-2 border-slate-200/80 shadow-inner cursor-pointer select-none"
              title="คลิกที่ลูกเต๋าเพื่อทอย!"
            >
              <DieFace value={die1} isRolling={isDiceRolling} />
              <div className="text-2xl sm:text-3xl font-black text-slate-400">+</div>
              <DieFace value={die2} isRolling={isDiceRolling} />
            </div>

            {/* Total Result Score */}
            <div className="mt-6 flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  แต้มรวม: <span className="text-[#16453d] font-mono">{die1 + die2}</span>
                </span>
                {die1 === die2 && (
                  <span className="text-xs font-black bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-200 animate-pulse">
                    🎉 ออกเบิ้ล! ({die1} คู่)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                (ลูกแรก {die1} แต้ม + ลูกสอง {die2} แต้ม)
              </span>
            </div>

            {/* Roll Dice Button */}
            <div className="mt-6 w-full max-w-sm">
              <button
                type="button"
                onClick={handleRollDice}
                disabled={isDiceRolling}
                className="w-full flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#16453d] to-[#0f352e] hover:from-[#1b554b] hover:to-[#134239] text-white text-base font-black shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isDiceRolling ? "animate-spin" : ""}`} />
                <span>{isDiceRolling ? "กำลังทอยลูกเต๋า..." : "ทอยลูกเต๋าเลย! 🎲"}</span>
              </button>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                💡 หรือคลิกที่ตัวลูกเต๋าเพื่อสุ่มทอยใหม่ได้ตลอดเวลา
              </p>
            </div>

            {/* Roll History */}
            {diceHistory.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100 w-full max-w-md">
                <span className="text-xs font-bold text-slate-500 block mb-2 text-left">
                  ประวัติการทอยล่าสุด:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {diceHistory.map((h, idx) => (
                    <div
                      key={h.id}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                        idx === 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      <span>🎲 {h.d1}+{h.d2}</span>
                      <span className="font-mono text-slate-400">=</span>
                      <span className="font-mono font-black">{h.sum}</span>
                      {h.isDouble && <span className="text-rose-500 text-[10px]">เบิ้ล</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
