import React, { useState, useEffect, useRef } from "react";
import { auth, db, ADMIN_UID } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { 
  doc, getDoc, setDoc, collection, addDoc, deleteDoc, onSnapshot, query, orderBy 
} from "firebase/firestore";
import { DIET_DATA } from "./data/dietData";
import AdminPanel from "./components/AdminPanel";
import { format, addDays, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  ChevronLeft, ChevronRight, Sparkles, LogOut, 
  Check, Settings, Camera, X, Sun, Moon, Coffee, BookOpen, Ban, Scale, 
  TrendingDown, Plus, Trash2, Heart 
} from "lucide-react";

const START_WEIGHT = 102.0;
const SURGERY_DATE = new Date("2026-08-07T00:00:00");

const MEAL_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  snack: Sparkles,
  dinner: Moon,
};

const NAV_ITEMS = [
  { id: "breakfast", label: "Sabah", icon: Coffee },
  { id: "lunch", label: "Öğle", icon: Sun },
  { id: "snack", label: "Ara", icon: Sparkles },
  { id: "dinner", label: "Akşam", icon: Moon },
];

const DEFAULT_FORBIDDEN = [
  {
    category: "Hamur İşleri ve Unlu Gıdalar",
    items: ["Beyaz Ekmek", "Lavaş", "Pide", "Börek", "Poğaça", "Simit", "Makarna"],
  },
  {
    category: "Şeker İçeriği Yüksek Besinler",
    items: ["Bal", "Reçel", "Pekmez", "Çikolata", "Gazlı ve Şekerli İçecekler", "Hazır Meyve Suyu"],
  },
  {
    category: "Kızartmalar ve İşlenmiş Gıdalar",
    items: ["Patates Kızartması", "Salam", "Sosis", "Sucuk", "Fast Food", "Cips"],
  },
];

const DEFAULT_LOVE_NOTES = [
  "Sen benim bu hayattaki en büyük şansımsın. Her adımında, her anında seninleyim. ❤️",
  "Bugün kendine biraz daha şefkat göster canım eşim, harika gidiyorsun! 🌸",
  "Gözlerinin içindeki o güzel gülümseme dünyalara bedel. İyi ki varsın. ✨",
  "Seninle her şey daha kolay, daha neşeli ve çok daha güzel. Seni çok seviyorum. 💌",
  "Azmine ve içindeki o güzel güce her gün bir kez daha hayran oluyorum. 🌟"
];

const getCurrentMealByHour = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "snack";
  return "dinner";
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dietConfig, setDietConfig] = useState(DIET_DATA);
  const [selections, setSelections] = useState({});
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [activeMeal, setActiveMeal] = useState(getCurrentMealByHour());

  // Kilo Takip Verileri
  const [weights, setWeights] = useState([]);
  const [weightsLoading, setWeightsLoading] = useState(true);
  const [inputWeight, setInputWeight] = useState("");
  const [inputDate, setInputDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [savingWeight, setSavingWeight] = useState(false);

  // Sürpriz Aşk Notu
  const [heartMode, setHeartMode] = useState("hidden");
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [currentLoveNote, setCurrentLoveNote] = useState("");

  const heartRef = useRef(null);
  const animFrameRef = useRef(null);

  // Karanlık Mod
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const dateKey = format(currentDate, "yyyy-MM-dd");
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const isAdmin = user && user.uid === ADMIN_UID;
  const isWife = user?.email?.toLowerCase().includes("cigdem") || isAdmin;

  const totalMeals = dietConfig.meals.length;
  const completedMeals = Object.keys(selections).filter((k) => selections[k] !== undefined).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    const isWifeName = user?.email?.toLowerCase().includes("cigdem");
    const name = isWifeName ? "Çiğdem 🌸" : "Sedat";

    if (hour >= 5 && hour < 12) return { word: "Günaydın", name };
    if (hour >= 12 && hour < 18) return { word: "Tünaydın", name };
    if (hour >= 18 && hour < 23) return { word: "İyi Akşamlar", name };
    return { word: "Huzurlu Geceler", name };
  };

  const greeting = getGreeting();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchDietConfig = async () => {
      try {
        const docRef = doc(db, "config", "diet_data");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setDietConfig(snap.data());
        } else if (isAdmin) {
          await setDoc(docRef, DIET_DATA);
        }
      } catch (err) {
        console.error("Menü yükleme hatası:", err);
      }
    };
    fetchDietConfig();
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user) return;
    const fetchLog = async () => {
      try {
        const docRef = doc(db, "logs", user.uid, "days", dateKey);
        const docSnap = await getDoc(docRef);
        setSelections(docSnap.exists() ? docSnap.data().meals || {} : {});
      } catch (err) {
        console.error("Kayıt çekme hatası:", err);
      }
    };
    fetchLog();
  }, [user, dateKey]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "logs", user.uid, "weights"),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setWeights(items);
      setWeightsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Sayfa Açıldıktan 5 Saniye Sonra Kalbi Başlat
  useEffect(() => {
    if (!user || !isWife) return;

    const timer = setTimeout(() => {
      setHeartMode((prev) => (prev === "docked" ? "docked" : "wandering"));
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, isWife]);

  // Süzülen Kalp Hareketi
  useEffect(() => {
    if (heartMode !== "wandering") return;

    const heartSize = 52;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    let x = Math.random() * (screenW - 100) + 20;
    let y = Math.random() * (screenH - 260) + 80;

    const speed = 20;
    const angle = Math.random() * 2 * Math.PI;
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;

    if (Math.abs(vx) < 10) vx = vx < 0 ? -12 : 12;
    if (Math.abs(vy) < 10) vy = vy < 0 ? -12 : 12;

    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const currentW = window.innerWidth;
      const currentH = window.innerHeight;
      const minX = 12;
      const maxX = currentW - heartSize - 12;
      const minY = 65;
      const maxY = currentH - heartSize - 80;

      x += vx * dt;
      y += vy * dt;

      if (x <= minX) {
        x = minX;
        vx = Math.abs(vx);
      } else if (x >= maxX) {
        x = maxX;
        vx = -Math.abs(vx);
      }

      if (y <= minY) {
        y = minY;
        vy = Math.abs(vy);
      } else if (y >= maxY) {
        y = maxY;
        vy = -Math.abs(vy);
      }

      if (heartRef.current) {
        heartRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [heartMode]);

  // Kalbe Tıklandığında Canlı Güncel Notu Aç
  const handleHeartClick = async () => {
    try {
      const metaRef = doc(db, "logs", user.uid, "meta", "love_state");
      const metaSnap = await getDoc(metaRef);
      const data = metaSnap.exists() ? metaSnap.data() : {};

      const notes = dietConfig.loveNotes?.length > 0 ? dietConfig.loveNotes : DEFAULT_LOVE_NOTES;
      const seenIndices = Array.isArray(data.seenIndices) ? data.seenIndices : [];

      let noteToShow = "";
      let targetIndex = typeof data.todayIndex === "number" ? data.todayIndex : 0;

      if (data.lastSeenDate === todayKey) {
        noteToShow = notes[targetIndex] || notes[0];
      } else {
        let availableIndices = notes.map((_, idx) => idx).filter((idx) => !seenIndices.includes(idx));
        let nextIndex;
        let nextSeen;

        if (availableIndices.length === 0) {
          nextIndex = 0;
          nextSeen = [0];
        } else {
          nextIndex = availableIndices[0];
          nextSeen = [...seenIndices, nextIndex];
        }

        targetIndex = nextIndex;
        noteToShow = notes[nextIndex];

        await setDoc(metaRef, {
          lastSeenDate: todayKey,
          todayIndex: nextIndex,
          todayNote: noteToShow,
          seenIndices: nextSeen,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      setCurrentLoveNote(noteToShow);
      setHeartMode("docked");
      setShowLetterModal(true);

    } catch (err) {
      console.error("Not yüklenemedi:", err);
      const notes = dietConfig.loveNotes?.length > 0 ? dietConfig.loveNotes : DEFAULT_LOVE_NOTES;
      setCurrentLoveNote(notes[0] || "Seni çok seviyorum canım eşim! ❤️");
      setHeartMode("docked");
      setShowLetterModal(true);
    }
  };

  const handleSelect = async (mealId, optionIndex) => {
    const updated = { ...selections };
    if (updated[mealId] === optionIndex) {
      delete updated[mealId];
    } else {
      updated[mealId] = optionIndex;
    }
    setSelections(updated);

    if (!user) return;
    try {
      await setDoc(doc(db, "logs", user.uid, "days", dateKey), {
        meals: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Kaydetme hatası:", err);
    }
  };

  const handleAddWeight = async (e) => {
    e.preventDefault();
    const val = parseFloat(inputWeight.replace(",", "."));
    if (isNaN(val) || val <= 0) return;

    setSavingWeight(true);
    try {
      await addDoc(collection(db, "logs", user.uid, "weights"), {
        weight: val,
        date: inputDate,
        createdAt: new Date().toISOString(),
      });
      setInputWeight("");
    } catch (err) {
      console.error("Kilo kaydedilemedi:", err);
      alert("Kayıt sırasında bir hata oluştu.");
    } finally {
      setSavingWeight(false);
    }
  };

  const handleDeleteWeight = async (id) => {
    if (!window.confirm("Bu tartı kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDoc(doc(db, "logs", user.uid, "weights", id));
    } catch (err) {
      console.error("Kayıt silinemedi:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setAuthError("Giriş yapılamadı. Bilgilerini kontrol eder misin?");
    }
  };

  const sortedWeights = [...weights].sort((a, b) => new Date(b.date) - new Date(a.date));
  const currentWeight = sortedWeights.length > 0 ? sortedWeights[0].weight : START_WEIGHT;
  const prevWeight = sortedWeights.length > 1 ? sortedWeights[1].weight : START_WEIGHT;
  const totalLost = (START_WEIGHT - currentWeight).toFixed(1);
  const lastDiff = (prevWeight - currentWeight).toFixed(1);
  const today = new Date();
  const diffTime = today.getTime() - SURGERY_DATE.getTime();
  const daysSinceSurgery = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F5] dark:bg-[#181514] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-2 border-rose-200 dark:border-rose-900 border-t-rose-500 rounded-full animate-spin" />
        <span className="text-[11px] tracking-widest text-stone-400 uppercase font-medium">Yükleniyor</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF7F5] dark:bg-[#181514] flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white dark:bg-[#231F1E] p-8 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center mx-auto mb-3 text-rose-500 dark:text-rose-400">
              <Sparkles size={20} />
            </div>
            <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Diyet & Yaşam Ritmi</h1>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Günün menüsünü takip etmeye başla</p>
          </div>

          {authError && (
            <div className="text-rose-600 dark:text-rose-400 text-xs mb-4 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1 ml-1">E-Posta</label>
              <input
                type="email"
                required
                className="w-full bg-stone-50 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl px-4 py-3 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400 focus:bg-white dark:focus:bg-[#1c1817] transition-all"
                value={email}
                placeholder="ornek@hesap.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1 ml-1">Şifre</label>
              <input
                type="password"
                required
                className="w-full bg-stone-50 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-700/80 rounded-2xl px-4 py-3 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400 focus:bg-white dark:focus:bg-[#1c1817] transition-all"
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-3.5 rounded-2xl shadow-sm shadow-rose-500/20 transition-all active:scale-[0.98]"
            >
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    );
  }

  const selectedMealData = dietConfig.meals.find((m) => m.id === activeMeal);
  const selectedMealIcon = MEAL_ICONS[selectedMealData?.id] || Sparkles;
  const isSelectedMealDone = selectedMealData && selections[selectedMealData.id] !== undefined;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAF7F5] dark:bg-[#181514] font-sans text-stone-800 dark:text-stone-100 select-none transition-colors duration-300 relative overflow-x-hidden pb-28">
      
      <style>{`
        @keyframes letterUnfold {
          0% { 
            opacity: 0; 
            transform: translateY(20px) scale(0.96); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        .animate-letter-open {
          animation: letterUnfold 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .letter-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .letter-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .letter-scroll::-webkit-scrollbar-thumb {
          background: rgba(244, 63, 94, 0.3);
          border-radius: 9999px;
        }
      `}</style>

      {/* Üst Bar */}
      <header className="px-6 pt-7 pb-3 bg-[#FAF7F5] dark:bg-[#181514] transition-colors duration-300">
        <div className="flex items-center justify-between text-stone-400 dark:text-stone-500 mb-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
              className="p-1 -ml-1 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold tracking-wide text-stone-600 dark:text-stone-300 capitalize">
              {format(currentDate, "d MMMM, EEEE", { locale: tr })}
            </span>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="p-1 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button 
                onClick={() => setIsAdminOpen(true)} 
                className="text-stone-400 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                title="Yönetici Paneli"
              >
                <Settings size={16} />
              </button>
            )}
            <button 
              onClick={() => setIsDark(!isDark)} 
              className="text-stone-400 dark:text-stone-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-0.5"
              title={isDark ? "Aydınlık Moda Geç" : "Karanlık Moda Geç"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              onClick={() => signOut(auth)} 
              className="text-stone-400 dark:text-stone-500 hover:text-rose-600 transition-colors"
              title="Çıkış"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-light tracking-tight text-stone-800 dark:text-stone-100 truncate">
            {greeting.word},{" "}
            <span className="font-semibold text-rose-500 dark:text-rose-400 whitespace-nowrap">
              {greeting.name}
            </span>
          </h1>

          <div className="flex items-center gap-1.5 shrink-0" title={`${completedMeals}/${totalMeals} Öğün Tamamlandı`}>
            {dietConfig.meals.map((meal) => (
              <div 
                key={meal.id} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  selections[meal.id] !== undefined 
                    ? "bg-rose-500 scale-110 shadow-xs shadow-rose-500/50" 
                    : "bg-stone-200 dark:bg-stone-800"
                }`} 
              />
            ))}
          </div>
        </div>

        {/* Buton Grubu: Kilo + Yasaklar + Kurallar + Sağda Şık "Bugünün mesajını okudun" ve Kalp */}
        <div className="mt-3 flex items-center justify-start gap-1.5 w-full relative">
          <button
            onClick={() => setActiveMeal("weight")}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-2xs transition-all active:scale-95 ${
              activeMeal === "weight"
                ? "bg-rose-500 text-white border border-rose-500 shadow-rose-500/25"
                : "text-stone-600 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-[#231F1E] border border-stone-200/80 dark:border-stone-800"
            }`}
          >
            <Scale size={11} className={activeMeal === "weight" ? "text-white" : "text-rose-500"} />
            <span>Kilo</span>
          </button>

          <button
            onClick={() => setActiveMeal("forbidden")}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-2xs transition-all active:scale-95 ${
              activeMeal === "forbidden"
                ? "bg-rose-500 text-white border border-rose-500 shadow-rose-500/25"
                : "text-stone-600 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-[#231F1E] border border-stone-200/80 dark:border-stone-800"
            }`}
          >
            <Ban size={11} className={activeMeal === "forbidden" ? "text-white" : "text-rose-500"} />
            <span>Yasaklar</span>
          </button>

          <button
            onClick={() => setActiveMeal("rules")}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-2xs transition-all active:scale-95 ${
              activeMeal === "rules"
                ? "bg-rose-500 text-white border border-rose-500 shadow-rose-500/25"
                : "text-stone-600 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-[#231F1E] border border-stone-200/80 dark:border-stone-800"
            }`}
          >
            <BookOpen size={11} className={activeMeal === "rules" ? "text-white" : "text-rose-400"} />
            <span>Kurallar</span>
          </button>

          {/* Sağ Köşe: Okunduğunda Gelen İnce Metin ve Sabit Kalp */}
          {heartMode === "docked" && (
            <div className="ml-auto flex items-center gap-1.5 animate-in fade-in duration-300">
              <span className="text-[10px] font-serif italic text-stone-400 dark:text-stone-500 select-none tracking-tight">
                Bugünün mesajını okudun
              </span>
              <button
                onClick={handleHeartClick}
                className="w-7 h-7 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md shadow-rose-500/30 active:scale-90 transition-transform shrink-0"
                title="Günün Sevgi Notunu Yeniden Aç"
              >
                <Heart size={13} className="fill-white" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Ana İçerik Kartı */}
      <main className="px-5 pt-2">
        {/* 1. KİLO TAKİBİ */}
        {activeMeal === "weight" && (
          <section className="bg-white dark:bg-[#231F1E] rounded-3xl p-5 border border-stone-100 dark:border-stone-800/80 shadow-2xs transition-all duration-200 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs shadow-rose-500/30">
                  <Scale size={19} />
                </div>
                <div>
                  <h2 className="font-extrabold text-stone-800 dark:text-stone-100 text-base tracking-tight">
                    Kilo Takibi
                  </h2>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-tight mt-0.5">
                    Başlangıç: {START_WEIGHT} kg (7 Ağustos)
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-[#181514] border border-stone-200/60 dark:border-stone-800 px-2.5 py-1 rounded-xl flex items-center gap-1">
                <Heart size={11} className="text-rose-400 fill-rose-400/20" />
                <span>{daysSinceSurgery}. Gün</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#FAF7F5] dark:bg-[#181514] rounded-2xl p-2.5 text-center">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 dark:text-stone-500 block">Toplam</span>
                <div className="my-0.5 text-rose-500 dark:text-rose-400 font-bold text-sm flex items-center justify-center gap-0.5">
                  <TrendingDown size={12} />
                  <span>{parseFloat(totalLost) > 0 ? `-${totalLost}` : "0.0"}</span>
                </div>
                <span className="text-[9px] text-stone-400 dark:text-stone-500">kg verildi</span>
              </div>

              <div className="bg-[#FAF7F5] dark:bg-[#181514] rounded-2xl p-2.5 text-center">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 dark:text-stone-500 block">Son Fark</span>
                <div className="my-0.5 text-emerald-500 dark:text-emerald-400 font-bold text-sm">
                  {parseFloat(lastDiff) > 0 ? `-${lastDiff}` : parseFloat(lastDiff) < 0 ? `+${Math.abs(lastDiff)}` : "0.0"}
                </div>
                <span className="text-[9px] text-stone-400 dark:text-stone-500">kg</span>
              </div>

              <div className="bg-[#FAF7F5] dark:bg-[#181514] rounded-2xl p-2.5 text-center">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 dark:text-stone-500 block">Son Tartı</span>
                <div className="my-0.5 text-stone-800 dark:text-stone-100 font-bold text-sm">
                  {currentWeight}
                </div>
                <span className="text-[9px] text-stone-400 dark:text-stone-500">kg</span>
              </div>
            </div>

            <form onSubmit={handleAddWeight} className="space-y-2 pt-1 border-t border-stone-100 dark:border-stone-800/80">
              <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
                Yeni Tartı Girişi
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="bg-[#FAF7F5] dark:bg-[#181514] border border-stone-200/80 dark:border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
                />
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Kilo (örn: 94.5)"
                  value={inputWeight}
                  onChange={(e) => setInputWeight(e.target.value)}
                  className="bg-[#FAF7F5] dark:bg-[#181514] border border-stone-200/80 dark:border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
                />
              </div>
              <button
                type="submit"
                disabled={savingWeight}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-2xs shadow-rose-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>{savingWeight ? "Kaydediliyor..." : "Tartıyı Kaydet"}</span>
              </button>
            </form>

            <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800/80">
              <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 block">
                Geçmiş Ölçümler ({sortedWeights.length})
              </span>

              {weightsLoading ? (
                <div className="text-center py-4 text-stone-400 text-xs">Yükleniyor...</div>
              ) : sortedWeights.length === 0 ? (
                <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-3">
                  Henüz tartı kaydı eklenmemiş.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {sortedWeights.map((item, idx) => {
                    const nextItem = sortedWeights[idx + 1];
                    const diffFromNext = nextItem 
                      ? (nextItem.weight - item.weight).toFixed(1) 
                      : (START_WEIGHT - item.weight).toFixed(1);

                    return (
                      <div
                        key={item.id}
                        className="bg-[#FAF7F5]/80 dark:bg-[#181514]/60 border border-stone-100 dark:border-stone-800/80 rounded-xl p-2.5 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold text-stone-800 dark:text-stone-100">
                            {item.weight} kg
                          </span>
                          <span className="text-[10px] text-stone-400 dark:text-stone-500 block">
                            {format(new Date(item.date), "d MMMM yyyy", { locale: tr })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                            parseFloat(diffFromNext) > 0
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                              : parseFloat(diffFromNext) < 0
                              ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                              : "bg-stone-100 dark:bg-stone-800 text-stone-500"
                          }`}>
                            {parseFloat(diffFromNext) > 0 ? `-${diffFromNext}` : parseFloat(diffFromNext) < 0 ? `+${Math.abs(diffFromNext)}` : "0.0"} kg
                          </span>

                          <button
                            onClick={() => handleDeleteWeight(item.id)}
                            className="p-1 text-stone-300 dark:text-stone-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 2. YASAKLAR */}
        {activeMeal === "forbidden" && (
          <section className="bg-white dark:bg-[#231F1E] rounded-3xl p-5 border border-stone-100 dark:border-stone-800/80 shadow-2xs transition-all duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Ban size={19} />
                </div>
                <div>
                  <h2 className="font-extrabold text-stone-800 dark:text-stone-100 text-base tracking-tight">
                    Uzak Durulacaklar
                  </h2>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-tight mt-0.5">
                    İyileşme ve kilo verme sürecini sekteye uğratan gıdalar
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(dietConfig.forbidden || DEFAULT_FORBIDDEN).map((group, gIdx) => {
                const sortedItems = [...(group.items || [])].sort((a, b) => a.localeCompare(b, "tr"));
                return (
                  <div key={gIdx} className="bg-[#FAF7F5]/70 dark:bg-[#1C1817]/60 border border-stone-200/60 dark:border-stone-800/70 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-rose-600 dark:text-rose-400 text-xs tracking-wide">
                        {group.category}
                      </h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400">
                        {sortedItems.length} ürün
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {sortedItems.map((item, iIdx) => (
                        <div key={iIdx} className="bg-white dark:bg-[#231F1E] border border-stone-200/70 dark:border-stone-800 px-3.5 py-2.5 rounded-xl text-xs text-stone-700 dark:text-stone-200 font-medium shadow-2xs flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="leading-snug">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. KURALLAR */}
        {activeMeal === "rules" && (
          <section className="bg-white dark:bg-[#231F1E] rounded-3xl p-5 border border-stone-100 dark:border-stone-800/80 shadow-2xs transition-all duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <BookOpen size={19} />
                </div>
                <div>
                  <h2 className="font-extrabold text-stone-800 dark:text-stone-100 text-base tracking-tight">
                    Diyet Prensipleri
                  </h2>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-tight mt-0.5">
                    Mide sağlığını korumak ve kalıcı kilo vermek için temel kurallar
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {dietConfig.warnings.map((w, idx) => (
                <div key={idx} className="bg-[#FAF7F5]/70 dark:bg-[#1C1817]/60 border border-stone-100 dark:border-stone-800/80 rounded-2xl p-3.5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-xl bg-white dark:bg-[#231F1E] border border-rose-200/80 dark:border-rose-900/50 text-rose-500 dark:text-rose-400 text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-stone-700 dark:text-stone-200 leading-relaxed font-normal pt-0.5">
                    {w}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. ÖĞÜNLER */}
        {!["weight", "forbidden", "rules"].includes(activeMeal) && selectedMealData && (
          <section className={`bg-white dark:bg-[#231F1E] rounded-3xl p-5 border transition-all duration-200 shadow-2xs ${
            isSelectedMealDone ? "border-rose-200 dark:border-rose-900/50 shadow-rose-950/5" : "border-stone-100 dark:border-stone-800/80"
          }`}>
            <div className="mb-3.5 space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  isSelectedMealDone ? "bg-rose-500 text-white shadow-xs shadow-rose-500/30" : "bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400"
                }`}>
                  {React.createElement(selectedMealIcon, { size: 19 })}
                </div>

                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h2 className="font-extrabold text-stone-800 dark:text-stone-100 text-base tracking-tight">
                    {selectedMealData.title}
                  </h2>
                  
                  {selectedMealData.image && (
                    <button
                      onClick={() => setPreviewImage(selectedMealData.image)}
                      className="inline-flex items-center gap-1 bg-stone-50 dark:bg-stone-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-600 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 border border-stone-200/80 dark:border-stone-700/80 hover:border-rose-200 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                    >
                      <Camera size={11} className="text-rose-500 dark:text-rose-400" />
                      <span>Örnek</span>
                    </button>
                  )}
                </div>
              </div>

              {selectedMealData.note && (
                <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-relaxed pl-1 w-full">
                  {selectedMealData.note}
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              {selectedMealData.options.map((opt, idx) => {
                const isSelected = selections[selectedMealData.id] === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(selectedMealData.id, idx)}
                    className={`cursor-pointer text-xs p-3.5 rounded-2xl border transition-all duration-150 flex items-start gap-3 ${
                      isSelected
                        ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-950 dark:text-rose-100 font-semibold shadow-2xs"
                        : "bg-[#FAF7F5]/50 dark:bg-[#1C1817]/60 border-stone-100 dark:border-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#282220]"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? "border-rose-500 bg-rose-500 text-white shadow-2xs" : "border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800"
                    }`}>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="leading-snug pt-0.2">{opt}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Sayfayla Birlikte Kayan Alt Menü */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white/95 dark:bg-[#231F1E]/95 backdrop-blur-md border border-stone-100 dark:border-stone-800 shadow-xl shadow-stone-900/5 dark:shadow-black/30 rounded-3xl p-1.5 flex items-center justify-around z-40 transition-colors duration-300">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeMeal === item.id;
          const isDone = selections[item.id] !== undefined;

          return (
            <button
              key={item.id}
              onClick={() => setActiveMeal(item.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-4 rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive 
                  ? "bg-rose-500 text-white shadow-sm shadow-rose-500/30" 
                  : "text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
              }`}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {isDone && (
                  <span className={`absolute -top-1 -right-1.5 w-2 h-2 rounded-full ring-2 ${
                    isActive ? "bg-emerald-300 ring-rose-500" : "bg-emerald-500 ring-white dark:ring-[#231F1E]"
                  }`} />
                )}
              </div>
              <span className={`text-[11px] tracking-tight mt-1 font-semibold ${
                isActive ? "text-white" : "text-stone-500 dark:text-stone-400"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Süzülen Kalp */}
      {heartMode === "wandering" && (
        <div 
          ref={heartRef}
          onClick={handleHeartClick}
          className="fixed top-0 left-0 z-50 cursor-pointer select-none active:scale-90 will-change-transform"
          title="Sana bir sürpriz var! Dokun"
        >
          <div className="relative group">
            <div className="absolute -inset-2.5 bg-rose-400/30 rounded-full blur-md animate-pulse" />
            <div className="w-13 h-13 bg-gradient-to-tr from-rose-500 to-pink-400 text-white rounded-full flex items-center justify-center shadow-xl shadow-rose-500/40 border-2 border-white/90">
              <Heart size={26} className="fill-white animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
            </span>
          </div>
        </div>
      )}

      {/* YENİ MEKTUP MODALI: Üst Mühür Tam Görünür + Genişletilmiş ve Minimalist Okuma Alanı */}
      {showLetterModal && (
        <div 
          className="fixed inset-0 z-50 bg-stone-950/75 dark:bg-black/90 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setShowLetterModal(false)}
        >
          <div 
            className="animate-letter-open relative max-w-lg w-full bg-[#FAF6F0] dark:bg-[#1E1816] rounded-3xl p-5 sm:p-6 pt-9 shadow-2xl border border-rose-200/80 dark:border-stone-800 transition-colors duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arka Plan Romantik Filigran */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className="absolute -right-8 -bottom-8 opacity-[0.03] dark:opacity-[0.04]">
                <Heart size={260} className="fill-rose-500" />
              </div>
            </div>

            {/* Tam Daire Balmumu Mühür (Kesilme tamamen engellendi) */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800 shadow-md shadow-rose-950/50 border-2 border-rose-200/70 flex items-center justify-center ring-4 ring-[#FAF6F0] dark:ring-[#1E1816]">
                <Heart size={20} className="fill-white text-rose-100 drop-shadow-xs" />
              </div>
            </div>

            {/* Kapat Butonu */}
            <button
              onClick={() => setShowLetterModal(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 bg-stone-200/60 dark:bg-stone-800/80 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 rounded-full flex items-center justify-center transition-colors shadow-2xs z-30"
              title="Kapat"
            >
              <X size={15} />
            </button>

            {/* Minimalist Mektup Başlığı */}
            <div className="flex items-center justify-between border-b border-rose-200/50 dark:border-rose-900/40 pb-2 mb-3 pr-8">
              <span className="text-sm font-serif font-bold text-stone-800 dark:text-rose-100 flex items-center gap-1">
                <span>Canım Eşime,</span>
                <span className="text-xs font-normal">🌸</span>
              </span>

              <span className="text-[10px] sm:text-[11px] font-serif italic text-stone-400 dark:text-stone-500">
                {format(new Date(), "d MMMM yyyy", { locale: tr })}
              </span>
            </div>

            {/* GENİŞ VE FERAH METİN ALANI (Uzun Yazılar İçin 65vh Scroll) */}
            <div className="relative bg-white/80 dark:bg-[#251F1D]/90 rounded-2xl p-4 sm:p-5 border border-rose-100/80 dark:border-stone-800/80 shadow-2xs">
              <div className="max-h-[62vh] overflow-y-auto pr-1 letter-scroll">
                <p className="text-[15px] sm:text-[16px] leading-[1.85] font-serif text-stone-800 dark:text-stone-100 whitespace-pre-line tracking-normal select-text">
                  {currentLoveNote}
                </p>
                
                {/* İmza Satırı */}
                <div className="mt-4 pt-2 border-t border-rose-100/60 dark:border-stone-800/60 text-right">
                  <span className="text-xs font-serif italic text-rose-500 dark:text-rose-400 font-medium">
                    — Daima kalbimdesin... ❤️
                  </span>
                </div>
              </div>
            </div>

            {/* Sade ve İnce Kapatma Butonu */}
            <div className="mt-3.5 flex justify-center">
              <button
                onClick={() => setShowLetterModal(false)}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-xl text-xs font-semibold shadow-xs shadow-rose-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>Mektubu Sakla</span>
                <span>💌</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {isAdminOpen && (
        <AdminPanel
          initialData={dietConfig}
          onClose={() => setIsAdminOpen(false)}
          onSaveSuccess={(newData) => setDietConfig(newData)}
        />
      )}

      {/* Tabak Görseli Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-5 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-sm w-full bg-white dark:bg-[#231F1E] rounded-3xl overflow-hidden shadow-2xl border border-stone-100 dark:border-stone-800 p-2" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-3 py-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-200">Örnek Tabak Sunumu</span>
              <button 
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <img 
              src={`${import.meta.env.BASE_URL}images/${previewImage}`} 
              alt="Örnek Tabak"
              className="w-full max-h-[70vh] object-cover rounded-2xl"
              onError={(e) => {
                e.target.style.display = 'none';
                alert("Görsel bulunamadı.");
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
