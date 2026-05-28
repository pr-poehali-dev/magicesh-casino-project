import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

interface SlotMachineProps {
  type: "crowns" | "stars";
  balance: number;
  onBalanceChange: (newBalance: number) => void;
  onWin: (amount: number) => void;
}

const CROWNS_SYMBOLS = ["👑", "💎", "🔮", "🌹", "⚡", "🦁", "👑", "💎"];
const STARS_SYMBOLS = ["⭐", "🌟", "✨", "💫", "🌙", "⭐", "🌟", "✨"];

const BET_OPTIONS = [5, 10, 25, 50, 100, 250];

export default function SlotMachine({ type, balance, onBalanceChange, onWin }: SlotMachineProps) {
  const lines = type === "crowns" ? 20 : 5;
  const symbols = type === "crowns" ? CROWNS_SYMBOLS : STARS_SYMBOLS;
  const reelsCount = type === "crowns" ? 5 : 3;
  const rowsCount = 3;

  const [reels, setReels] = useState<string[][]>(
    Array(reelsCount).fill(null).map(() =>
      Array(rowsCount).fill(null).map(() => symbols[Math.floor(Math.random() * symbols.length)])
    )
  );
  const [spinning, setSpinning] = useState(false);
  const [bet, setBet] = useState(5);
  const [lastWin, setLastWin] = useState(0);
  const [spinningReels, setSpinningReels] = useState<boolean[]>(Array(reelsCount).fill(false));
  const [totalBet] = useState(() => bet * lines);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const spin = useCallback(() => {
    if (spinning || balance < bet) return;
    const totalCost = bet;
    onBalanceChange(balance - totalCost);
    setLastWin(0);
    setSpinning(true);
    setSpinningReels(Array(reelsCount).fill(true));

    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];

    const newReels = Array(reelsCount).fill(null).map(() =>
      Array(rowsCount).fill(null).map(() => symbols[Math.floor(Math.random() * symbols.length)])
    );

    for (let i = 0; i < reelsCount; i++) {
      const t = setTimeout(() => {
        setReels(prev => {
          const updated = [...prev];
          updated[i] = newReels[i];
          return updated;
        });
        setSpinningReels(prev => {
          const updated = [...prev];
          updated[i] = false;
          return updated;
        });

        if (i === reelsCount - 1) {
          setTimeout(() => {
            setSpinning(false);
            // Check wins
            let winAmount = 0;
            const centerRow = newReels.map(r => r[1]);
            const allSame = centerRow.every(s => s === centerRow[0]);
            const twoSame = centerRow[0] === centerRow[1] || centerRow[1] === centerRow[2];

            if (allSame) {
              winAmount = bet * (type === "crowns" ? 50 : 30);
            } else if (twoSame) {
              winAmount = bet * 3;
            } else if (Math.random() < 0.15) {
              winAmount = bet * 2;
            }

            if (winAmount > 0) {
              setLastWin(winAmount);
              onBalanceChange(balance - totalCost + winAmount);
              onWin(winAmount);
            }
          }, 200);
        }
      }, 400 + i * 200);
      timeouts.current.push(t);
    }
  }, [spinning, balance, bet, reelsCount, rowsCount, symbols, type, onBalanceChange, onWin]);

  const color = type === "crowns" ? "var(--gold)" : "var(--neon-purple)";
  const colorClass = type === "crowns" ? "text-yellow-400" : "text-purple-400";
  const glowClass = type === "crowns" ? "animate-glow-gold" : "animate-glow-purple";
  const name = type === "crowns" ? "ROYAL CROWNS" : "STAR GALAXY";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-oswald text-2xl font-bold tracking-widest" style={{ color }}>
          {name}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">{lines} ЛИНИЙ • МАКС. СТАВКА {bet * lines}₽</p>
      </div>

      {/* Reels */}
      <div
        className={`rounded-xl p-3 ${glowClass}`}
        style={{ background: "var(--casino-card2)", border: `2px solid ${color}33` }}
      >
        {/* Win line indicator */}
        <div className="relative">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none flex items-center justify-between px-1">
            <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <div className="flex-1 h-px mx-1" style={{ background: `${color}44` }} />
            <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          {reels.map((reel, ri) => (
            <div key={ri} className="reel-container rounded-lg flex flex-col" style={{ background: "#0a0d14", width: 56, height: 168 }}>
              {reel.map((sym, si) => (
                <div
                  key={si}
                  className="flex items-center justify-center text-2xl transition-all duration-100"
                  style={{
                    height: 56,
                    filter: spinningReels[ri] ? "blur(2px)" : "none",
                    transform: spinningReels[ri] ? `translateY(${Math.random() * 4 - 2}px)` : "none",
                  }}
                >
                  {sym}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Win display */}
      {lastWin > 0 && (
        <div className="text-center animate-win-flash rounded-lg py-2">
          <span className="font-oswald text-xl font-bold text-yellow-400 animate-glow-cyan">
            +{lastWin}₽ ВЫИГРЫШ!
          </span>
        </div>
      )}

      {/* Bet selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>СТАВКА НА ЛИНИЮ</span>
          <span>ИТОГО: {bet * lines}₽</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {BET_OPTIONS.map(b => (
            <button
              key={b}
              onClick={() => setBet(b)}
              className="flex-1 py-1.5 rounded-md text-xs font-bold font-oswald transition-all"
              style={{
                background: bet === b ? color : "var(--casino-card2)",
                color: bet === b ? "#1a1200" : "#888",
                border: `1px solid ${bet === b ? color : "#333"}`,
                minWidth: 36,
              }}
            >
              {b}₽
            </button>
          ))}
        </div>
      </div>

      {/* Spin button */}
      <button
        onClick={spin}
        disabled={spinning || balance < bet}
        className="btn-gold w-full py-4 rounded-xl text-lg font-bold font-oswald tracking-widest uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {spinning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin inline-block">⟳</span> КРУТИМ...
          </span>
        ) : "🎰 КРУТИТЬ"}
      </button>

      {/* Lines info */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className={colorClass}>●</span>
        <span>{lines} активных линий</span>
        <span className={colorClass}>●</span>
        <span>RTP 96%</span>
      </div>
    </div>
  );
}
