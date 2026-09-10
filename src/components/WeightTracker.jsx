import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy 
} from "firebase/firestore";
import { 
  ChevronLeft, Plus, Trash2, TrendingDown, Sparkles, Scale, Heart, Calendar 
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

  const handleDelete = async (id) => {
    if (!window.confirm("Bu tartı kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDoc(doc(db, "logs", user.uid, "weights", id));
    } catch (err) {
      console.error("Kayıt silinemedi:", err);
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAF7F5] dark:bg-[#181514] pb-20 flex flex-col font-sans text-stone-800 dark:text-stone-100 select-none overflow-x-hidden transition-colors duration-300">
      
      {/* Üst Bar: Ana Sayfa ile Birebir Hizada */}
      <header className="px-6 pt-7 pb-4 bg-[#FAF7F5] dark:bg-[#181514] transition-colors duration-300">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors -ml-1"
          >
            <ChevronLeft size={18} />
            <span>Günlüğe Dön</span>
          </button>
          
          <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-900/50">
            Değişim Yolculuğu
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
              Kilo Takibi
            </h1>
            <p className="text-xs text-stone-400 dark:text-stone-500 font-normal mt-0.5">
              Başlangıç: <span className="font-semibold text-stone-700 dark:text-stone-300">{START_WEIGHT} kg</span> (7 Ağustos)
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#231F1E] border border-stone-200/70 dark:border-stone-800 text-rose-500 dark:text-rose-400 flex items-center justify-center shadow-2xs">
            <Scale size={18} />
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="px-5 space-y-4 flex-1">
        
        {/* 3'lü İstatistik Kartları */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Toplam */}
          <div className="bg-white dark:bg-[#231F1E] border border-stone-100 dark:border-stone-800/80 rounded-2xl p-3 text-center shadow-2xs flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
              Toplam
            </span>
            <div className="my-0.5 text-rose-500 dark:text-rose-400 font-bold text-base tracking-tight flex items-center justify-center gap-0.5">
              <TrendingDown size={14} />
              <span>{parseFloat(totalLost) > 0 ? `-${totalLost}` : "0.0"}</span>
            </div>
            <span className="text-[10px] text-stone-400 dark:text-stone-500">kg verildi</span>
          </div>

          {/* Son Tartı */}
          <div className="bg-white dark:bg-[#231F1E] border border-stone-100 dark:border-stone-800/80 rounded-2xl p-3 text-center shadow-2xs flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
              Son Tartı
            </span>
            <div className="my-0.5 text-emerald-500 dark:text-emerald-400 font-bold text-base tracking-tight">
              {parseFloat(lastDiff) > 0 ? `-${lastDiff}` : parseFloat(lastDiff) < 0 ? `+${Math.abs(lastDiff)}` : "0.0"}
            </div>
            <span className="text-[10px] text-stone-400 dark:text-stone-500">kg fark</span>
          </div>

          {/* Yolculuk */}
          <div className="bg-white dark:bg-[#231F1E] border border-stone-100 dark:border-stone-800/80 rounded-2xl p-3 text-center shadow-2xs flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
              Yolculuk
            </span>
            <div className="my-0.5 text-stone-800 dark:text-stone-100 font-bold text-base tracking-tight flex items-center justify-center gap-1">
              <Heart size={13} className="text-rose-400 fill-rose-400/20" />
              <span>{daysSinceSurgery}</span>
            </div>
            <span className="text-[10px] text-stone-400 dark:text-stone-500">gün oldu</span>
          </div>
        </div>

        {/* Güncel Kilo Vurgusu */}
        {sortedWeights.length > 0 && (
          <div className="bg-white dark:bg-[#231F1E] rounded-3xl p-4 border border-rose-200/80 dark:border-rose-900/40 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 block">
                Son Tartı Sonucu
              </span>
              <div className="text-2xl font-black text-rose-500 dark:text-rose-400 tracking-tight mt-0.5">
                {currentWeight} <span className="text-xs font-bold text-stone-500 dark:text-stone-400">kg</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-[#181514] border border-stone-200/60 dark:border-stone-800 px-3 py-1.5 rounded-xl">
              {format(new Date(sortedWeights[0].date), "d MMMM yyyy", { locale: tr })}
            </span>
          </div>
        )}

        {/* Yeni Kilo Giriş Formu (Mobilde Asla Taşmaz) */}
        <section className="bg-white dark:bg-[#231F1E] rounded-3xl p-4 border border-stone-100 dark:border-stone-800/80 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-stone-800 dark:text-stone-100 block">
            Yeni Tartı Kaydı Ekle
          </span>

          <form onSubmit={handleAddWeight} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-stone-400 dark:text-stone-500 mb-1 ml-1">
                  Tarih
                </label>
                <input
                  type="date"
                  required
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-[#181514] border border-stone-200/80 dark:border-stone-700/80 rounded-2xl px-3 py-2.5 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-400 dark:text-stone-500 mb-1 ml-1">
                  Kilo (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Örn: 94.5"
                  value={inputWeight}
                  onChange={(e) => setInputWeight(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-[#181514] border border-stone-200/80 dark:border-stone-700/80 rounded-2xl px-3 py-2.5 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white py-3 rounded-2xl text-xs font-bold shadow-xs shadow-rose-500/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>{saving ? "Kaydediliyor..." : "Tartı Kaydını Kaydet"}</span>
            </button>
          </form>
        </section>

        {/* Geçmiş Kayıtlar Listesi */}
        <section className="space-y-2 pt-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Tartı Geçmişi ({sortedWeights.length})
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-stone-400 text-xs">Kayıtlar yükleniyor...</div>
          ) : sortedWeights.length === 0 ? (
            <div className="bg-white dark:bg-[#231F1E] rounded-3xl p-6 text-center border border-dashed border-stone-200 dark:border-stone-800 text-xs text-stone-400 dark:text-stone-500">
              Henüz bir tartı kaydı eklemediniz.
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
                      <div className="w-8 h-8 rounded-xl bg-stone-50 dark:bg-[#181514] text-stone-500 dark:text-stone-400 flex items-center justify-center text-xs font-bold">
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

                    <div className="flex items-center gap-2.5">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl ${
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
                        className="p-1.5 text-stone-300 dark:text-stone-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Kaydı Sil"
                      >
                        <Trash2 size={15} />
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
