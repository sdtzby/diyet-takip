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
  Check, Settings, Camera, X, Sun, Moon, Coffee, HeartHandshake 
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
  const [activeMeal, setActiveMeal] = useState(getCurrentMealByHour());

  // Giriş form alanları
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const dateKey = format(currentDate, "yyyy-MM-dd");
  const isAdmin = user && user.uid === ADMIN_UID;

  // İlerleme hesabı
  const totalMeals = dietConfig.meals.length;
  const completedMeals = Object.keys(selections).filter(k => selections[k] !== undefined).length;
  const progressPercent = totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0;

  // Saate ve kullanıcıya göre dinamik selamlama
  const getGreeting = () => {
    const hour = new Date().getHours();
    const isWife = user?.email?.toLowerCase().includes("cigdem");
    const name = isWife ? "Çiğdem 🌸" : "Sedat";

    if (hour >= 5 && hour < 12) {
      return { 
        title: `Günaydın, ${name}`, 
        sub: isWife ? "Güne enerjik ve hafif bir başlangıç yap" : "Günün ilk ritmi başlıyor" 
      };
    } else if (hour >= 12 && hour < 18) {
      return { 
        title: `Tünaydın, ${name}`, 
        sub: isWife ? "Harika gidiyorsun, su içmeyi unutma 💧" : "Dengeni korumaya devam et" 
      };
    } else if (hour >= 18 && hour < 23) {
      return { 
        title: `İyi Akşamlar, ${name}`, 
        sub: isWife ? "Hafif bir akşamla günü tamamla ✨" : "Akşam dengesini koru" 
      };
    } else {
      return { 
        title: `Huzurlu Geceler, ${name}`, 
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
        console.error("Menü yüklenirken hata:", err);
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
      <div className="min-h-screen bg-[#FAF7F5] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        <span className="text-xs tracking-wider text-stone-500 font-medium">Günlüğün Hazırlanıyor...</span>
      </div>
    );
  }

  // Giriş Ekranı
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF5F2] via-[#FAF7F5] to-[#F3EDE8] flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl shadow-rose-900/5 border border-rose-100">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-rose-500 shadow-xs">
              <Sparkles size={22} />
            </div>
            <h1 className="text-xl font-bold text-stone-800 tracking-tight">Diyet & Yaşam Ritmi</h1>
            <p className="text-xs text-stone-500 mt-1">Günün menüsünü takip etmeye başla</p>
          </div>

          {authError && (
            <div className="text-rose-700 text-xs mb-4 bg-rose-50/80 p-3 rounded-xl border border-rose-200/60 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5 ml-1">E-Posta</label>
              <input
                type="email"
                required
                className="w-full bg-stone-50/70 border border-stone-200 rounded-2xl px-4 py-3 text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                value={email}
                placeholder="ornek@hesap.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5 ml-1">Şifre</label>
              <input
                type="password"
                required
                className="w-full bg-stone-50/70 border border-stone-200 rounded-2xl px-4 py-3 text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold py-3.5 rounded-2xl shadow-lg shadow-rose-500/25 transition-all active:scale-[0.98]"
            >
              Uygulamaya Gir
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Şu an seçili olan tek öğün nesnesi
  const selectedMealData = dietConfig.meals.find((m) => m.id === activeMeal) || dietConfig.meals[0];
  const selectedMealIcon = MEAL_ICONS[selectedMealData?.id] || Sparkles;
  const isSelectedMealDone = selectedMealData && selections[selectedMealData.id] !== undefined;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAF7F5] pb-28 flex flex-col font-sans text-stone-800 select-none">
      
      {/* Üst Bar & Dinamik Selamlama */}
      <header className="sticky top-0 z-30 bg-[#FAF7F5]/90 backdrop-blur-md px-5 pt-4 pb-3 border-b border-stone-200/50">
        {/* Minimalist & Akıcı Üst Bar */}
      <header className="sticky top-0 z-30 bg-[#FAF7F5]/90 backdrop-blur-md px-5 pt-5 pb-3 border-b border-stone-200/40">
        {/* Selamlama & Profil Butonları */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-[12px] font-medium text-rose-500/90 tracking-wide">
              {greeting.sub}
            </p>
            <h1 className="text-xl font-bold text-stone-800 tracking-tight mt-0.5">
              {greeting.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-1 bg-white/70 p-1 rounded-2xl border border-stone-200/50 shadow-xs">
            {isAdmin && (
              <button 
                onClick={() => setIsAdminOpen(true)} 
                className="w-7 h-7 rounded-xl text-stone-400 hover:text-stone-800 hover:bg-stone-100 flex items-center justify-center transition-all"
                title="Yönetici Paneli"
              >
                <Settings size={15} />
              </button>
            )}
            <button 
              onClick={() => signOut(auth)} 
              className="w-7 h-7 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-stone-100 flex items-center justify-center transition-all"
              title="Çıkış"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Tarih & 4 Segmentli Hikaye Tarzı İlerleme Çubuğu */}
        <div className="bg-white/90 border border-stone-200/70 rounded-2xl p-2.5 px-3.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setCurrentDate(subDays(currentDate, 1))} 
              className="w-6 h-6 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-700 capitalize">
                {format(currentDate, "d MMMM yyyy, EEEE", { locale: tr })}
              </span>
              <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.2 rounded-md">
                {completedMeals}/4
              </span>
            </div>

            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 1))} 
              className="w-6 h-6 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 4 Öğün İçin Ayrı Segmentler (Sabah, Öğle, Ara, Akşam) */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {NAV_ITEMS.map((item) => {
              const isDone = selections[item.id] !== undefined;
              return (
                <div key={item.id} className="group relative">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      isDone 
                        ? "bg-rose-500 shadow-xs shadow-rose-500/30" 
                        : "bg-stone-100"
                    }`} 
                  />
                </div>
              );
            })}
          </div>
        </div>
      </header>
      </header>

      {/* Ana İçerik */}
      <main className="p-4 space-y-4 flex-1">
        
        {/* Hatırlatıcı Kurallar Kartı */}
        <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 border border-amber-200/60 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider mb-2">
            <div className="p-1 bg-amber-200/50 rounded-lg text-amber-700">
              <HeartHandshake size={14} />
            </div>
            <span>Günün Hatırlatıcıları</span>
          </div>
          <ul className="text-xs text-amber-950/80 space-y-1.5 pl-2 leading-relaxed">
            {dietConfig.warnings.map((w, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 text-sm leading-none">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sadece Seçili Olan Tek Öğün Görünür */}
        {selectedMealData && (
          <section 
            className={`bg-white rounded-3xl p-4 border transition-all duration-300 shadow-xs animate-in fade-in zoom-in-95 ${
              isSelectedMealDone ? "border-rose-200 shadow-rose-950/5" : "border-stone-200/60"
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${
                  isSelectedMealDone ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-500"
                }`}>
                  {React.createElement(selectedMealIcon, { size: 18 })}
                </div>
                <div>
                  <h2 className="font-extrabold text-stone-800 text-sm tracking-tight">{selectedMealData.title}</h2>
                  {selectedMealData.note && <p className="text-[11px] text-stone-400 leading-tight">{selectedMealData.note}</p>}
                </div>
              </div>

              {selectedMealData.image && (
                <button
                  onClick={() => setPreviewImage(selectedMealData.image)}
                  className="flex items-center gap-1 bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200/70 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-colors active:scale-95"
                >
                  <Camera size={13} className="text-rose-500" />
                  <span>Örnek</span>
                </button>
              )}
            </div>

            {/* Seçenekler */}
            <div className="space-y-2.5 pt-1">
              {selectedMealData.options.map((opt, idx) => {
                const isSelected = selections[selectedMealData.id] === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(selectedMealData.id, idx)}
                    className={`cursor-pointer text-xs p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 ${
                      isSelected
                        ? "bg-rose-50/90 border-rose-300 text-rose-950 font-semibold shadow-xs"
                        : "bg-[#FAF7F5]/50 border-stone-100 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                      isSelected 
                        ? "border-rose-500 bg-rose-500 text-white shadow-xs" 
                        : "border-stone-300 bg-white"
                    }`}>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="leading-snug">{opt}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Alt Sabit Menü */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white/90 backdrop-blur-md border border-rose-100/90 shadow-xl shadow-rose-950/10 rounded-3xl p-1.5 flex items-center justify-around z-40">
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
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/30" 
                  : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
              }`}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {isDone && (
                  <span className={`absolute -top-1 -right-1.5 w-2 h-2 rounded-full ring-2 ${
                    isActive ? "bg-emerald-300 ring-rose-500" : "bg-emerald-500 ring-white"
                  }`} />
                )}
              </div>
              <span className={`text-[11px] tracking-tight mt-1 font-bold ${
                isActive ? "text-white" : "text-stone-600"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

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
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-5 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-sm w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-rose-100 p-2" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-3 py-2">
              <span className="text-xs font-bold text-stone-700">Örnek Tabak Sunumu</span>
              <button 
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full flex items-center justify-center transition-colors"
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
