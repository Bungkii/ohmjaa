"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  RotateCw,
  Sparkles,
  Volume2,
  VolumeX,
  UserCheck,
  UserX,
  Users,
  Trophy,
  X,
  RefreshCw,
  Plus,
  Play,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from "@headlessui/react";
import { Student } from "@/types/penalty";
import { formatStudentFullName, getStudentAvatar } from "./DisciplinaryApp";

const SLICE_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#e11d48", // rose
  "#84cc16", // lime
  "#0ea5e9", // sky
  "#d946ef", // fuchsia
  "#eab308", // yellow
  "#22c55e", // green
  "#a855f7", // purple
];

interface SpinWheelProps {
  students: Student[];
}

export default function SpinWheel({ students }: SpinWheelProps) {
  // Pool of students on the wheel
  const [activePool, setActivePool] = useState<Student[]>([]);
  const [removedStudents, setRemovedStudents] = useState<Student[]>([]);
  const [poolSearch, setPoolSearch] = useState<string>("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Student | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filter pool by search term
  const filteredPool = useMemo(() => {
    if (!poolSearch.trim()) return activePool;
    const q = poolSearch.trim().toLowerCase();
    return activePool.filter(
      (s) =>
        s.student_no.toString().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q))
    );
  }, [activePool, poolSearch]);

  // Wheel canvas ref & angle state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationAngleRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTickIndexRef = useRef<number>(-1);

  // Initialize pool from students
  useEffect(() => {
    setActivePool(students);
    setRemovedStudents([]);
  }, [students]);

  // Web Audio Context for sound effects
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Play tick sound
  const playTickSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }, [soundEnabled, getAudioContext]);

  // Play fanfare / win sound
  const playWinSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.35);
      });
    } catch {}
  }, [soundEnabled, getAudioContext]);

  // Draw the spinning wheel
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use CSS clientWidth (logical pixels)
    const displaySize = canvas.clientWidth || 480;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    // Ensure backing store matches DPR
    const targetWidth = Math.round(displaySize * dpr);
    const targetHeight = Math.round(displaySize * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.save();
    // Scale context to DPR so all operations use logical coordinates (0 to displaySize)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const size = displaySize;
    const center = size / 2;
    const radius = center - 14;
    const pool = activePool;
    const total = pool.length;

    ctx.clearRect(0, 0, size, size);

    if (total === 0) {
      // Empty wheel state
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#f1f5f9";
      ctx.fill();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px 'LINE Seed Sans TH', 'IBM Plex Sans Thai', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ไม่มีนักเรียนในวงล้อ", center, center);
      ctx.restore();
      return;
    }

    const arc = (2 * Math.PI) / total;
    const currentAngle = rotationAngleRef.current;

    // Outer shadow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a15";
    ctx.fill();
    ctx.restore();

    // Draw slices
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(currentAngle);

    for (let i = 0; i < total; i++) {
      const angle = i * arc;
      const student = pool[i];
      const color = SLICE_COLORS[i % SLICE_COLORS.length];

      // Draw slice wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + arc);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Border between slices
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Outer rim peg
      const pegAngle = angle + arc;
      const pegX = (radius - 4) * Math.cos(pegAngle);
      const pegY = (radius - 4) * Math.sin(pegAngle);
      ctx.beginPath();
      ctx.arc(pegX, pegY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Text inside slice
      ctx.save();
      const sliceMidAngle = angle + arc / 2;
      ctx.rotate(sliceMidAngle);
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 3;

      // Font size scales with number of items and wheel size
      const baseFontSize = total > 45 ? 10.5 : total > 30 ? 11.5 : total > 15 ? 12.5 : 14;
      const scaleFactor = displaySize / 480;
      const fontSize = Math.max(9, Math.round(baseFontSize * Math.min(1.15, Math.max(0.85, scaleFactor))));
      ctx.font = `bold ${fontSize}px 'LINE Seed Sans TH', 'IBM Plex Sans Thai', sans-serif`;

      const displayText = `#${student.student_no} ${student.nickname || student.first_name}`;

      // Calculate actual angle on the screen (including current rotation)
      const netAngle = (currentAngle + sliceMidAngle) % (2 * Math.PI);
      const screenAngle = (netAngle + 2 * Math.PI) % (2 * Math.PI);

      // Auto-flip text on left half of wheel so it is always right-side up
      const shouldFlip = screenAngle > Math.PI / 2 && screenAngle < (3 * Math.PI) / 2;
      if (shouldFlip) {
        ctx.rotate(Math.PI);
        ctx.textAlign = "left";
        ctx.fillText(displayText, -(radius - 14), 0);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(displayText, radius - 14, 0);
      }
      ctx.restore();
    }

    ctx.restore();

    // Outer rim border
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Center Hub (Pin)
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, 38, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center, center, 30, 0, 2 * Math.PI);
    ctx.fillStyle = "#16453d";
    ctx.fill();

    // Center text / icon
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px 'LINE Seed Sans TH', 'IBM Plex Sans Thai', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("หมุน!", center, center);
    ctx.restore();

    // Pointer at Top (pointing down into the wheel at 12 o'clock)
    ctx.save();
    ctx.translate(center, 12);
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 26);
    ctx.closePath();
    ctx.fillStyle = "#dc2626"; // bright red pointer
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, [activePool]);

  // Resize observer to keep canvas sharp and properly fitted
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      drawWheel();
    };

    handleResize();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => handleResize())
      : null;

    if (resizeObserver) {
      resizeObserver.observe(canvas);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [drawWheel]);

  // Redraw when pool or rotation changes
  useEffect(() => {
    drawWheel();
  }, [activePool, drawWheel]);

  // Spin the wheel
  const handleSpin = () => {
    if (isSpinning || activePool.length === 0) return;

    setIsSpinning(true);
    setWinner(null);
    setShowWinnerModal(false);

    // Pick random target slice
    const total = activePool.length;
    const arc = (2 * Math.PI) / total;
    const winningIndex = Math.floor(Math.random() * total);

    // Calculate rotation:
    // Pointer is at Top (angle = -Math.PI / 2 or 3 * Math.PI / 2)
    // We want the center of slice `winningIndex` to align with the pointer:
    // sliceCenterAngle = winningIndex * arc + arc / 2
    // pointerAngle = 3 * Math.PI / 2
    // finalRotation % (2 * Math.PI) = pointerAngle - sliceCenterAngle
    const pointerAngle = (3 * Math.PI) / 2;
    const sliceCenterAngle = winningIndex * arc + (Math.random() * 0.6 + 0.2) * arc; // slightly off-center for realism
    let targetOffset = (pointerAngle - sliceCenterAngle) % (2 * Math.PI);
    if (targetOffset < 0) targetOffset += 2 * Math.PI;

    // Add 6 to 9 full rotations for anticipation
    const fullRounds = Math.floor(Math.random() * 3) + 6;
    const startAngle = rotationAngleRef.current;
    const targetAngle = startAngle + fullRounds * 2 * Math.PI + targetOffset;
    const distance = targetAngle - startAngle;

    const duration = 4800; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Cubic ease-out: 1 - Math.pow(1 - progress, 3)
      const easeProgress = 1 - Math.pow(1 - progress, 3.2);
      const currentAngle = startAngle + distance * easeProgress;
      rotationAngleRef.current = currentAngle;

      // Check tick sound on passing slice
      const normalized = (pointerAngle - currentAngle) % (2 * Math.PI);
      const positiveNorm = normalized < 0 ? normalized + 2 * Math.PI : normalized;
      const currentSliceIdx = Math.floor(positiveNorm / arc);
      if (currentSliceIdx !== lastTickIndexRef.current) {
        lastTickIndexRef.current = currentSliceIdx;
        playTickSound();
      }

      drawWheel();

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished!
        setIsSpinning(false);
        const selectedWinner = activePool[winningIndex];
        setWinner(selectedWinner);
        setShowWinnerModal(true);
        playWinSound();
        toast.success(`🎉 ผู้โชคดีคือ #${selectedWinner.student_no} ${selectedWinner.first_name}!`);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Remove winner from pool for future spins
  const handleRemoveWinner = () => {
    if (!winner) return;
    setActivePool((prev) => prev.filter((s) => s.student_id !== winner.student_id));
    setRemovedStudents((prev) => [...prev, winner]);
    setShowWinnerModal(false);
    toast.success(`ตัดชื่อ #${winner.student_no} ${winner.first_name} ออกจากวงล้อรอบต่อไปแล้ว`);
  };

  // Restore all removed students
  const handleRestoreAll = () => {
    setActivePool(students);
    setRemovedStudents([]);
    setShowWinnerModal(false);
    toast.success("คืนชื่อนักเรียนทุกคนกลับเข้าวงล้อแล้ว (ครบ 53 คน)");
  };

  // Add back a single student
  const handleRestoreStudent = (student: Student) => {
    setRemovedStudents((prev) => prev.filter((s) => s.student_id !== student.student_id));
    setActivePool((prev) => [...prev, student].sort((a, b) => a.student_no - b.student_no));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="text-2xl">🎡</span>
              <span>วงล้อสุ่มนักเรียน ม.2/3</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              หมุนวงล้อสุ่มเลือกนักเรียนตอบคำถาม ทำกิจกรรม หรือสุ่มจับรางวัล
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              }`}
              title={soundEnabled ? "ปิดเสียง" : "เปิดเสียง"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Restore Button */}
            {removedStudents.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>คืนชื่อครบ ({students.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Wheel Display & Sidebar Layout */}
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Wheel Canvas (Left 7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div
              className="relative cursor-pointer select-none w-full max-w-[500px] aspect-square flex items-center justify-center"
              onClick={handleSpin}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full drop-shadow-xl rounded-full transition-transform active:scale-98"
              />
            </div>

            {/* Big Spin Action Button */}
            <div className="mt-5 flex flex-col items-center gap-2 w-full max-w-md">
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || activePool.length === 0}
                className="w-full flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#16453d] to-[#0f352e] hover:from-[#1b554b] hover:to-[#134239] text-white text-base font-black shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-5 h-5 fill-white ${isSpinning ? "animate-spin" : ""}`} />
                <span>{isSpinning ? "กำลังหมุนวงล้อ..." : "กดหมุนวงล้อเลย! 🎯"}</span>
              </button>
              <p className="text-[11px] text-slate-400 font-medium text-center">
                💡 หรือคลิกที่ตัววงล้อเพื่อเริ่มหมุนสุ่มได้ทันที
              </p>
            </div>
          </div>

          {/* Wheel Pool & Status (Right 5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Users size={14} className="text-[#16453d]" />
                <span>ในวงล้อ: {activePool.length} คน</span>
              </span>
              {removedStudents.length > 0 && (
                <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  สุ่มไปแล้ว: {removedStudents.length} คน
                </span>
              )}
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={poolSearch}
                onChange={(e) => setPoolSearch(e.target.value)}
                placeholder="ค้นหาชื่อ หรือเลขที่ในวงล้อ..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#16453d]"
              />
            </div>

            {/* Pool List */}
            <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto divide-y divide-slate-100 pr-1 text-xs">
              {filteredPool.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {poolSearch ? "ไม่พบนักเรียนตามคำค้นหา" : "ไม่มีนักเรียนในวงล้อ"}
                </div>
              ) : (
                filteredPool.map((s) => (
                  <div key={s.student_id} className="py-1.5 px-1.5 flex items-center justify-between hover:bg-white/80 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-slate-400 w-5">#{s.student_no}</span>
                      <span className="font-medium text-slate-800 truncate">{formatStudentFullName(s)}</span>
                      {s.nickname && <span className="text-slate-400 text-[11px]">({s.nickname})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePool((prev) => prev.filter((p) => p.student_id !== s.student_id));
                        setRemovedStudents((prev) => [...prev, s]);
                      }}
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                      title="นำชื่อออกจากวงล้อ"
                    >
                      <UserX size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Removed Students Tray */}
            {removedStudents.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  นักเรียนที่ถูกสุ่มไปแล้ว:
                </span>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                  {removedStudents.map((s) => (
                    <button
                      key={s.student_id}
                      onClick={() => handleRestoreStudent(s)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer"
                      title="กดเพื่อนำกลับเข้าวงล้อ"
                    >
                      <span>#{s.student_no} {s.nickname || s.first_name}</span>
                      <Plus size={10} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Winner Celebration Modal */}
      <Dialog
        open={showWinnerModal && winner !== null}
        onClose={() => setShowWinnerModal(false)}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl border border-slate-100 transition-all duration-300 data-[closed]:scale-95 data-[closed]:opacity-0 relative overflow-hidden"
          >
            {/* Top Confetti Accent */}
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400" />

            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-100 to-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-inner ring-4 ring-amber-50">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>

            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full mb-2">
              🎉 ผู้โชคดีจากการหมุนวงล้อ!
            </span>

            {winner && (
              <div className="my-3 p-4 rounded-2xl bg-gradient-to-b from-amber-50/70 to-slate-50 border border-amber-200">
                <span className="font-mono text-xs font-bold text-amber-700">
                  เลขที่ #{winner.student_no}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {formatStudentFullName(winner)}
                </h3>
                {winner.nickname && (
                  <p className="text-base font-bold text-[#16453d] mt-0.5">
                    น้อง{winner.nickname}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRemoveWinner}
                className="w-full py-2.5 px-4 rounded-xl bg-[#16453d] hover:bg-[#0f352e] text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                ✂️ ตัดชื่อออกจากการสุ่มรอบถัดไป
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWinnerModal(false);
                  setTimeout(() => handleSpin(), 250);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                🎡 หมุนต่อทันที (เก็บชื่อไว้)
              </button>
              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className="w-full py-2 px-4 rounded-xl text-slate-500 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
