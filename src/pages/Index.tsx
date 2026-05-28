import { useState, useEffect, useCallback } from "react";
import SlotMachine from "@/components/SlotMachine";
import MinerGame from "@/components/MinerGame";
import AviaTrix from "@/components/AviaTrix";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/2e0fdb0b-f8ef-4262-b8f8-e3b5b0b8876f";
const ADMIN_PASSWORD = "2007qwerQ";

type Page =
  | "home" | "games" | "slots-crowns" | "slots-stars" | "miner" | "aviatrix"
  | "bonuses" | "tournaments" | "profile" | "register" | "deposit" | "withdraw"
  | "admin" | "settings" | "support";

interface User { id: number; login: string; balance: number; display_name?: string; }
interface BetRecord { game: string; result: number; time: string; }
interface DepositRecord { id: number; amount: number; status: string; created_at: string; phone?: string; }
interface WithdrawRecord { id: number; amount: number; bank: string; sbp_number: string; status: string; created_at: string; }

const NAV_ITEMS = [
  { id: "home", label: "Главная", icon: "Home" },
  { id: "games", label: "Игры", icon: "Gamepad2" },
  { id: "bonuses", label: "Бонусы", icon: "Gift" },
  { id: "tournaments", label: "Турниры", icon: "Trophy" },
  { id: "profile", label: "Кабинет", icon: "User" },
];

const GAME_CARDS = [
  { id: "slots-crowns", title: "Royal Crowns", desc: "20 линий • Короны", icon: "👑", color: "var(--gold)", bg: "linear-gradient(135deg,#1a1200,#2d2000)", border: "#C9A000" },
  { id: "slots-stars", title: "Star Galaxy", desc: "5 линий • Звёзды", icon: "⭐", color: "#a855f7", bg: "linear-gradient(135deg,#1a0a2e,#2d0f52)", border: "#7c3aed" },
  { id: "aviatrix", title: "Авиатрикс", desc: "Успей до крэша!", icon: "✈️", color: "#06b6d4", bg: "linear-gradient(135deg,#001a1f,#002d35)", border: "#0891b2" },
  { id: "miner", title: "Минёр", desc: "Открывай • Не взорвись", icon: "💎", color: "#22c55e", bg: "linear-gradient(135deg,#001a0a,#002d12)", border: "#16a34a" },
];

const BONUSES = [
  { title: "Приветственный бонус", desc: "100% на первый депозит до 50 000₽", icon: "🎁", tag: "НОВЫМ", color: "#F5C518" },
  { title: "Кэшбэк 15%", desc: "Возврат 15% проигрыша каждую неделю", icon: "💰", tag: "ЕЖЕНЕДЕЛЬНО", color: "#22c55e" },
  { title: "Фриспины", desc: "50 бесплатных вращений каждый день", icon: "🎰", tag: "ЕЖЕДНЕВНО", color: "#a855f7" },
  { title: "VIP программа", desc: "Привилегии для постоянных игроков", icon: "👑", tag: "VIP", color: "#06b6d4" },
];

const TOURNAMENTS = [
  { title: "Турнир слотов", prize: "500 000₽", ends: "23:14:05", players: 284, icon: "🎰" },
  { title: "Авиатрикс Кубок", prize: "250 000₽", ends: "47:22:18", players: 156, icon: "✈️" },
  { title: "Минёр Лига", prize: "100 000₽", ends: "71:44:31", players: 98, icon: "💣" },
];

const BANKS = [
  { id: "sber", label: "Сбербанк", icon: "🟢" },
  { id: "tinkoff", label: "Т-Банк", icon: "🟡" },
  { id: "ozon", label: "Озон Банк", icon: "🔵" },
];

async function apiCall(path: string, method = "GET", body?: object, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  return data;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "Ожидает", color: "#eab308" },
    approved: { label: "Одобрено", color: "#22c55e" },
    rejected: { label: "Отклонено", color: "#ef4444" },
  };
  const s = map[status] || { label: status, color: "#888" };
  return (
    <span className="text-xs font-bold font-oswald px-2 py-0.5 rounded-full" style={{ background: `${s.color}22`, color: s.color }}>
      {s.label}
    </span>
  );
}

function BetHistoryPanel({ history }: { history: BetRecord[] }) {
  if (!history.length) return null;
  return (
    <div className="mt-4 casino-card rounded-xl p-4">
      <div className="font-oswald text-sm font-bold mb-2" style={{ color: "var(--gold)" }}>ИСТОРИЯ ИГР</div>
      <div className="flex flex-col gap-1">
        {history.slice(0, 5).map((h, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-gray-500">{h.time} · {h.game}</span>
            <span className={h.result > 0 ? "text-emerald-400 font-bold" : "text-red-400"}>
              {h.result > 0 ? "+" : ""}{h.result}₽
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Index() {
  const [page, setPage] = useState<Page>("home");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState(() => localStorage.getItem("casino_token") || "");
  const [balance, setBalance] = useState(50);
  const [history, setHistory] = useState<BetRecord[]>([]);
  const [totalBets, setTotalBets] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Register
  const [newCreds, setNewCreds] = useState<{ login: string; password: string } | null>(null);

  // Login
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });

  // Deposit
  const [depositAmount, setDepositAmount] = useState("");
  const [depositStep, setDepositStep] = useState<"form" | "instruction" | "done">("form");
  const [depositId, setDepositId] = useState<number | null>(null);

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawStep, setWithdrawStep] = useState<"form" | "done">("form");

  // Settings
  const [settingsForm, setSettingsForm] = useState({ login: "", password: "", display_name: "" });

  // Admin
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminDeposits, setAdminDeposits] = useState<(DepositRecord & { login: string })[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<(WithdrawRecord & { login: string })[]>([]);
  const [adminTab, setAdminTab] = useState<"deposits" | "withdrawals">("deposits");

  // Profile history
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRecord[]>([]);

  const winRate = totalBets > 0 ? Math.round((history.filter(h => h.result > 0).length / totalBets) * 100) : 0;

  const showMsg = (msg: string, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const navigate = (p: Page) => {
    setPage(p);
    setMobileMenuOpen(false);
    setError("");
    setSuccess("");
  };

  // Загрузить профиль
  const loadMe = useCallback(async (tok: string) => {
    try {
      const data = await apiCall("/me", "GET", undefined, tok);
      setUser(data);
      setBalance(data.balance);
    } catch {
      localStorage.removeItem("casino_token");
      setToken("");
    }
  }, []);

  useEffect(() => {
    if (token) loadMe(token);
  }, [token, loadMe]);

  // Синхронизировать баланс с бэкендом при изменении игрового баланса
  const syncBalance = useCallback(async (newBal: number) => {
    if (!token) return;
    setBalance(newBal);
    try {
      await apiCall("/update-balance", "POST", { balance: newBal }, token);
    } catch (e) { void e; }
  }, [token]);

  const handleWin = (amount: number, game: string) => {
    const now = new Date();
    setHistory(prev => [{
      game, result: amount,
      time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
    }, ...prev.slice(0, 49)]);
    setTotalBets(p => p + 1);
  };

  // Регистрация
  const handleRegister = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/register", "POST", {});
      setNewCreds({ login: data.login, password: data.password });
      localStorage.setItem("casino_token", data.token);
      setToken(data.token);
      setUser({ id: data.user_id, login: data.login, balance: data.balance });
      setBalance(data.balance);
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : "Ошибка", true);
    } finally {
      setLoading(false);
    }
  };

  // Вход
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiCall("/login", "POST", loginForm);
      localStorage.setItem("casino_token", data.token);
      setToken(data.token);
      setUser({ id: data.user_id, login: data.login, balance: data.balance, display_name: data.display_name });
      setBalance(data.balance);
      navigate("profile");
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : "Ошибка", true);
    } finally {
      setLoading(false);
    }
  };

  // Выход
  const handleLogout = () => {
    localStorage.removeItem("casino_token");
    setToken("");
    setUser(null);
    setBalance(50);
    navigate("home");
  };

  // Пополнение
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { navigate("register"); return; }
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < 100) { showMsg("Минимальная сумма 100₽", true); return; }
    setLoading(true);
    try {
      const data = await apiCall("/deposit", "POST", { amount: amt, phone: "" }, token);
      setDepositId(data.deposit_id);
      setDepositStep("instruction");
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : "Ошибка", true);
    } finally {
      setLoading(false);
    }
  };

  // Вывод
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { navigate("register"); return; }
    const amt = parseFloat(withdrawAmount);
    if (!withdrawBank) { showMsg("Выберите банк", true); return; }
    if (!withdrawPhone || withdrawPhone.length < 10) { showMsg("Введите номер СБП", true); return; }
    setLoading(true);
    try {
      await apiCall("/withdraw", "POST", { amount: amt, bank: withdrawBank, sbp_number: withdrawPhone }, token);
      setBalance(b => b - amt);
      setWithdrawStep("done");
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : "Ошибка", true);
    } finally {
      setLoading(false);
    }
  };

  // Сохранить настройки
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      await apiCall("/update-profile", "POST", settingsForm, token);
      await loadMe(token);
      showMsg("Настройки сохранены!");
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : "Ошибка", true);
    } finally {
      setLoading(false);
    }
  };

  // Загрузить историю профиля
  const loadProfileHistory = async () => {
    if (!token) return;
    try {
      const [d, w] = await Promise.all([
        apiCall("/deposits", "GET", undefined, token),
        apiCall("/withdrawals", "GET", undefined, token),
      ]);
      setDeposits(d.deposits || []);
      setWithdrawals(w.withdrawals || []);
    } catch (e) { void e; }
  };

  // Админ — загрузить данные
  const loadAdminData = async () => {
    try {
      const [d, w] = await Promise.all([
        fetch(`${API}/admin/deposits?pwd=${ADMIN_PASSWORD}`).then(r => r.json()),
        fetch(`${API}/admin/withdrawals?pwd=${ADMIN_PASSWORD}`).then(r => r.json()),
      ]);
      setAdminDeposits(d.deposits || []);
      setAdminWithdrawals(w.withdrawals || []);
    } catch (e) { void e; }
  };

  const adminApproveDeposit = async (id: number) => {
    await apiCall("/admin/approve-deposit", "POST", { password: ADMIN_PASSWORD, deposit_id: id });
    loadAdminData();
  };
  const adminRejectDeposit = async (id: number) => {
    await apiCall("/admin/reject-deposit", "POST", { password: ADMIN_PASSWORD, deposit_id: id });
    loadAdminData();
  };
  const adminApproveWithdraw = async (id: number) => {
    await apiCall("/admin/approve-withdrawal", "POST", { password: ADMIN_PASSWORD, withdrawal_id: id });
    loadAdminData();
  };
  const adminRejectWithdraw = async (id: number) => {
    await apiCall("/admin/reject-withdrawal", "POST", { password: ADMIN_PASSWORD, withdrawal_id: id });
    loadAdminData();
  };

  // -------- UI --------
  return (
    <div className="min-h-screen font-rubik" style={{ background: "var(--casino-bg)" }}>

      {/* Ticker */}
      <div className="overflow-hidden py-1.5 text-xs font-oswald" style={{ background: "#111520", borderBottom: "1px solid rgba(201,160,0,0.3)" }}>
        <div className="animate-ticker whitespace-nowrap inline-block" style={{ color: "var(--gold)" }}>
          🏆 IVAN_K выиграл 45 890₽ в Royal Crowns &nbsp;&nbsp;&nbsp; ✈️ MARIA выиграла 12 340₽ в Авиатрикс &nbsp;&nbsp;&nbsp; 💎 PRO_PLAYER выиграл 8 200₽ в Минёр &nbsp;&nbsp;&nbsp; 👑 LUCKY_ONE сорвал ДЖЕКПОТ 200 000₽ &nbsp;&nbsp;&nbsp; ⭐ STAR_MAN выиграл 33 500₽ в Star Galaxy &nbsp;&nbsp;&nbsp;
        </div>
      </div>

      {/* Toast */}
      {(error || success) && (
        <div className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-bold font-oswald shadow-xl animate-fade-in-up"
          style={{ background: error ? "#7f1d1d" : "#14532d", border: `1px solid ${error ? "#ef4444" : "#22c55e"}`, color: "#fff", minWidth: 240, textAlign: "center" }}>
          {error || success}
        </div>
      )}

      {/* Header */}
      <header style={{ background: "var(--casino-card)", borderBottom: "1px solid rgba(245,197,24,0.2)" }} className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={() => navigate("home")} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🎰</span>
            <span className="font-oswald text-xl font-bold text-gold-gradient tracking-widest">MAGISCESH</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => navigate(item.id as Page)}
                className="px-4 py-2 rounded-lg text-sm font-medium font-oswald tracking-wide transition-all"
                style={{ color: page === item.id ? "var(--gold)" : "#888", background: page === item.id ? "rgba(245,197,24,0.1)" : "transparent" }}>
                {item.label}
              </button>
            ))}
            <button onClick={() => navigate("support")}
              className="px-4 py-2 rounded-lg text-sm font-oswald transition-all"
              style={{ color: "#888" }}>
              Поддержка
            </button>
            <button onClick={() => navigate("admin")}
              className="px-4 py-2 rounded-lg text-sm font-oswald transition-all"
              style={{ color: "#555" }}>
              Админ
            </button>
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            {user && (
              <>
                <button onClick={() => navigate("deposit")}
                  className="hidden sm:block px-3 py-1.5 rounded-lg text-xs font-bold font-oswald transition-all"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                  + Пополнить
                </button>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer"
                  onClick={() => navigate("profile")}
                  style={{ background: "var(--casino-card2)", border: "1px solid rgba(245,197,24,0.3)" }}>
                  <span className="text-yellow-400 text-sm">💰</span>
                  <span className="font-oswald font-bold text-sm" style={{ color: "var(--gold)" }}>{balance.toLocaleString("ru-RU")}₽</span>
                </div>
                <button onClick={() => navigate("profile")}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-oswald flex-shrink-0 animate-glow-gold"
                  style={{ background: "var(--gold)", color: "#1a1200" }}>
                  {(user.display_name || user.login)[0]?.toUpperCase()}
                </button>
              </>
            )}
            {!user && (
              <button onClick={() => navigate("register")} className="btn-gold px-4 py-2 rounded-lg text-sm">Войти</button>
            )}
            <button className="md:hidden text-gray-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Icon name={mobileMenuOpen ? "X" : "Menu"} size={22} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-3" style={{ borderTop: "1px solid #222" }}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => navigate(item.id as Page)}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-oswald"
                style={{ color: page === item.id ? "var(--gold)" : "#888" }}>
                <Icon name={item.icon as "Home"} size={16} />{item.label}
              </button>
            ))}
            <button onClick={() => { navigate("support"); }}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm font-oswald text-left" style={{ color: "#888" }}>
              <Icon name="MessageCircle" size={16} /> Поддержка
            </button>
            <button onClick={() => navigate("admin")}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm font-oswald text-left" style={{ color: "#555" }}>
              <Icon name="Shield" size={16} /> Админ панель
            </button>
            {user && (
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2" style={{ color: "var(--gold)" }}>
                  <span>💰</span>
                  <span className="font-oswald font-bold">{balance.toLocaleString("ru-RU")}₽</span>
                </div>
                <button onClick={() => navigate("deposit")} className="text-xs font-oswald font-bold px-3 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>+ Пополнить</button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">

        {/* HOME */}
        {page === "home" && (
          <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="relative rounded-2xl overflow-hidden p-8 md:p-14 text-center"
              style={{ background: "linear-gradient(135deg,#0d0a00 0%,#1a1200 40%,#0d0820 100%)", border: "1px solid rgba(245,197,24,0.25)" }}>
              <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "var(--gold)", transform: "translate(-30%,-30%)" }} />
              <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "var(--neon-purple)", transform: "translate(30%,30%)" }} />
              <div className="relative z-10">
                <div className="text-5xl mb-3">🎰</div>
                <h1 className="font-oswald text-4xl md:text-6xl font-bold text-gold-gradient tracking-widest mb-3">MAGISCESH</h1>
                <p className="text-base text-gray-400 mb-6 max-w-md mx-auto">Лучшее онлайн казино — слоты, Авиатрикс, Минёр</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button onClick={() => navigate("games")} className="btn-gold px-8 py-3 rounded-xl text-base">🎮 Играть сейчас</button>
                  <button onClick={() => navigate("register")}
                    className="px-8 py-3 rounded-xl text-base font-oswald font-bold transition-all"
                    style={{ border: "1px solid rgba(245,197,24,0.4)", color: "var(--gold)" }}>
                    🎁 Получить бонус
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Игроков онлайн", value: "12 847", icon: "👥" },
                { label: "Выплачено сегодня", value: "2.4М₽", icon: "💰" },
                { label: "Игр доступно", value: "4", icon: "🎮" },
                { label: "Макс. выигрыш", value: "500К₽", icon: "🏆" },
              ].map((s, i) => (
                <div key={i} className="casino-card rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="font-oswald text-xl font-bold" style={{ color: "var(--gold)" }}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div>
              <h2 className="font-oswald text-2xl font-bold mb-4" style={{ color: "var(--gold)" }}>🎮 ПОПУЛЯРНЫЕ ИГРЫ</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {GAME_CARDS.map(g => (
                  <button key={g.id} onClick={() => navigate(g.id as Page)}
                    className="rounded-xl p-5 text-center transition-all hover:scale-105"
                    style={{ background: g.bg, border: `1px solid ${g.border}55` }}>
                    <div className="text-4xl mb-2">{g.icon}</div>
                    <div className="font-oswald font-bold text-sm" style={{ color: g.color }}>{g.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-oswald text-2xl font-bold mb-4" style={{ color: "var(--gold)" }}>🏆 АКТИВНЫЕ ТУРНИРЫ</h2>
              <div className="grid md:grid-cols-3 gap-3">
                {TOURNAMENTS.map((t, i) => (
                  <div key={i} className="casino-card rounded-xl p-4 flex items-center gap-4">
                    <div className="text-3xl">{t.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-oswald font-bold text-sm" style={{ color: "var(--gold)" }}>{t.title}</div>
                      <div className="text-emerald-400 font-bold text-lg font-oswald">{t.prize}</div>
                      <div className="text-xs text-muted-foreground">{t.players} игроков</div>
                    </div>
                    <button onClick={() => navigate("tournaments")} className="btn-gold px-3 py-1.5 rounded-lg text-xs flex-shrink-0">Играть</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* GAMES */}
        {page === "games" && (
          <div className="animate-fade-in-up">
            <h1 className="font-oswald text-3xl font-bold mb-6" style={{ color: "var(--gold)" }}>🎮 ВСЕ ИГРЫ</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GAME_CARDS.map(g => (
                <button key={g.id} onClick={() => navigate(g.id as Page)}
                  className="rounded-2xl p-6 text-left transition-all hover:scale-105 hover:-translate-y-1"
                  style={{ background: g.bg, border: `1px solid ${g.border}66` }}>
                  <div className="text-5xl mb-3">{g.icon}</div>
                  <div className="font-oswald text-lg font-bold" style={{ color: g.color }}>{g.title}</div>
                  <div className="text-sm text-gray-400 mt-1">{g.desc}</div>
                  <div className="mt-4 inline-block px-4 py-1.5 rounded-full text-xs font-bold font-oswald"
                    style={{ background: `${g.color}22`, color: g.color, border: `1px solid ${g.color}44` }}>
                    ИГРАТЬ →
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SLOTS CROWNS */}
        {page === "slots-crowns" && (
          <div className="animate-fade-in-up max-w-lg mx-auto">
            <button onClick={() => navigate("games")} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-white transition-colors">
              <Icon name="ChevronLeft" size={16} /> Назад к играм
            </button>
            <div className="casino-card rounded-2xl p-6">
              <SlotMachine type="crowns" balance={balance} onBalanceChange={syncBalance} onWin={a => handleWin(a, "Royal Crowns")} />
            </div>
            <BetHistoryPanel history={history} />
          </div>
        )}

        {/* SLOTS STARS */}
        {page === "slots-stars" && (
          <div className="animate-fade-in-up max-w-lg mx-auto">
            <button onClick={() => navigate("games")} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-white transition-colors">
              <Icon name="ChevronLeft" size={16} /> Назад к играм
            </button>
            <div className="casino-card rounded-2xl p-6">
              <SlotMachine type="stars" balance={balance} onBalanceChange={syncBalance} onWin={a => handleWin(a, "Star Galaxy")} />
            </div>
            <BetHistoryPanel history={history} />
          </div>
        )}

        {/* MINER */}
        {page === "miner" && (
          <div className="animate-fade-in-up max-w-lg mx-auto">
            <button onClick={() => navigate("games")} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-white transition-colors">
              <Icon name="ChevronLeft" size={16} /> Назад к играм
            </button>
            <div className="casino-card rounded-2xl p-6">
              <MinerGame balance={balance} onBalanceChange={syncBalance} onWin={a => handleWin(a, "Минёр")} />
            </div>
            <BetHistoryPanel history={history} />
          </div>
        )}

        {/* AVIATRIX */}
        {page === "aviatrix" && (
          <div className="animate-fade-in-up max-w-lg mx-auto">
            <button onClick={() => navigate("games")} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-white transition-colors">
              <Icon name="ChevronLeft" size={16} /> Назад к играм
            </button>
            <div className="casino-card rounded-2xl p-6">
              <AviaTrix balance={balance} onBalanceChange={syncBalance} onWin={a => handleWin(a, "Авиатрикс")} />
            </div>
            <BetHistoryPanel history={history} />
          </div>
        )}

        {/* BONUSES */}
        {page === "bonuses" && (
          <div className="animate-fade-in-up">
            <h1 className="font-oswald text-3xl font-bold mb-6" style={{ color: "var(--gold)" }}>🎁 БОНУСЫ И АКЦИИ</h1>
            <div className="grid md:grid-cols-2 gap-4">
              {BONUSES.map((b, i) => (
                <div key={i} className="casino-card rounded-2xl p-6" style={{ border: `1px solid ${b.color}33` }}>
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{b.icon}</div>
                    <div className="flex-1">
                      <span className="text-xs font-oswald font-bold px-2 py-0.5 rounded-full mb-1 inline-block" style={{ background: `${b.color}22`, color: b.color }}>{b.tag}</span>
                      <h3 className="font-oswald text-lg font-bold text-white">{b.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{b.desc}</p>
                      <button className="mt-3 px-4 py-1.5 rounded-lg text-sm font-bold font-oswald" style={{ background: `${b.color}22`, color: b.color, border: `1px solid ${b.color}44` }}>
                        Получить →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOURNAMENTS */}
        {page === "tournaments" && (
          <div className="animate-fade-in-up">
            <h1 className="font-oswald text-3xl font-bold mb-6" style={{ color: "var(--gold)" }}>🏆 ТУРНИРЫ</h1>
            <div className="flex flex-col gap-4">
              {TOURNAMENTS.map((t, i) => (
                <div key={i} className="casino-card rounded-2xl p-6" style={{ border: "1px solid rgba(245,197,24,0.2)" }}>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-5xl">{t.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-oswald text-xl font-bold" style={{ color: "var(--gold)" }}>{t.title}</h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                        <span>👥 {t.players} участников</span>
                        <span>⏱ Осталось: {t.ends}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-oswald text-2xl font-bold text-emerald-400">{t.prize}</div>
                      <div className="text-xs text-gray-500">призовой фонд</div>
                      <button className="btn-gold mt-2 px-6 py-2 rounded-lg text-sm">Участвовать</button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid #222" }}>
                    <div className="text-xs text-gray-500 mb-2 font-oswald">ТОП ИГРОКОВ</div>
                    {[["PRO_PLAYER", "50 000₽"], ["LUCKY_ACE", "20 000₽"], ["MEGA_WIN", "10 000₽"]].map(([n, p], j) => (
                      <div key={j} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <span>{["🥇", "🥈", "🥉"][j]}</span>
                          <span className="text-gray-300">{n}</span>
                        </div>
                        <span className="text-emerald-400 font-bold font-oswald">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGISTER / LOGIN */}
        {page === "register" && (
          <div className="animate-fade-in-up max-w-md mx-auto">
            <div className="casino-card rounded-2xl p-8" style={{ border: "1px solid rgba(245,197,24,0.3)" }}>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🎰</div>
                <h1 className="font-oswald text-2xl font-bold text-gold-gradient">ВХОД / РЕГИСТРАЦИЯ</h1>
              </div>

              {/* Если только что зарегистрировался */}
              {newCreds && (
                <div className="mb-6 p-4 rounded-xl text-center" style={{ background: "#14532d44", border: "1px solid #22c55e44" }}>
                  <div className="text-2xl mb-2">🎉</div>
                  <div className="font-oswald text-lg font-bold text-emerald-400">Аккаунт создан!</div>
                  <p className="text-sm text-gray-400 mt-2 mb-3">Сохраните данные для входа:</p>
                  <div className="text-left space-y-2">
                    <div className="flex justify-between items-center px-3 py-2 rounded-lg" style={{ background: "var(--casino-card2)" }}>
                      <span className="text-xs text-gray-400 font-oswald">ЛОГИН</span>
                      <span className="font-bold text-white font-oswald">{newCreds.login}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2 rounded-lg" style={{ background: "var(--casino-card2)" }}>
                      <span className="text-xs text-gray-400 font-oswald">ПАРОЛЬ</span>
                      <span className="font-bold text-white font-oswald">{newCreds.password}</span>
                    </div>
                  </div>
                  <button onClick={() => { setNewCreds(null); navigate("profile"); }} className="btn-gold mt-4 px-6 py-2 rounded-xl text-sm w-full">
                    Перейти в профиль →
                  </button>
                </div>
              )}

              {!newCreds && (
                <>
                  {/* Вход */}
                  <form onSubmit={handleLogin} className="flex flex-col gap-3 mb-5">
                    <p className="text-xs text-gray-400 font-oswald">УЖЕ ЕСТЬ АККАУНТ — ВОЙДИТЕ:</p>
                    <input type="text" placeholder="Логин" value={loginForm.login}
                      onChange={e => setLoginForm({ ...loginForm, login: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }} />
                    <input type="password" placeholder="Пароль" value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }} />
                    <button type="submit" disabled={loading} className="btn-gold w-full py-3 rounded-xl text-base disabled:opacity-50">
                      {loading ? "Входим..." : "🔑 Войти"}
                    </button>
                  </form>

                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px" style={{ background: "#333" }} />
                    <span className="text-xs text-gray-500 font-oswald">ИЛИ</span>
                    <div className="flex-1 h-px" style={{ background: "#333" }} />
                  </div>

                  {/* Регистрация */}
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-3">Нет аккаунта? Зарегистрируйтесь в один клик — логин и пароль придумаем сами</p>
                    <button onClick={handleRegister} disabled={loading} className="w-full py-3 rounded-xl text-base font-bold font-oswald transition-all disabled:opacity-50"
                      style={{ background: "rgba(245,197,24,0.15)", color: "var(--gold)", border: "1px solid rgba(245,197,24,0.4)" }}>
                      {loading ? "Создаём..." : "✨ Создать аккаунт автоматически"}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">Начальный баланс 50₽ уже на счету</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* DEPOSIT */}
        {page === "deposit" && (
          <div className="animate-fade-in-up max-w-md mx-auto">
            <button onClick={() => navigate("profile")} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-white transition-colors">
              <Icon name="ChevronLeft" size={16} /> Назад
            </button>
            <div className="casino-card rounded-2xl p-6" style={{ border: "1px solid rgba(34,197,94,0.3)" }}>
              <h2 className="font-oswald text-2xl font-bold mb-2 text-emerald-400">💳 ПОПОЛНЕНИЕ БАЛАНСА</h2>

              {depositStep === "form" && (
                <>
                  <p className="text-sm text-gray-400 mb-5">Пополнение через мобильный счёт Билайн. Минимум 100₽</p>
                  <form onSubmit={handleDeposit} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-oswald">СУММА ПОПОЛНЕНИЯ (₽)</label>
                      <input type="number" min="100" placeholder="Минимум 100₽" value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none text-lg font-bold"
                        style={{ background: "var(--casino-card2)", border: "1px solid #333" }} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[100, 200, 500, 1000, 2000, 5000].map(v => (
                        <button key={v} type="button" onClick={() => setDepositAmount(String(v))}
                          className="px-3 py-1.5 rounded-lg text-sm font-bold font-oswald transition-all"
                          style={{ background: depositAmount === String(v) ? "#22c55e" : "var(--casino-card2)", color: depositAmount === String(v) ? "#052e16" : "#888", border: `1px solid ${depositAmount === String(v) ? "#22c55e" : "#333"}` }}>
                          {v}₽
                        </button>
                      ))}
                    </div>
                    <button type="submit" disabled={loading || !token}
                      className="w-full py-4 rounded-xl text-base font-bold font-oswald tracking-wide disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff" }}>
                      {!token ? "Войдите для пополнения" : loading ? "Создаём заявку..." : "Продолжить →"}
                    </button>
                  </form>
                </>
              )}

              {depositStep === "instruction" && (
                <div className="text-center">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="font-oswald text-xl font-bold text-white mb-4">Инструкция по оплате</h3>
                  <div className="flex flex-col gap-3 text-left mb-6">
                    {[
                      { n: 1, text: `Откройте приложение Билайн или наберите *100#` },
                      { n: 2, text: `Выберите «Перевод на номер» или «Пополнить чужой счёт»` },
                      { n: 3, text: `Введите номер получателя:` },
                      { n: 4, text: `Введите сумму: ${depositAmount}₽` },
                      { n: 5, text: `Подтвердите перевод и нажмите «Я оплатил»` },
                    ].map(s => (
                      <div key={s.n} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 font-oswald" style={{ background: "#22c55e", color: "#052e16" }}>{s.n}</div>
                        <p className="text-sm text-gray-300 pt-0.5">{s.text}</p>
                      </div>
                    ))}
                  </div>
                  {/* Номер телефона крупно */}
                  <div className="py-4 px-6 rounded-xl mb-5 text-center" style={{ background: "var(--casino-card2)", border: "2px solid #22c55e55" }}>
                    <div className="text-xs text-gray-400 font-oswald mb-1">НОМЕР БИЛАЙН</div>
                    <div className="font-oswald text-3xl font-bold text-emerald-400">+7 962 903-15-56</div>
                    <div className="text-xs text-gray-500 mt-1 font-oswald">Заявка #{depositId}</div>
                  </div>
                  <button onClick={() => { setDepositStep("done"); }}
                    className="w-full py-4 rounded-xl text-base font-bold font-oswald" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff" }}>
                    ✅ Я оплатил — проверить
                  </button>
                </div>
              )}

              {depositStep === "done" && (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">⏳</div>
                  <h3 className="font-oswald text-xl font-bold text-yellow-400 mb-2">Заявка отправлена!</h3>
                  <p className="text-sm text-gray-400 mb-2">Ваша заявка на пополнение <span className="text-white font-bold">{depositAmount}₽</span> принята.</p>
                  <p className="text-sm text-gray-400 mb-5">После проверки оплаты администратором средства зачислятся на баланс автоматически.</p>
                  <StatusBadge status="pending" />
                  <div className="mt-6 flex gap-2">
                    <button onClick={() => { setDepositStep("form"); setDepositAmount(""); }} className="flex-1 py-3 rounded-xl font-oswald font-bold text-sm" style={{ border: "1px solid #333", color: "#888" }}>
                      Новое пополнение
                    </button>
                    <button onClick={() => navigate("profile")} className="flex-1 btn-gold py-3 rounded-xl font-oswald text-sm">
                      В профиль
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WITHDRAW */}
        {page === "withdraw" && (
          <div className="animate-fade-in-up max-w-md mx-auto">
            <button onClick={() => navigate("profile")} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-white transition-colors">
              <Icon name="ChevronLeft" size={16} /> Назад
            </button>
            <div className="casino-card rounded-2xl p-6" style={{ border: "1px solid rgba(168,85,247,0.3)" }}>
              <h2 className="font-oswald text-2xl font-bold mb-1 text-purple-400">💸 ВЫВОД СРЕДСТВ</h2>
              <p className="text-sm text-gray-400 mb-2">Доступно для вывода: <span className="text-white font-bold">{balance.toLocaleString("ru-RU")}₽</span></p>
              <div className="mb-4 px-3 py-2 rounded-lg text-xs text-yellow-400 font-oswald" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
                ⚠️ Для вывода необходимо пополнить баланс на 150₽ за последние 7 дней
              </div>

              {withdrawStep === "form" && (
                <form onSubmit={handleWithdraw} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-oswald">БАНК</label>
                    <div className="flex gap-2">
                      {BANKS.map(b => (
                        <button key={b.id} type="button" onClick={() => setWithdrawBank(b.label)}
                          className="flex-1 py-2 rounded-lg text-sm font-bold font-oswald transition-all"
                          style={{ background: withdrawBank === b.label ? "#a855f7" : "var(--casino-card2)", color: withdrawBank === b.label ? "#fff" : "#888", border: `1px solid ${withdrawBank === b.label ? "#a855f7" : "#333"}` }}>
                          {b.icon} {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-oswald">НОМЕР СБП</label>
                    <input type="tel" placeholder="+7 999 000-00-00" value={withdrawPhone}
                      onChange={e => setWithdrawPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-oswald">СУММА ВЫВОДА (₽)</label>
                    <input type="number" min="1" max={balance} placeholder={`Макс. ${balance}₽`} value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none text-lg font-bold"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }} />
                  </div>
                  <button type="submit" disabled={loading || !token || balance <= 0}
                    className="w-full py-4 rounded-xl text-base font-bold font-oswald tracking-wide disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff" }}>
                    {!token ? "Войдите для вывода" : loading ? "Отправляем..." : "📤 Запросить вывод"}
                  </button>
                </form>
              )}

              {withdrawStep === "done" && (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="font-oswald text-xl font-bold text-purple-400 mb-2">Заявка принята!</h3>
                  <p className="text-sm text-gray-400 mb-1">Сумма <span className="text-white font-bold">{withdrawAmount}₽</span> на {withdrawBank}</p>
                  <p className="text-sm text-gray-400 mb-5">Ожидайте обработки администратором.</p>
                  <StatusBadge status="pending" />
                  <button onClick={() => { setWithdrawStep("form"); setWithdrawAmount(""); setWithdrawBank(""); setWithdrawPhone(""); navigate("profile"); }}
                    className="mt-6 btn-gold w-full py-3 rounded-xl font-oswald text-sm">
                    В профиль
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PROFILE */}
        {page === "profile" && (
          <div className="animate-fade-in-up max-w-2xl mx-auto">
            <h1 className="font-oswald text-3xl font-bold mb-4" style={{ color: "var(--gold)" }}>👤 ЛИЧНЫЙ КАБИНЕТ</h1>

            {!user ? (
              <div className="casino-card rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">🔒</div>
                <p className="text-gray-400 mb-4">Войдите или зарегистрируйтесь</p>
                <button onClick={() => navigate("register")} className="btn-gold px-8 py-3 rounded-xl">Войти / Регистрация</button>
              </div>
            ) : (
              <>
                <div className="casino-card rounded-2xl p-6 mb-4" style={{ border: "1px solid rgba(245,197,24,0.2)" }}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold font-oswald animate-glow-gold flex-shrink-0"
                      style={{ background: "var(--gold)", color: "#1a1200" }}>
                      {(user.display_name || user.login)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-oswald text-xl font-bold text-white">{user.display_name || user.login}</div>
                      <div className="text-sm text-gray-400">@{user.login}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-oswald font-bold mt-1 inline-block" style={{ background: "rgba(245,197,24,0.2)", color: "var(--gold)" }}>BRONZE</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-oswald text-2xl font-bold" style={{ color: "var(--gold)" }}>{balance.toLocaleString("ru-RU")}₽</div>
                      <div className="text-xs text-gray-500 mb-2">баланс</div>
                      <div className="flex gap-2">
                        <button onClick={() => navigate("deposit")} className="px-3 py-1.5 rounded-lg text-xs font-bold font-oswald" style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.4)" }}>
                          + Пополнить
                        </button>
                        <button onClick={() => navigate("withdraw")} className="px-3 py-1.5 rounded-lg text-xs font-bold font-oswald" style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.4)" }}>
                          Вывести
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Всего ставок", value: totalBets },
                    { label: "Выигрышей", value: history.filter(h => h.result > 0).length },
                    { label: "% побед", value: `${winRate}%` },
                  ].map((s, i) => (
                    <div key={i} className="casino-card rounded-xl p-4 text-center">
                      <div className="font-oswald text-2xl font-bold" style={{ color: "var(--gold)" }}>{s.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Быстрые кнопки */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button onClick={() => { navigate("settings"); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-oswald transition-all" style={{ background: "var(--casino-card2)", color: "#aaa", border: "1px solid #333" }}>
                    <Icon name="Settings" size={14} /> Настройки
                  </button>
                  <button onClick={() => navigate("support")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-oswald transition-all" style={{ background: "var(--casino-card2)", color: "#aaa", border: "1px solid #333" }}>
                    <Icon name="MessageCircle" size={14} /> Поддержка
                  </button>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-oswald transition-all" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <Icon name="LogOut" size={14} /> Выйти
                  </button>
                </div>

                {/* История */}
                <div className="casino-card rounded-2xl p-4" style={{ border: "1px solid rgba(245,197,24,0.1)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-oswald text-lg font-bold" style={{ color: "var(--gold)" }}>📋 ИСТОРИЯ СТАВОК</h3>
                    <button onClick={loadProfileHistory} className="text-xs text-gray-500 hover:text-white transition-colors font-oswald">Загрузить</button>
                  </div>
                  {history.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6 text-sm">Сделайте первую ставку!</div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between py-2 text-sm" style={{ borderBottom: "1px solid #1a1a2e" }}>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-xs font-oswald">{h.time}</span>
                            <span className="text-white">{h.game}</span>
                          </div>
                          <span className={`font-bold font-oswald ${h.result > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {h.result > 0 ? "+" : ""}{h.result}₽
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Пополнения из БД */}
                  {deposits.length > 0 && (
                    <div className="mt-4 pt-4" style={{ borderTop: "1px solid #222" }}>
                      <h4 className="font-oswald text-sm font-bold mb-2 text-emerald-400">ПОПОЛНЕНИЯ</h4>
                      {deposits.map(d => (
                        <div key={d.id} className="flex justify-between items-center py-1 text-xs">
                          <span className="text-gray-400">{new Date(d.created_at).toLocaleDateString("ru-RU")} · +{d.amount}₽</span>
                          <StatusBadge status={d.status} />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Выводы из БД */}
                  {withdrawals.length > 0 && (
                    <div className="mt-4 pt-4" style={{ borderTop: "1px solid #222" }}>
                      <h4 className="font-oswald text-sm font-bold mb-2 text-purple-400">ВЫВОДЫ</h4>
                      {withdrawals.map(w => (
                        <div key={w.id} className="flex justify-between items-center py-1 text-xs">
                          <span className="text-gray-400">{new Date(w.created_at).toLocaleDateString("ru-RU")} · {w.bank} · -{w.amount}₽</span>
                          <StatusBadge status={w.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {page === "settings" && (
          <div className="animate-fade-in-up max-w-md mx-auto">
            <button onClick={() => navigate("profile")} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-white transition-colors">
              <Icon name="ChevronLeft" size={16} /> Назад в профиль
            </button>
            <div className="casino-card rounded-2xl p-6" style={{ border: "1px solid rgba(245,197,24,0.2)" }}>
              <h2 className="font-oswald text-2xl font-bold mb-5" style={{ color: "var(--gold)" }}>⚙️ НАСТРОЙКИ</h2>
              {!user ? (
                <p className="text-gray-400">Войдите в аккаунт</p>
              ) : (
                <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-oswald">НОВЫЙ ЛОГИН (текущий: {user.login})</label>
                    <input type="text" placeholder="Оставьте пустым, чтобы не менять" value={settingsForm.login}
                      onChange={e => setSettingsForm({ ...settingsForm, login: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-oswald">ОТОБРАЖАЕМОЕ ИМЯ</label>
                    <input type="text" placeholder="Ваш никнейм" value={settingsForm.display_name}
                      onChange={e => setSettingsForm({ ...settingsForm, display_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-oswald">НОВЫЙ ПАРОЛЬ</label>
                    <input type="password" placeholder="Оставьте пустым, чтобы не менять" value={settingsForm.password}
                      onChange={e => setSettingsForm({ ...settingsForm, password: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }} />
                  </div>
                  <button type="submit" disabled={loading} className="btn-gold w-full py-4 rounded-xl text-base disabled:opacity-50">
                    {loading ? "Сохраняем..." : "💾 Сохранить изменения"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* SUPPORT */}
        {page === "support" && (
          <div className="animate-fade-in-up max-w-md mx-auto">
            <div className="casino-card rounded-2xl p-8 text-center" style={{ border: "1px solid rgba(6,182,212,0.3)" }}>
              <div className="text-5xl mb-4">💬</div>
              <h2 className="font-oswald text-2xl font-bold mb-2" style={{ color: "var(--neon-cyan)" }}>ПОДДЕРЖКА</h2>
              <p className="text-gray-400 mb-6">Есть вопрос или проблема? Напишите нам в Telegram — ответим быстро!</p>
              <a href="https://t.me/Magaghmbjo" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-white font-bold font-oswald text-base transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg,#0088cc,#0066aa)" }}>
                <span className="text-2xl">✈️</span> Написать в Telegram
              </a>
              <p className="text-xs text-gray-500 mt-4">@Magaghmbjo · Время ответа: до 30 минут</p>
            </div>
          </div>
        )}

        {/* ADMIN */}
        {page === "admin" && (
          <div className="animate-fade-in-up max-w-4xl mx-auto">
            <h1 className="font-oswald text-3xl font-bold mb-6 text-red-400">🛡 ПАНЕЛЬ АДМИНИСТРАТОРА</h1>

            {!adminAuth ? (
              <div className="casino-card rounded-2xl p-8 max-w-sm mx-auto text-center" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
                <div className="text-4xl mb-4">🔐</div>
                <h2 className="font-oswald text-xl font-bold text-red-400 mb-4">Введите пароль</h2>
                <input type="password" placeholder="Пароль администратора" value={adminPwd}
                  onChange={e => setAdminPwd(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && adminPwd === ADMIN_PASSWORD) { setAdminAuth(true); loadAdminData(); } }}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none mb-4"
                  style={{ background: "var(--casino-card2)", border: "1px solid #333" }} />
                <button onClick={() => { if (adminPwd === ADMIN_PASSWORD) { setAdminAuth(true); loadAdminData(); } else showMsg("Неверный пароль", true); }}
                  className="w-full py-3 rounded-xl font-oswald font-bold" style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
                  Войти
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  {(["deposits", "withdrawals"] as const).map(tab => (
                    <button key={tab} onClick={() => setAdminTab(tab)}
                      className="px-5 py-2 rounded-lg font-oswald font-bold text-sm transition-all"
                      style={{ background: adminTab === tab ? (tab === "deposits" ? "#22c55e" : "#a855f7") : "var(--casino-card2)", color: adminTab === tab ? "#fff" : "#888" }}>
                      {tab === "deposits" ? `💳 Пополнения (${adminDeposits.filter(d => d.status === "pending").length} новых)` : `💸 Выводы (${adminWithdrawals.filter(w => w.status === "pending").length} новых)`}
                    </button>
                  ))}
                  <button onClick={loadAdminData} className="ml-auto px-3 py-2 rounded-lg text-xs font-oswald" style={{ background: "var(--casino-card2)", color: "#888" }}>
                    🔄 Обновить
                  </button>
                </div>

                {adminTab === "deposits" && (
                  <div className="flex flex-col gap-3">
                    {adminDeposits.length === 0 && <div className="text-center text-gray-500 py-8 font-oswald">Заявок нет</div>}
                    {adminDeposits.map(d => (
                      <div key={d.id} className="casino-card rounded-xl p-4" style={{ border: d.status === "pending" ? "1px solid rgba(34,197,94,0.4)" : "1px solid #222" }}>
                        <div className="flex flex-wrap items-center gap-3 justify-between">
                          <div>
                            <div className="font-oswald font-bold text-white">@{d.login} · <span className="text-emerald-400">+{d.amount}₽</span></div>
                            <div className="text-xs text-gray-400 mt-0.5">Билайн · {new Date(d.created_at).toLocaleString("ru-RU")} · #{d.id}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={d.status} />
                            {d.status === "pending" && (
                              <>
                                <button onClick={() => adminApproveDeposit(d.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold font-oswald" style={{ background: "#22c55e", color: "#052e16" }}>
                                  ✅ Одобрить
                                </button>
                                <button onClick={() => adminRejectDeposit(d.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold font-oswald" style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
                                  ❌ Отклонить
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab === "withdrawals" && (
                  <div className="flex flex-col gap-3">
                    {adminWithdrawals.length === 0 && <div className="text-center text-gray-500 py-8 font-oswald">Заявок нет</div>}
                    {adminWithdrawals.map(w => (
                      <div key={w.id} className="casino-card rounded-xl p-4" style={{ border: w.status === "pending" ? "1px solid rgba(168,85,247,0.4)" : "1px solid #222" }}>
                        <div className="flex flex-wrap items-center gap-3 justify-between">
                          <div>
                            <div className="font-oswald font-bold text-white">@{w.login} · <span className="text-purple-400">-{w.amount}₽</span></div>
                            <div className="text-xs text-gray-400 mt-0.5">{w.bank} · СБП: {w.sbp_number} · {new Date(w.created_at).toLocaleString("ru-RU")} · #{w.id}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={w.status} />
                            {w.status === "pending" && (
                              <>
                                <button onClick={() => adminApproveWithdraw(w.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold font-oswald" style={{ background: "#a855f7", color: "#fff" }}>
                                  ✅ Одобрить
                                </button>
                                <button onClick={() => adminRejectWithdraw(w.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold font-oswald" style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
                                  ❌ Отклонить
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </main>

      {/* Bottom mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 px-2 z-50"
        style={{ background: "var(--casino-card)", borderTop: "1px solid rgba(245,197,24,0.2)" }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => navigate(item.id as Page)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all"
            style={{ color: page === item.id ? "var(--gold)" : "#555" }}>
            <Icon name={item.icon as "Home"} size={18} />
            <span className="text-xs font-oswald">{item.label}</span>
          </button>
        ))}
        <button onClick={() => navigate("support")}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all"
          style={{ color: page === "support" ? "var(--neon-cyan)" : "#555" }}>
          <Icon name="MessageCircle" size={18} />
          <span className="text-xs font-oswald">Чат</span>
        </button>
      </div>
    </div>
  );
}