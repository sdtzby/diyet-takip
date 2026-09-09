import React, { useState, useEffect } from "react";
import { auth, db, ADMIN_UID } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DIET_DATA } from "./data/dietData";
import AdminPanel from "./components/AdminPanel";
import { format, addDays, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  ChevronLeft, ChevronRight, Sparkles, LogOut, 
  Check, Settings, Camera, X, Sun, Moon, Coffee, BookOpen 
} from "lucide-react";

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
  const [showRules, setShowRules] = useState(false);
  const [activeMeal, setActiveMeal] = useState(getCurrentMealByHour());

  // Karanlık Mod Yönetimi & Kalıcı Hafıza
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
  const isAdmin = user && user.uid === ADMIN_UID;

  const totalMeals = dietConfig.meals.length;
  const completedMeals = Object.keys(selections).filter(k => selections[k] !== undefined).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    const isWife = user?.email?.toLowerCase().includes("cigdem");
    const name = isWife ? "Çiğdem 🌸" : "Sedat";

    if (hour >= 5 && hour < 12) {
      return { 
        word: "Günaydın",
        name: name,
        sub: isWife ? "Güne enerjik ve hafif bir başlangıç yap" : "Günün ilk ritmi başlıyor" 
      };
    } else if (hour >= 12 && hour < 18) {
      return { 
        word: "Tünaydın",
        name: name,
        sub: isWife ? "Harika gidiyorsun, su içmeyi unutma 💧" : "Dengeni korumaya devam et" 
      };
    } else if (hour >= 18 && hour < 23) {
      return { 
        word: "İyi Akşamlar",
        name: name,
        sub: isWife ? "Hafif bir akşamla günü tamamla ✨" : "Akşam dengesini koru" 
      };
    } else {
      return { 
        word: "Huzurlu Geceler",
        name: name,
        sub: "Güzelce dinlenip enerjini topla 🌙" 
      };
    }
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
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Kaydetme hatası:", err);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F5] dark:bg-[#181514] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-2 border-rose-200 dark:border-rose-900 border-t-rose-500 rounded-full animate-spin" />
        <span className="text-[11px] tracking-widest text-stone-400 uppercase font-medium">Yükleniyor</span>
      </div>
    );
  }

  // Giriş Ekranı
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

  const selectedMealData = dietConfig.meals.find((m) => m.id === activeMeal) || dietConfig.meals[0];
  const selectedMealIcon = MEAL_ICONS[selectedMealData?.id] || Sparkles;
  const isSelectedMealDone = selectedMealData && selections[selectedMealData.id] !== undefined;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAF7F5] dark:bg-[#181514] pb-28 flex flex-col font-sans text-stone-800 dark:text-stone-100 select-none transition-colors duration-300">
      
      {/* Minimal Editöryal Üst Alan */}
      <header className="px-6 pt-7 pb-4 bg-[#FAF7F5] dark:bg-[#181514] transition-colors duration-300">
        {/* Üst Sıra: Tarih ve Eylemler */}
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

            {/* Karanlık Mod Değiştirici */}
            <button 
              onClick={() => setIsDark(!isDark)} 
              className="text-stone-400 dark:text-stone-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-0.5"
              title={isDark ? "Aydınlık Moda Geç" : "Karanlık Moda Geç"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Çıkış Butonu */}
            <button 
              onClick={() => signOut(auth)} 
              className="text-stone-400 dark:text-stone-500 hover:text-rose-600 transition-colors"
              title="Çıkış"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Orta Sıra: Selamlama & 4 Mikro Nokta */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-light tracking-tight text-stone-800 dark:text-stone-100 truncate">
            {greeting.word},{" "}
            <span className="font-semibold text-rose-500 dark:text-rose-400 whitespace-nowrap">
              {greeting.name}
            </span>
          </h1>

          <div className="flex items-center gap-1.5 shrink-0" title={`${completedMeals}/${totalMeals} Öğün Tamamlandı`}>
            {NAV_ITEMS.map((item) => (
              <div 
                key={item.id} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  selections[item.id] !== undefined 
                    ? "bg-rose-500 scale-110 shadow-xs shadow-rose-500/50" 
                    : "bg-stone-200 dark:bg-stone-800"
                }`} 
              />
            ))}
          </div>
        </div>

        {/* Alt Sıra: İpucu & Kurallar Butonu */}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-stone-400 dark:text-stone-500 font-normal truncate mr-2">
            {greeting.sub}
          </p>
          <button
            onClick={() => setShowRules(true)}
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-[#231F1E] border border-stone-200/80 dark:border-stone-800 px-2.5 py-1 rounded-full shadow-2xs transition-all active:scale-95"
          >
            <BookOpen size={11} className="text-rose-400" />
            <span>Kurallar</span>
          </button>
        </div>
      </header>

      {/* Ana İçerik: Sadece Seçilen Tek Öğün */}
      <main className="px-5 pt-2 flex-1">
        {selectedMealData && (
          <section 
            className={`bg-white dark:bg-[#231F1E] rounded-3xl p-5 border transition-all duration-200 shadow-2xs ${
              isSelectedMealDone 
                ? "border-rose-200 dark:border-rose-900/50 shadow-rose-950/5" 
                : "border-stone-100 dark:border-stone-800/80"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  isSelectedMealDone 
                    ? "bg-rose-500 text-white shadow-xs shadow-rose-500/30" 
                    : "bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400"
                }`}>
                  {React.createElement(selectedMealIcon, { size: 19 })}
                </div>
                <div>
                  <h2 className="font-extrabold text-stone-800 dark:text-stone-100 text-base tracking-tight">
                    {selectedMealData.title}
                  </h2>
                  {selectedMealData.note && (
                    <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-tight mt-0.5">
                      {selectedMealData.note}
                    </p>
                  )}
                </div>
              </div>

              {selectedMealData.image && (
                <button
                  onClick={() => setPreviewImage(selectedMealData.image)}
                  className="flex items-center gap-1 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200/70 dark:border-stone-700/80 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-colors active:scale-95"
                >
                  <Camera size={13} className="text-rose-500 dark:text-rose-400" />
                  <span>Örnek</span>
                </button>
              )}
            </div>

            {/* Öğün Seçenekleri */}
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
                      isSelected 
                        ? "border-rose-500 bg-rose-500 text-white shadow-2xs" 
                        : "border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800"
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

      {/* Alt Sabit Menü */}
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

      {/* Kurallar Modali */}
      {showRules && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setShowRules(false)}
        >
          <div 
            className="bg-white dark:bg-[#231F1E] rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-stone-100 dark:border-stone-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-200">Diyet Prensipleri</span>
              <button 
                onClick={() => setShowRules(false)} 
                className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <ul className="text-xs text-stone-600 dark:text-stone-300 space-y-3 leading-relaxed">
              {dietConfig.warnings.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-rose-500 text-sm leading-none">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
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
