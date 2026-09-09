import React, { useState, useEffect } from "react";
import { auth, db, ADMIN_UID } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DIET_DATA } from "./data/dietData";
import AdminPanel from "./components/AdminPanel";
import { format, addDays, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  ChevronLeft, ChevronRight, AlertCircle, LogOut, 
  CheckCircle2, Settings, Image as ImageIcon, X 
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dietConfig, setDietConfig] = useState(DIET_DATA);
  const [selections, setSelections] = useState({});
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Giriş form alanları
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const dateKey = format(currentDate, "yyyy-MM-dd");
  const isAdmin = user && user.uid === ADMIN_UID;

  // 1. Auth Takibi
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Diyet Şablonunu Firestore'dan Çek (Yoksa varsayılanı yükle)
  useEffect(() => {
    if (!user) return;
    const fetchDietConfig = async () => {
      try {
        const docRef = doc(db, "config", "diet_data");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setDietConfig(snap.data());
        } else if (isAdmin) {
          // İlk açılışta veritabanı boşsa varsayılan veriyi yaz
          await setDoc(docRef, DIET_DATA);
        }
      } catch (err) {
        console.error("Menü yüklenirken hata:", err);
      }
    };
    fetchDietConfig();
  }, [user, isAdmin]);

  // 3. Seçili Günün Tercihlerini Çek
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

  // Seçim Güncelleme
  const handleSelect = async (mealId, optionIndex) => {
    const updated = { ...selections, [mealId]: optionIndex };
    setSelections(updated);
    if (!user) return;
    try {
      await setDoc(doc(db, "logs", user.uid, "days", dateKey), {
        meals: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Kaydetme hatası:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setAuthError("Giriş başarısız. Bilgileri kontrol et.");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium">Yükleniyor...</div>;
  }

  // Giriş Ekranı
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
          <h1 className="text-xl font-bold mb-4 text-center text-slate-800">Diyet Takip Sistemi</h1>
          {authError && <div className="text-red-600 text-xs mb-3 bg-red-50 p-2.5 rounded-lg">{authError}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">E-Posta</label>
              <input
                type="email"
                required
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Şifre</label>
              <input
                type="password"
                required
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-slate-800 transition-colors">
              Giriş Yap
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-12 flex flex-col bg-slate-50">
      {/* Üst Bar & Tarih Gezgini */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-10 px-4 py-3 shadow-2xs">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-slate-900">Diyet Günlüğüm</span>
            {isAdmin && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button 
                onClick={() => setIsAdminOpen(true)} 
                title="Diyeti Yönet"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Settings size={18} />
              </button>
            )}
            <button 
              onClick={() => signOut(auth)} 
              title="Çıkış Yap"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-100">
          <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-1.5 hover:bg-white rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-semibold capitalize text-slate-700">
            {format(currentDate, "d MMMM yyyy, EEEE", { locale: tr })}
          </span>
          <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1.5 hover:bg-white rounded-lg transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* İçerik */}
      <main className="p-4 space-y-5 flex-1">
        {/* Uyarılar Kartı */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider">
            <AlertCircle size={15} />
            <span>Kritik Kurallar</span>
          </div>
          <ul className="text-xs text-amber-900 space-y-1 list-disc pl-4 leading-relaxed">
            {dietConfig.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>

        {/* Öğün Listesi */}
        {dietConfig.meals.map((meal) => {
          const selectedIdx = selections[meal.id];
          return (
            <section key={meal.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex justify-between items-start mb-2.5">
                <div>
                  <h2 className="font-bold text-slate-800 text-sm tracking-wide">{meal.title}</h2>
                  {meal.note && <p className="text-[11px] text-slate-500 mt-0.5">{meal.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {selectedIdx !== undefined && (
                    <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Seçildi
                    </span>
                  )}
                  {meal.image && (
                    <button
                      onClick={() => setPreviewImage(meal.image)}
                      title="Örnek Tabağı Gör"
                      className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <ImageIcon size={17} />
                    </button>
                  )}
                </div>
              </div>

              {/* Seçenekler */}
              <div className="space-y-2">
                {meal.options.map((opt, idx) => {
                  const isSelected = selectedIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelect(meal.id, idx)}
                      className={`cursor-pointer text-xs p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white font-medium shadow-2xs"
                          : "border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-white bg-white" : "border-slate-300"
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-slate-900" />}
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
            >
              <X size={18} />
            </button>
            <img 
              src={`${import.meta.env.BASE_URL}images/${previewImage}`} 
              alt="Örnek Tabak"
              className="w-full h-auto rounded-xl object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                alert("Görsel henüz public/images/ klasörüne eklenmemiş.");
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}