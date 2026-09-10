import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy 
} from "firebase/firestore";
import { 
  ArrowLeft, Plus, Trash2, TrendingDown, Calendar, Sparkles, Scale, Heart 
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const START_WEIGHT = 102.0;
const SURGERY_DATE = new Date("2026-08-07T00:00:00");

export default function WeightTracker({ user, onBack }) {
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputWeight, setInputWeight] = useState("");
  const [inputDate, setInputDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  // Firestore gerçek zamanlı veri dinleyici
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
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Yeni kilo kaydet
  const handleAddWeight = async (e) => {
    e.preventDefault();
    const val = parseFloat(inputWeight.replace(",", "."));
    if (isNaN(val) || val <= 0) return;

    setSaving(true);
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
      setSaving(false);
    }
  };

  // Kilo kaydı sil
  const handleDelete = async (id) => {
    if (!window.confirm("Bu tartı kaydını silmek istediğine emin misin?")) return;
    try {
      await deleteDoc(doc(db, "logs", user.uid, "weights", id));
    } catch (err) {
      console.error("Kayıt silinemedi:", err);
    }
  };

  // İstatistiksel Hesaplamalar
  const sortedWeights = [...weights].sort((a, b) => new Date(b.date) - new Date(a.date));
  const currentWeight = sortedWeights.length > 0 ? sortedWeights[0].weight : START_WEIGHT;
  const prevWeight = sortedWeights.length > 1 ? sortedWeights[1].weight : START_WEIGHT;

  const totalLost = (START_WEIGHT - currentWeight).toFixed(1);
  const lastDiff = (prevWeight - currentWeight).toFixed(1);

  // Ameliyattan bugüne geçen gün
  const today = new Date();
  const diffTime = today.getTime() - SURGERY_DATE.getTime();
  const daysSinceSurgery = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAF7F5] dark:bg-[#181514] pb-16 flex flex-col font-sans text-stone-800 dark:text-stone-100 select-none transition-colors duration-300">
      
      {/* Üst Bar */}
      <header className="px-6 pt-7 pb-4 bg-[#FAF7F5] dark:bg-[#181514] border-b border-stone-200/50 dark:border-stone-800/80">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors -ml-1 text-xs font-semibold"
          >
            <ArrowLeft size={17} />
            <span>Günlüğe Dön</span>
          </button>
          <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest">
            Değişim Yolculuğu
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
              Kilo Takibi
            </h1>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
              Başlangıç: <span className="font-semibold text-stone-600 dark:text-stone-300">{START_WEIGHT} kg</span> (7 Ağustos)
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center">
            <Scale size={20} />
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="p-5 space-y-5 flex-1">
        
        {/* Motive Edici İstatistik Kartları */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Toplam Verilen */}
          <div className="bg-white dark:bg-[#231F1E] border border-rose-100 dark:border-stone-800/80 rounded-2xl p-3 shadow-2xs text-center flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
              Toplam
            </span>
            <div className="my-1 text-rose-500 dark:text-rose-400 font-extrabold text-lg tracking-tight flex items-center justify-center gap-0.5">
              <TrendingDown size={15} />
              <span>{totalLost > 0 ? `-${totalLost}` : "0.0"}</span>
            </div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">kg verildi</span>
          </div>

          {/* Son Tartı Farkı */}
          <div className="bg-white dark:bg-[#231F1E] border border-rose-100 dark:border-stone-800/80 rounded-2xl p-3 shadow-2xs text-center flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
              Son Tartı
            </span>
            <div className="my-1 text-emerald-600 dark:text-emerald-400 font-extrabold text-lg tracking-tight">
              {lastDiff > 0 ? `-${lastDiff}` : lastDiff < 0 ? `+${Math.abs(lastDiff)}` : "0.0"}
            </div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">kg fark</span>
          </div>

          {/* Geçen Gün */}
          <div className="bg-white dark:bg-[#231F1E] border border-rose-100 dark:border-stone-800/80 rounded-2xl p-3 shadow-2xs text-center flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
              Yolculuk
            </span>
            <div className="my-1 text-stone-800 dark:text-stone-100 font-extrabold text-lg tracking-tight flex items-center justify-center gap-0.5">
              <Heart size={14} className="text-rose-400" />
              <span>{daysSinceSurgery}</span>
            </div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">gün oldu</span>
          </div>
        </div>

        {/* Güncel Kilo Vurgusu */}
        {sortedWeights.length > 0 && (
          <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-3xl p-4 text-white shadow-md shadow-rose-500/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-rose-100 font-semibold block">
                Son Ölçülen Kilo
              </span>
              <div className="text-2xl font-black tracking-tight mt-0.5">
                {currentWeight} <span className="text-sm font-normal text-rose-100">kg</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-white font-medium">
                {format(new Date(sortedWeights[0].date), "d MMMM", { locale: tr })}
              </span>
            </div>
          </div>
        )}

        {/* Yeni Kilo Giriş Formu */}
        <section className="bg-white dark:bg-[#231F1E] rounded-3xl p-4 border border-stone-100 dark:border-stone-800 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-stone-700 dark:text-stone-200 block">
            Yeni Tartı Kaydı Ekle
          </span>
          <form onSubmit={handleAddWeight} className="flex gap-2">
            <input
              type="date"
              required
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className="bg-stone-50 dark:bg-[#181514] border border-stone-200 dark:border-stone-700/80 rounded-2xl px-3 py-2 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
            />
            <input
              type="number"
              step="0.1"
              required
              placeholder="Kilo (örn: 94.5)"
              value={inputWeight}
              onChange={(e) => setInputWeight(e.target.value)}
              className="flex-1 bg-stone-50 dark:bg-[#181514] border border-stone-200 dark:border-stone-700/80 rounded-2xl px-3 py-2 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-xs shadow-rose-500/25 transition-all active:scale-95 disabled:opacity-50 shrink-0 flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Ekle</span>
            </button>
          </form>
        </section>

        {/* Geçmiş Kayıtlar Listesi */}
        <section className="space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Tartı Geçmişi ({sortedWeights.length})
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-stone-400 text-xs">Kayıtlar yükleniyor...</div>
          ) : sortedWeights.length === 0 ? (
            <div className="bg-white dark:bg-[#231F1E] rounded-2xl p-6 text-center border border-dashed border-stone-200 dark:border-stone-800 text-xs text-stone-400">
              Henüz bir tartı kaydı eklemediniz. İlk kilonuzu yukarıdan girebilirsiniz.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedWeights.map((item, idx) => {
                const nextItem = sortedWeights[idx + 1];
                const diffFromNext = nextItem 
                  ? (nextItem.weight - item.weight).toFixed(1) 
                  : (START_WEIGHT - item.weight).toFixed(1);

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#231F1E] border border-stone-100 dark:border-stone-800/80 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-stone-50 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 flex items-center justify-center text-xs font-bold">
                        {sortedWeights.length - idx}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-800 dark:text-stone-100">
                          {item.weight} kg
                        </div>
                        <div className="text-[11px] text-stone-400 dark:text-stone-500">
                          {format(new Date(item.date), "d MMMM yyyy, EEEE", { locale: tr })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                        parseFloat(diffFromNext) > 0
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                          : parseFloat(diffFromNext) < 0
                          ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                          : "bg-stone-50 dark:bg-stone-800 text-stone-500"
                      }`}>
                        {parseFloat(diffFromNext) > 0 ? `-${diffFromNext} kg` : parseFloat(diffFromNext) < 0 ? `+${Math.abs(diffFromNext)} kg` : "0.0 kg"}
                      </span>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-stone-300 dark:text-stone-600 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors"
                        title="Kaydı Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
