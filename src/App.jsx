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

// Öğün ikonları eşleştirmesi
const MEAL_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  snack: Sparkles,
  dinner: Moon,
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dietConfig, setDietConfig] = useState(DIET_DATA);
  const [selections, setSelections] = useState({});
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const dateKey = format(currentDate, "yyyy-MM-dd");
  const isAdmin = user && user.uid === ADMIN_UID;

  // Günün ilerleme yüzdesi
  const totalMeals = dietConfig.meals.length;
  const completedMeals = Object.keys(selections).filter(k => selections[k] !== undefined).length;
  const progressPercent = totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0;

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
    // Aynı seçeneğe tıklanırsa seçimi kaldırabilme esnekliği
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
      <div className="min-h-screen bg-linear-to-b from-[#FFF5F2] via-[#FAF7F5] to-[#F3EDE8] flex items-center justify-center p-5">
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
              className="w-full mt-2 bg-linear-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold py-3.5 rounded-2xl shadow-lg shadow-rose-500/25 transition-all active:scale-[0.98]"
            >
              Uygulamaya Gir
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAF7F5] pb-16 flex flex-col font-sans text-stone-800 select-none">
      
      {/* Üst Bar & Tarih Gezgini */}
      <header className="sticky top-0 z-30 bg-[#FAF7F5]/90 backdrop-blur-md px-5 pt-4 pb-3 border-b border-stone-200/50">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-widest block">
              Beslenme Rehberim
            </span>
            <h1 className="text-lg font-extrabold text-stone-800 tracking-tight">
              Günün Ritmi
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button 
                onClick={() => setIsAdminOpen(true)} 
                className="p-2 bg-white rounded-xl text-stone-600 hover:text-stone-900 shadow-xs border border-stone-200/60 active:scale-95 transition-all"
                title="Yönetici Paneli"
              >
                <Settings size={17} />
              </button>
            )}
            <button 
              onClick={() => signOut(auth)} 
              className="p-2 bg-white rounded-xl text-stone-400 hover:text-rose-600 shadow-xs border border-stone-200/60 active:scale-95 transition-all"
              title="Çıkış"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>

        {/* Tarih Değiştirici */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-1.5 shadow-xs border border-stone-200/60">
          <button 
            onClick={() => setCurrentDate(subDays(currentDate, 1))} 
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"
          >
            <ChevronLeft size={17} />
          </button>
          <span className="text-xs font-bold text-stone-700 capitalize">
            {format(currentDate, "d MMMM yyyy, EEEE", { locale: tr })}
          </span>
          <button 
            onClick={() => setCurrentDate(addDays(currentDate, 1))} 
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"
          >
            <ChevronRight size={17} />
          </button>
        </div>

        {/* İlerleme Çubuğu */}
        <div className="mt-3 bg-rose-50/80 border border-rose-100/80 rounded-2xl p-2.5 px-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-stone-600">Öğün Takibi</span>
              <span className="text-[11px] font-bold text-rose-600">{completedMeals} / {totalMeals}</span>
            </div>
            <div className="w-full h-1.5 bg-rose-200/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          {progressPercent === 100 && (
            <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shrink-0">
              GÜN TAMAM! ✨
            </span>
          )}
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="p-4 space-y-4 flex-1">
        
        {/* Altın Kurallar Kartı */}
        <div className="bg-linear-to-br from-amber-50/70 to-orange-50/50 border border-amber-200/60 rounded-3xl p-4 shadow-xs">
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

        {/* Öğün Listesi */}
        {dietConfig.meals.map((meal) => {
          const selectedIdx = selections[meal.id];
          const MealIcon = MEAL_ICONS[meal.id] || Sparkles;
          const isDone = selectedIdx !== undefined;

          return (
            <section 
              key={meal.id} 
              className={`bg-white rounded-3xl p-4 border transition-all duration-300 shadow-xs ${
                isDone ? "border-rose-200 shadow-rose-950/5" : "border-stone-200/60"
              }`}
            >
              {/* Öğün Başlığı */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${
                    isDone ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-500"
                  }`}>
                    <MealIcon size={18} />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-stone-800 text-sm tracking-tight">{meal.title}</h2>
                    {meal.note && <p className="text-[11px] text-stone-400 leading-tight">{meal.note}</p>}
                  </div>
                </div>

                {meal.image && (
                  <button
                    onClick={() => setPreviewImage(meal.image)}
                    className="flex items-center gap-1 bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200/70 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-colors active:scale-95"
                  >
                    <Camera size={13} className="text-rose-500" />
                    <span>Örnek</span>
                  </button>
                )}
              </div>

              {/* Seçenek Listesi */}
              <div className="space-y-2">
                {meal.options.map((opt, idx) => {
                  const isSelected = selectedIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelect(meal.id, idx)}
                      className={`cursor-pointer text-xs p-3 rounded-2xl border transition-all duration-200 flex items-start gap-3 ${
                        isSelected
                          ? "bg-rose-50/90 border-rose-300 text-rose-950 font-semibold shadow-xs"
                          : "bg-[#FAF7F5]/50 border-stone-100 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {/* Checkbox Dairesi */}
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
          );
        })}
      </main>

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
