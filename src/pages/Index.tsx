import { useState } from "react";
import SlotMachine from "@/components/SlotMachine";
import MinerGame from "@/components/MinerGame";
import AviaTrix from "@/components/AviaTrix";
import Icon from "@/components/ui/icon";

type Page = "home" | "games" | "slots-crowns" | "slots-stars" | "miner" | "aviatrix" | "bonuses" | "tournaments" | "profile" | "register";

interface BetRecord {
  game: string;
  result: number;
  time: string;
}

const INITIAL_BALANCE = 10000;

const NAV_ITEMS = [
  { id: "home", label: "Главная", icon: "Home" },
  { id: "games", label: "Игры", icon: "Gamepad2" },
  { id: "bonuses", label: "Бонусы", icon: "Gift" },
  { id: "tournaments", label: "Турниры", icon: "Trophy" },
  { id: "profile", label: "Кабинет", icon: "User" },
];

const GAME_CARDS = [
  { id: "slots-crowns", title: "Royal Crowns", desc: "20 линий • Слоты с коронами", icon: "👑", color: "var(--gold)", bg: "linear-gradient(135deg, #1a1200, #2d2000)", border: "#C9A000" },
  { id: "slots-stars", title: "Star Galaxy", desc: "5 линий • Слоты со звёздами", icon: "⭐", color: "#a855f7", bg: "linear-gradient(135deg, #1a0a2e, #2d0f52)", border: "#7c3aed" },
  { id: "aviatrix", title: "Авиатрикс", desc: "Успей выйти до крэша!", icon: "✈️", color: "#06b6d4", bg: "linear-gradient(135deg, #001a1f, #002d35)", border: "#0891b2" },
  { id: "miner", title: "Минёр", desc: "Открывай клетки • Избегай мин", icon: "💎", color: "#22c55e", bg: "linear-gradient(135deg, #001a0a, #002d12)", border: "#16a34a" },
];

const BONUSES = [
  { title: "Приветственный бонус", desc: "100% на первый депозит до 50 000₽", icon: "🎁", tag: "НОВЫМ", color: "#F5C518" },
  { title: "Кэшбэк 15%", desc: "Возврат 15% проигрыша каждую неделю", icon: "💰", tag: "ЕЖЕНЕДЕЛЬНО", color: "#22c55e" },
  { title: "Фриспины", desc: "50 бесплатных вращений каждый день", icon: "🎰", tag: "ЕЖЕДНЕВНО", color: "#a855f7" },
  { title: "VIP программа", desc: "Эксклюзивные привилегии для постоянных игроков", icon: "👑", tag: "VIP", color: "#06b6d4" },
];

const TOURNAMENTS = [
  { title: "Турнир слотов", prize: "500 000₽", ends: "23:14:05", players: 284, icon: "🎰" },
  { title: "Авиатрикс Кубок", prize: "250 000₽", ends: "47:22:18", players: 156, icon: "✈️" },
  { title: "Минёр Лига", prize: "100 000₽", ends: "71:44:31", players: 98, icon: "💣" },
];

function BetHistoryPanel({ history }: { history: BetRecord[] }) {
  if (history.length === 0) return null;
  return (
    <div className="mt-4 casino-card rounded-xl p-4">
      <div className="font-oswald text-sm font-bold mb-2" style={{ color: "var(--gold)" }}>ПОСЛЕДНИЕ ВЫИГРЫШИ</div>
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
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [history, setHistory] = useState<BetRecord[]>([]);
  const [totalBets, setTotalBets] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "" });

  const handleWin = (amount: number, game: string) => {
    const now = new Date();
    setHistory(prev => [{
      game,
      result: amount,
      time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
    }, ...prev.slice(0, 49)]);
    setTotalBets(prev => prev + 1);
  };

  const navigate = (p: Page) => {
    setPage(p);
    setMobileMenuOpen(false);
  };

  const winRate = totalBets > 0 ? Math.round((history.filter(h => h.result > 0).length / totalBets) * 100) : 0;

  return (
    <div className="min-h-screen font-rubik" style={{ background: "var(--casino-bg)" }}>
      {/* Ticker */}
      <div className="overflow-hidden py-1.5 text-xs font-oswald" style={{ background: "#111520", borderBottom: "1px solid rgba(201,160,0,0.3)" }}>
        <div className="animate-ticker whitespace-nowrap inline-block" style={{ color: "var(--gold)" }}>
          🏆 IVAN_K выиграл 45 890₽ в Royal Crowns &nbsp;&nbsp;&nbsp; ✈️ MARIA выиграла 12 340₽ в Авиатрикс &nbsp;&nbsp;&nbsp; 💎 PRO_PLAYER выиграл 8 200₽ в Минёр &nbsp;&nbsp;&nbsp; 👑 LUCKY_ONE сорвал ДЖЕКПОТ 200 000₽ &nbsp;&nbsp;&nbsp; ⭐ STAR_MAN выиграл 33 500₽ в Star Galaxy &nbsp;&nbsp;&nbsp;
        </div>
      </div>

      {/* Header */}
      <header style={{ background: "var(--casino-card)", borderBottom: "1px solid rgba(245,197,24,0.2)" }} className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("home")} className="flex items-center gap-2">
            <span className="text-2xl">🎰</span>
            <span className="font-oswald text-xl font-bold text-gold-gradient tracking-widest">MAGISCESH</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id as Page)}
                className="px-4 py-2 rounded-lg text-sm font-medium font-oswald tracking-wide transition-all"
                style={{
                  color: page === item.id ? "var(--gold)" : "#888",
                  background: page === item.id ? "rgba(245,197,24,0.1)" : "transparent",
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: "var(--casino-card2)", border: "1px solid rgba(245,197,24,0.3)" }}
            >
              <span className="text-yellow-400 text-sm">💰</span>
              <span className="font-oswald font-bold text-sm" style={{ color: "var(--gold)" }}>
                {balance.toLocaleString("ru-RU")}₽
              </span>
            </div>

            {!registered ? (
              <button onClick={() => navigate("register")} className="btn-gold px-4 py-2 rounded-lg text-sm">
                Войти
              </button>
            ) : (
              <button
                onClick={() => navigate("profile")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "var(--gold)", color: "#1a1200" }}
              >
                {regForm.name[0]?.toUpperCase() || "U"}
              </button>
            )}

            <button className="md:hidden text-gray-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Icon name={mobileMenuOpen ? "X" : "Menu"} size={22} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-3" style={{ borderTop: "1px solid #222" }}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id as Page)}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-oswald"
                style={{ color: page === item.id ? "var(--gold)" : "#888" }}
              >
                <Icon name={item.icon as any} size={16} />
                {item.label}
              </button>
            ))}
            <div className="mt-2 px-3 py-2 flex items-center gap-2" style={{ color: "var(--gold)" }}>
              <span>💰</span>
              <span className="font-oswald font-bold">{balance.toLocaleString("ru-RU")}₽</span>
            </div>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6">

        {/* HOME */}
        {page === "home" && (
          <div className="flex flex-col gap-8 animate-fade-in-up">
            {/* Hero */}
            <div
              className="relative rounded-2xl overflow-hidden p-8 md:p-14 text-center"
              style={{
                background: "linear-gradient(135deg, #0d0a00 0%, #1a1200 40%, #0d0820 100%)",
                border: "1px solid rgba(245,197,24,0.25)",
              }}
            >
              <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "var(--gold)", transform: "translate(-30%, -30%)" }} />
              <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "var(--neon-purple)", transform: "translate(30%, 30%)" }} />
              <div className="relative z-10">
                <div className="text-5xl mb-3">🎰</div>
                <h1 className="font-oswald text-4xl md:text-6xl font-bold text-gold-gradient tracking-widest mb-3">MAGISCESH</h1>
                <p className="text-base text-gray-400 mb-6 max-w-md mx-auto">Лучшее онлайн казино — слоты, Авиатрикс, Минёр. Играй и выигрывай!</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button onClick={() => navigate("games")} className="btn-gold px-8 py-3 rounded-xl text-base">🎮 Играть сейчас</button>
                  <button
                    onClick={() => navigate("register")}
                    className="px-8 py-3 rounded-xl text-base font-oswald font-bold transition-all"
                    style={{ border: "1px solid rgba(245,197,24,0.4)", color: "var(--gold)" }}
                  >
                    🎁 Получить бонус
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Игроков онлайн", value: "12 847", icon: "👥" },
                { label: "Выплачено сегодня", value: "2.4М₽", icon: "💰" },
                { label: "Игр доступно", value: "4", icon: "🎮" },
                { label: "Максимальный выигрыш", value: "500К₽", icon: "🏆" },
              ].map((stat, i) => (
                <div key={i} className="casino-card rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="font-oswald text-xl font-bold" style={{ color: "var(--gold)" }}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Games */}
            <div>
              <h2 className="font-oswald text-2xl font-bold mb-4" style={{ color: "var(--gold)" }}>🎮 ПОПУЛЯРНЫЕ ИГРЫ</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {GAME_CARDS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => navigate(g.id as Page)}
                    className="rounded-xl p-5 text-center transition-all hover:scale-105"
                    style={{ background: g.bg, border: `1px solid ${g.border}55` }}
                  >
                    <div className="text-4xl mb-2">{g.icon}</div>
                    <div className="font-oswald font-bold text-sm" style={{ color: g.color }}>{g.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tournaments */}
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
                <button
                  key={g.id}
                  onClick={() => navigate(g.id as Page)}
                  className="rounded-2xl p-6 text-left transition-all hover:scale-105 hover:-translate-y-1"
                  style={{ background: g.bg, border: `1px solid ${g.border}66` }}
                >
                  <div className="text-5xl mb-3">{g.icon}</div>
                  <div className="font-oswald text-lg font-bold" style={{ color: g.color }}>{g.title}</div>
                  <div className="text-sm text-gray-400 mt-1">{g.desc}</div>
                  <div
                    className="mt-4 inline-block px-4 py-1.5 rounded-full text-xs font-bold font-oswald"
                    style={{ background: `${g.color}22`, color: g.color, border: `1px solid ${g.color}44` }}
                  >
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
              <SlotMachine type="crowns" balance={balance} onBalanceChange={setBalance} onWin={(a) => handleWin(a, "Royal Crowns")} />
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
              <SlotMachine type="stars" balance={balance} onBalanceChange={setBalance} onWin={(a) => handleWin(a, "Star Galaxy")} />
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
              <MinerGame balance={balance} onBalanceChange={setBalance} onWin={(a) => handleWin(a, "Минёр")} />
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
              <AviaTrix balance={balance} onBalanceChange={setBalance} onWin={(a) => handleWin(a, "Авиатрикс")} />
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
                      <div className="mb-1">
                        <span className="text-xs font-oswald font-bold px-2 py-0.5 rounded-full" style={{ background: `${b.color}22`, color: b.color }}>
                          {b.tag}
                        </span>
                      </div>
                      <h3 className="font-oswald text-lg font-bold text-white">{b.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{b.desc}</p>
                      <button
                        className="mt-3 px-4 py-1.5 rounded-lg text-sm font-bold font-oswald transition-all"
                        style={{ background: `${b.color}22`, color: b.color, border: `1px solid ${b.color}44` }}
                      >
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
                    <div className="flex flex-col gap-1">
                      {[["PRO_PLAYER", "50 000₽"], ["LUCKY_ACE", "20 000₽"], ["MEGA_WIN", "10 000₽"]].map(([name, prize], j) => (
                        <div key={j} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span>{["🥇", "🥈", "🥉"][j]}</span>
                            <span className="text-gray-300">{name}</span>
                          </div>
                          <span className="text-emerald-400 font-bold font-oswald">{prize}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE */}
        {page === "profile" && (
          <div className="animate-fade-in-up max-w-2xl mx-auto">
            <h1 className="font-oswald text-3xl font-bold mb-6" style={{ color: "var(--gold)" }}>👤 ЛИЧНЫЙ КАБИНЕТ</h1>

            <div className="casino-card rounded-2xl p-6 mb-4" style={{ border: "1px solid rgba(245,197,24,0.2)" }}>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold font-oswald animate-glow-gold flex-shrink-0"
                  style={{ background: "var(--gold)", color: "#1a1200" }}
                >
                  {registered ? regForm.name[0]?.toUpperCase() : "G"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-oswald text-xl font-bold text-white">{registered ? regForm.name : "Гость"}</div>
                  <div className="text-sm text-gray-400">{registered ? regForm.email : "Войдите для доступа"}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-oswald font-bold mt-1 inline-block" style={{ background: "rgba(245,197,24,0.2)", color: "var(--gold)" }}>BRONZE</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-oswald text-2xl font-bold" style={{ color: "var(--gold)" }}>{balance.toLocaleString("ru-RU")}₽</div>
                  <div className="text-xs text-gray-500">баланс</div>
                  <button className="btn-gold mt-2 px-4 py-1.5 rounded-lg text-xs">Пополнить</button>
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

            <div className="casino-card rounded-2xl p-4" style={{ border: "1px solid rgba(245,197,24,0.1)" }}>
              <h3 className="font-oswald text-lg font-bold mb-3" style={{ color: "var(--gold)" }}>📋 ИСТОРИЯ СТАВОК</h3>
              {history.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 text-sm">История пуста — сделайте первую ставку!</div>
              ) : (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
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
            </div>
          </div>
        )}

        {/* REGISTER */}
        {page === "register" && (
          <div className="animate-fade-in-up max-w-md mx-auto">
            <div className="casino-card rounded-2xl p-8" style={{ border: "1px solid rgba(245,197,24,0.3)" }}>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🎰</div>
                <h1 className="font-oswald text-2xl font-bold text-gold-gradient">РЕГИСТРАЦИЯ</h1>
                <p className="text-sm text-gray-400 mt-1">Получите бонус 100% на первый депозит</p>
              </div>

              {!registered ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); setRegistered(true); navigate("profile"); }}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-oswald">ИМЯ ПОЛЬЗОВАТЕЛЯ</label>
                    <input
                      type="text"
                      value={regForm.name}
                      onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                      placeholder="Ваш никнейм"
                      required
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-oswald">EMAIL</label>
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-oswald">ПАРОЛЬ</label>
                    <input
                      type="password"
                      value={regForm.password}
                      onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Минимум 6 символов"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 outline-none"
                      style={{ background: "var(--casino-card2)", border: "1px solid #333" }}
                    />
                  </div>
                  <button type="submit" className="btn-gold w-full py-4 rounded-xl text-base">
                    🎁 Зарегистрироваться и получить бонус
                  </button>
                  <div className="text-center text-xs text-gray-500">
                    Нажимая кнопку, вы соглашаетесь с{" "}
                    <span className="underline cursor-pointer" style={{ color: "var(--gold)" }}>правилами</span>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">🎉</div>
                  <div className="font-oswald text-xl font-bold text-emerald-400">Добро пожаловать!</div>
                  <p className="text-sm text-gray-400 mt-2">Регистрация прошла успешно</p>
                  <button onClick={() => navigate("games")} className="btn-gold mt-4 px-6 py-3 rounded-xl">Играть →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom mobile nav */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 px-2 z-50"
        style={{ background: "var(--casino-card)", borderTop: "1px solid rgba(245,197,24,0.2)" }}
      >
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id as Page)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all"
            style={{ color: page === item.id ? "var(--gold)" : "#555" }}
          >
            <Icon name={item.icon as any} size={18} />
            <span className="text-xs font-oswald">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
