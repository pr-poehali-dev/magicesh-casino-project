import { useState, useEffect, useRef, useCallback } from "react";

interface AviaTrixProps {
  balance: number;
  onBalanceChange: (v: number) => void;
  onWin: (amount: number) => void;
}

type GamePhase = "waiting" | "flying" | "crashed" | "cashedout";

const HISTORY = [1.24, 3.56, 1.02, 8.91, 2.34, 1.55, 14.20, 1.01, 4.78, 2.11, 6.32, 1.08, 19.45, 1.33, 2.89];

export default function AviaTrix({ balance, onBalanceChange, onWin }: AviaTrixProps) {
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [multiplier, setMultiplier] = useState(1.00);
  const [bet, setBet] = useState(10);
  const [betPlaced, setBetPlaced] = useState(false);
  const [crashAt, setCrashAt] = useState(1.0);
  const [autoCashout, setAutoCashout] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [planeX, setPlaneX] = useState(5);
  const [planeY, setPlaneY] = useState(75);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [history, setHistory] = useState(HISTORY);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const BET_OPTIONS = [5, 10, 25, 50, 100, 250];

  const generateCrashPoint = () => {
    const r = Math.random();
    if (r < 0.45) return 1.0 + Math.random() * 0.5;
    if (r < 0.7) return 1.5 + Math.random() * 2.0;
    if (r < 0.85) return 3.5 + Math.random() * 5.0;
    if (r < 0.95) return 8.5 + Math.random() * 15.0;
    return 20.0 + Math.random() * 80.0;
  };

  const startRound = useCallback(() => {
    const crash = generateCrashPoint();
    setCrashAt(crash);
    setMultiplier(1.00);
    setPlaneX(5);
    setPlaneY(75);
    setTrail([]);
    setCashedOutAt(null);
    setPhase("flying");

    let current = 1.00;
    let tick = 0;

    intervalRef.current = setInterval(() => {
      tick++;
      const growth = 0.01 + (current - 1) * 0.002;
      current = parseFloat((current + growth).toFixed(2));
      setMultiplier(current);

      const progress = Math.min((current - 1) / (crash - 1), 1);
      const x = 5 + progress * 80;
      const y = 75 - progress * 65;
      setPlaneX(x);
      setPlaneY(y);
      setTrail(prev => [...prev.slice(-40), { x, y }]);

      if (current >= crash) {
        clearInterval(intervalRef.current!);
        setPhase("crashed");
        setBetPlaced(false);
        setHistory(prev => [parseFloat(crash.toFixed(2)), ...prev.slice(0, 14)]);

        setTimeout(() => {
          setPhase("waiting");
          setCountdown(5);
          let cd = 5;
          countdownRef.current = setInterval(() => {
            cd--;
            setCountdown(cd);
            if (cd <= 0) {
              clearInterval(countdownRef.current!);
              startRound();
            }
          }, 1000);
        }, 2000);
      }
    }, 100);
  }, []);

  useEffect(() => {
    setCountdown(5);
    let cd = 5;
    countdownRef.current = setInterval(() => {
      cd--;
      setCountdown(cd);
      if (cd <= 0) {
        clearInterval(countdownRef.current!);
        startRound();
      }
    }, 1000);

    return () => {
      clearInterval(intervalRef.current!);
      clearInterval(countdownRef.current!);
    };
  }, []);

  const placeBet = () => {
    if (balance < bet || phase !== "waiting") return;
    onBalanceChange(balance - bet);
    setBetPlaced(true);
  };

  const cashout = useCallback(() => {
    if (phase !== "flying" || !betPlaced) return;
    const win = Math.floor(bet * multiplier);
    onBalanceChange(balance + win);
    onWin(win);
    setCashedOutAt(multiplier);
    setPhase("cashedout");
    setBetPlaced(false);
    clearInterval(intervalRef.current!);

    setTimeout(() => {
      // Continue "flying" animation til crash
      const crash = crashAt;
      let current = multiplier;
      intervalRef.current = setInterval(() => {
        const growth = 0.01 + (current - 1) * 0.002;
        current = parseFloat((current + growth).toFixed(2));
        setMultiplier(current);

        const progress = Math.min((current - 1) / (crash - 1), 1);
        const x = 5 + progress * 80;
        const y = 75 - progress * 65;
        setPlaneX(x);
        setPlaneY(y);
        setTrail(prev => [...prev.slice(-40), { x, y }]);

        if (current >= crash) {
          clearInterval(intervalRef.current!);
          setPhase("crashed");
          setHistory(prev => [parseFloat(crash.toFixed(2)), ...prev.slice(0, 14)]);
          setTimeout(() => {
            setPhase("waiting");
            setCountdown(5);
            let cd = 5;
            countdownRef.current = setInterval(() => {
              cd--;
              setCountdown(cd);
              if (cd <= 0) {
                clearInterval(countdownRef.current!);
                startRound();
              }
            }, 1000);
          }, 2000);
        }
      }, 100);
    }, 100);
  }, [phase, betPlaced, bet, multiplier, balance, crashAt, onBalanceChange, onWin, startRound]);

  const getMultColor = () => {
    if (multiplier < 1.5) return "#22c55e";
    if (multiplier < 3) return "#eab308";
    if (multiplier < 10) return "var(--gold)";
    return "#a855f7";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <h2 className="font-oswald text-2xl font-bold tracking-widest" style={{ color: "var(--neon-cyan)" }}>
          АВИАТРИКС
        </h2>
        <p className="text-xs text-muted-foreground mt-1">УСПЕЙ ЗАБРАТЬ ДО КРЭША</p>
      </div>

      {/* History */}
      <div className="flex gap-1 overflow-hidden">
        {history.slice(0, 10).map((h, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded text-xs font-bold font-oswald flex-shrink-0"
            style={{
              background: h < 2 ? "#7f1d1d55" : h < 5 ? "#713f1255" : "#1e1b4b55",
              color: h < 2 ? "#fca5a5" : h < 5 ? "#fcd34d" : "#a78bfa",
              border: `1px solid ${h < 2 ? "#7f1d1d" : h < 5 ? "#92400e" : "#4c1d95"}`,
            }}
          >
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Game canvas */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0a0d14 0%, #0d1220 50%, #111827 100%)",
          border: "2px solid var(--neon-cyan)33",
          height: 220,
        }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          {[25, 50, 75].map(y => (
            <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />
          ))}
          {[25, 50, 75].map(x => (
            <line key={x} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />
          ))}
        </svg>

        {/* Trail */}
        {trail.length > 1 && (
          <svg className="absolute inset-0 w-full h-full">
            <polyline
              points={trail.map(p => `${p.x}%,${p.y}%`).join(" ")}
              fill="none"
              stroke={phase === "crashed" ? "#ef4444" : "var(--neon-cyan)"}
              strokeWidth="2"
              strokeOpacity="0.6"
            />
          </svg>
        )}

        {/* Multiplier */}
        <div className="absolute inset-0 flex items-center justify-center">
          {phase === "waiting" && (
            <div className="text-center">
              <div className="font-oswald text-4xl font-bold text-gray-500">ОЖИДАНИЕ</div>
              <div className="font-oswald text-2xl text-gray-400 mt-1">{countdown}с</div>
            </div>
          )}
          {(phase === "flying" || phase === "cashedout") && (
            <div className="text-center" style={{ textShadow: `0 0 30px ${getMultColor()}` }}>
              <div className="font-oswald text-5xl font-bold" style={{ color: getMultColor() }}>
                {multiplier.toFixed(2)}x
              </div>
              {phase === "cashedout" && cashedOutAt && (
                <div className="font-oswald text-lg text-emerald-400 mt-1">
                  Вы вышли на {cashedOutAt.toFixed(2)}x ✓
                </div>
              )}
            </div>
          )}
          {phase === "crashed" && (
            <div className="text-center">
              <div className="font-oswald text-3xl font-bold text-red-500">💥 КРЭШ!</div>
              <div className="font-oswald text-4xl font-bold text-red-400 mt-1">{multiplier.toFixed(2)}x</div>
            </div>
          )}
        </div>

        {/* Plane */}
        {(phase === "flying" || phase === "cashedout") && (
          <div
            className="absolute text-2xl transition-none"
            style={{
              left: `${planeX}%`,
              top: `${planeY}%`,
              transform: "translate(-50%, -50%) rotate(-25deg)",
              filter: `drop-shadow(0 0 8px ${phase === "cashedout" ? "#22c55e" : "var(--neon-cyan)"})`,
            }}
          >
            ✈️
          </div>
        )}

        {phase === "crashed" && (
          <div className="absolute text-3xl" style={{ left: `${planeX}%`, top: `${planeY}%`, transform: "translate(-50%, -50%)" }}>
            💥
          </div>
        )}
      </div>

      {/* Bet + cashout */}
      <div className="flex gap-2">
        <div className="flex-1 flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">СТАВКА</div>
          <div className="flex gap-1 flex-wrap">
            {BET_OPTIONS.map(b => (
              <button
                key={b}
                onClick={() => setBet(b)}
                disabled={betPlaced || phase === "flying"}
                className="flex-1 py-1.5 rounded-md text-xs font-bold font-oswald transition-all disabled:opacity-40"
                style={{
                  background: bet === b ? "var(--neon-cyan)" : "var(--casino-card2)",
                  color: bet === b ? "#0a0d14" : "#888",
                  border: `1px solid ${bet === b ? "var(--neon-cyan)" : "#333"}`,
                  minWidth: 36,
                }}
              >
                {b}₽
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {phase === "waiting" && !betPlaced && (
        <button
          onClick={placeBet}
          disabled={balance < bet}
          className="w-full py-4 rounded-xl text-lg font-bold font-oswald tracking-widest uppercase transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#fff" }}
        >
          ✈️ СДЕЛАТЬ СТАВКУ {bet}₽
        </button>
      )}

      {phase === "waiting" && betPlaced && (
        <div className="w-full py-4 rounded-xl text-lg font-bold font-oswald tracking-widest uppercase text-center"
          style={{ background: "#14532d44", border: "1px solid #22c55e44", color: "#22c55e" }}>
          ✅ СТАВКА {bet}₽ ПРИНЯТА
        </div>
      )}

      {phase === "flying" && betPlaced && (
        <button
          onClick={cashout}
          className="w-full py-4 rounded-xl text-xl font-bold font-oswald tracking-widest uppercase animate-glow-gold"
          style={{ background: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: "#1a1200" }}
        >
          💰 ЗАБРАТЬ {Math.floor(bet * multiplier)}₽
        </button>
      )}

      {phase === "flying" && !betPlaced && (
        <div className="w-full py-4 rounded-xl text-lg font-oswald text-center text-muted-foreground"
          style={{ border: "1px solid #333" }}>
          Ставки принимаются в паузе
        </div>
      )}

      {(phase === "crashed" || phase === "cashedout") && (
        <div className="w-full py-3 rounded-xl text-sm font-oswald text-center text-muted-foreground"
          style={{ border: "1px solid #333" }}>
          Следующий раунд через {countdown > 0 ? countdown + "с" : "..."}
        </div>
      )}
    </div>
  );
}
