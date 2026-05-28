import { useState, useCallback } from "react";

interface MinerGameProps {
  balance: number;
  onBalanceChange: (v: number) => void;
  onWin: (amount: number) => void;
}

type CellState = "hidden" | "safe" | "bomb";

const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

const MULTIPLIERS: Record<number, number[]> = {
  3:  [1.1, 1.2, 1.35, 1.5, 1.7, 1.9, 2.2, 2.5, 3.0, 3.5, 4.2, 5.0, 6.2, 7.8, 10.0, 13.0, 17.0, 23.0, 33.0, 50.0, 83.0, 166.0],
  5:  [1.2, 1.4, 1.7, 2.1, 2.6, 3.3, 4.2, 5.4, 7.2, 9.7, 13.6, 19.6, 29.4, 46.2, 77.0, 135.8, 258.0, 544.5, 1306.8],
  10: [1.5, 2.0, 2.8, 4.0, 6.0, 9.2, 14.7, 24.5, 42.9, 80.0, 160.0, 346.8],
  15: [2.0, 3.5, 6.5, 13.0, 28.6, 68.6, 180.0, 540.0, 2160.0, 25920.0],
};

export default function MinerGame({ balance, onBalanceChange, onWin }: MinerGameProps) {
  const [bet, setBet] = useState(10);
  const [minesCount, setMinesCount] = useState(3);
  const [grid, setGrid] = useState<CellState[]>(Array(TOTAL_CELLS).fill("hidden"));
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [gameActive, setGameActive] = useState(false);
  const [safeOpened, setSafeOpened] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const BET_OPTIONS = [5, 10, 25, 50, 100, 250];
  const MINES_OPTIONS = [3, 5, 10, 15];

  const getCurrentMultiplier = () => {
    const mults = MULTIPLIERS[minesCount] || MULTIPLIERS[3];
    return mults[Math.min(safeOpened, mults.length - 1)] || mults[mults.length - 1];
  };

  const getPotentialWin = () => Math.floor(bet * getCurrentMultiplier());

  const startGame = useCallback(() => {
    if (balance < bet) return;
    onBalanceChange(balance - bet);

    const mines = new Set<number>();
    while (mines.size < minesCount) {
      mines.add(Math.floor(Math.random() * TOTAL_CELLS));
    }

    setMinePositions(mines);
    setGrid(Array(TOTAL_CELLS).fill("hidden"));
    setSafeOpened(0);
    setGameActive(true);
    setGameOver(false);
    setGameWon(false);
  }, [balance, bet, minesCount, onBalanceChange]);

  const openCell = useCallback((idx: number) => {
    if (!gameActive || grid[idx] !== "hidden") return;

    if (minePositions.has(idx)) {
      // Hit a bomb
      const newGrid = [...grid];
      minePositions.forEach(pos => {
        newGrid[pos] = "bomb";
      });
      newGrid[idx] = "bomb";
      setGrid(newGrid);
      setGameActive(false);
      setGameOver(true);
    } else {
      const newGrid = [...grid];
      newGrid[idx] = "safe";
      setGrid(newGrid);
      const newSafe = safeOpened + 1;
      setSafeOpened(newSafe);

      const maxSafe = TOTAL_CELLS - minesCount;
      if (newSafe >= maxSafe) {
        setGameActive(false);
        setGameWon(true);
        const winAmount = getPotentialWin();
        onBalanceChange(balance - bet + winAmount);
        onWin(winAmount);
      }
    }
  }, [gameActive, grid, minePositions, safeOpened, balance, bet, onBalanceChange, onWin]);

  const cashout = useCallback(() => {
    if (!gameActive || safeOpened === 0) return;
    const winAmount = getPotentialWin();
    onBalanceChange(balance + winAmount);
    onWin(winAmount);
    setGameActive(false);
    setGameWon(true);
  }, [gameActive, safeOpened, getPotentialWin, balance, onBalanceChange, onWin]);

  const getCellStyle = (state: CellState, idx: number) => {
    if (state === "bomb") return { background: "#7f1d1d", border: "1px solid #ef4444", boxShadow: "0 0 10px #ef444466" };
    if (state === "safe") return { background: "#14532d", border: "1px solid #22c55e", boxShadow: "0 0 10px #22c55e44" };
    return {
      background: gameOver && minePositions.has(idx) ? "#3f1515" : "var(--casino-card2)",
      border: "1px solid #333",
      cursor: gameActive ? "pointer" : "default",
    };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-oswald text-2xl font-bold tracking-widest text-emerald-400">МИНЁР</h2>
        <p className="text-xs text-muted-foreground mt-1">ОТКРОЙ КЛЕТКИ • ИЗБЕГАЙ МИН</p>
      </div>

      {/* Grid */}
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--casino-card2)", border: "2px solid #22c55e33" }}
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {grid.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => openCell(idx)}
              className="aspect-square rounded-lg flex items-center justify-center text-xl transition-all duration-150 hover:scale-105 active:scale-95"
              style={getCellStyle(cell, idx)}
              disabled={!gameActive || cell !== "hidden"}
            >
              {cell === "bomb" && "💣"}
              {cell === "safe" && "💎"}
              {cell === "hidden" && gameOver && minePositions.has(idx) && "💣"}
              {cell === "hidden" && !gameOver && !minePositions.has(idx) && ""}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      {gameActive && safeOpened > 0 && (
        <div className="text-center p-2 rounded-lg" style={{ background: "#14532d33", border: "1px solid #22c55e44" }}>
          <div className="text-emerald-400 font-oswald text-lg font-bold">
            x{getCurrentMultiplier().toFixed(2)} — {getPotentialWin()}₽
          </div>
          <div className="text-xs text-muted-foreground">потенциальный выигрыш</div>
        </div>
      )}

      {gameOver && (
        <div className="text-center p-2 rounded-lg animate-win-flash" style={{ background: "#7f1d1d33" }}>
          <div className="text-red-400 font-oswald text-lg font-bold">💥 ВЗРЫВ! Удачи в следующий раз</div>
        </div>
      )}

      {gameWon && (
        <div className="text-center p-2 rounded-lg" style={{ background: "#14532d44" }}>
          <div className="text-emerald-400 font-oswald text-lg font-bold">🎉 +{getPotentialWin()}₽ ВЫВЕДЕНО!</div>
        </div>
      )}

      {/* Settings */}
      {!gameActive && (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>СТАВКА</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {BET_OPTIONS.map(b => (
                <button
                  key={b}
                  onClick={() => setBet(b)}
                  className="flex-1 py-1.5 rounded-md text-xs font-bold font-oswald transition-all"
                  style={{
                    background: bet === b ? "#22c55e" : "var(--casino-card2)",
                    color: bet === b ? "#052e16" : "#888",
                    border: `1px solid ${bet === b ? "#22c55e" : "#333"}`,
                    minWidth: 36,
                  }}
                >
                  {b}₽
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">КОЛИЧЕСТВО МИН</div>
            <div className="flex gap-2">
              {MINES_OPTIONS.map(m => (
                <button
                  key={m}
                  onClick={() => setMinesCount(m)}
                  className="flex-1 py-2 rounded-md text-sm font-bold font-oswald transition-all"
                  style={{
                    background: minesCount === m ? "#ef4444" : "var(--casino-card2)",
                    color: minesCount === m ? "#fff" : "#888",
                    border: `1px solid ${minesCount === m ? "#ef4444" : "#333"}`,
                  }}
                >
                  💣 {m}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={balance < bet}
            className="w-full py-4 rounded-xl text-lg font-bold font-oswald tracking-widest uppercase transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff" }}
          >
            💎 НАЧАТЬ ИГРУ
          </button>
        </>
      )}

      {gameActive && (
        <button
          onClick={cashout}
          disabled={safeOpened === 0}
          className="w-full py-4 rounded-xl text-lg font-bold font-oswald tracking-widest uppercase transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: "#1a1200" }}
        >
          💰 ЗАБРАТЬ {getPotentialWin()}₽
        </button>
      )}
    </div>
  );
}
