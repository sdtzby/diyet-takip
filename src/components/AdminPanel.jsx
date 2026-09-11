import React, { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { X, Plus, Trash2, Save, Coffee, BookOpen, Ban, Heart } from "lucide-react";

export default function AdminPanel({ initialData, onClose, onSaveSuccess }) {
  const [activeTab, setActiveTab] = useState("meals");
  const [data, setData] = useState(JSON.parse(JSON.stringify(initialData)));
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const handleMealChange = (mealIndex, field, value) => {
    const updated = { ...data };
    updated.meals[mealIndex][field] = value;
    setData(updated);
  };

  const handleOptionChange = (mealIndex, optIndex, value) => {
    const updated = { ...data };
    updated.meals[mealIndex].options[optIndex] = value;
    setData(updated);
  };

  const addOption = (mealIndex) => {
    const updated = { ...data };
    updated.meals[mealIndex].options.push("");
    setData(updated);
  };

  const removeOption = (mealIndex, optIndex) => {
    const updated = { ...data };
    updated.meals[mealIndex].options.splice(optIndex, 1);
    setData(updated);
  };

  const handleWarningChange = (index, value) => {
    const updated = { ...data };
    updated.warnings[index] = value;
    setData(updated);
  };

  const addWarning = () => {
    const updated = { ...data };
    updated.warnings.push("");
    setData(updated);
  };

  const removeWarning = (index) => {
    const updated = { ...data };
    updated.warnings.splice(index, 1);
    setData(updated);
  };

  const handleForbiddenItemChange = (groupIndex, itemIndex, value) => {
    const updated = { ...data };
    updated.forbidden[groupIndex].items[itemIndex] = value;
    setData(updated);
  };

  const addForbiddenItem = (groupIndex) => {
    const updated = { ...data };
    if (!updated.forbidden[groupIndex].items) updated.forbidden[groupIndex].items = [];
    updated.forbidden[groupIndex].items.push("");
    setData(updated);
  };

  const removeForbiddenItem = (groupIndex, itemIndex) => {
    const updated = { ...data };
    updated.forbidden[groupIndex].items.splice(itemIndex, 1);
    setData(updated);
  };

  const handleLoveNoteChange = (index, value) => {
    const updated = { ...data };
    if (!updated.loveNotes) updated.loveNotes = [];
    updated.loveNotes[index] = value;
    setData(updated);
  };

  const addLoveNote = () => {
    const updated = { ...data };
    if (!updated.loveNotes) updated.loveNotes = [];
    updated.loveNotes.push("");
    setData(updated);
  };

  const removeLoveNote = (index) => {
    const updated = { ...data };
    updated.loveNotes.splice(index, 1);
    setData(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("");
    try {
      await setDoc(doc(db, "config", "diet_data"), data);
      setSaveStatus("success");
      onSaveSuccess(data);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error("Kaydetme hatası:", err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-text">
      <div 
        className="relative max-w-2xl w-full bg-white dark:bg-[#231F1E] rounded-3xl shadow-2xl border border-stone-200/80 dark:border-stone-800 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
              Yönetici Paneli
            </h2>
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              Diyet menülerini, kuralları ve sevgi notlarını düzenle
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center justify-center transition-colors"
            title="Kapat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sekmeler */}
        <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-stone-100 dark:border-stone-800/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab("meals")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "meals"
                ? "bg-rose-500 text-white shadow-xs shadow-rose-500/25"
                : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60"
            }`}
          >
            <Coffee size={13} />
            <span>Öğünler</span>
          </button>

          <button
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "rules"
                ? "bg-rose-500 text-white shadow-xs shadow-rose-500/25"
                : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60"
            }`}
          >
            <BookOpen size={13} />
            <span>Kurallar</span>
          </button>

          <button
            onClick={() => setActiveTab("forbidden")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "forbidden"
                ? "bg-rose-500 text-white shadow-xs shadow-rose-500/25"
                : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60"
            }`}
          >
            <Ban size={13} />
            <span>Yasaklar</span>
          </button>

          <button
            onClick={() => setActiveTab("lovenotes")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "lovenotes"
                ? "bg-rose-500 text-white shadow-xs shadow-rose-500/25"
                : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60"
            }`}
          >
            <Heart size={13} />
            <span>Sevgi Notları</span>
          </button>
        </div>

        {/* Gövde */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "meals" && (
            <div className="space-y-6">
              {data.meals.map((meal, mIdx) => (
                <div 
                  key={meal.id} 
                  className="bg-stone-50 dark:bg-[#1A1615] rounded-2xl p-4 border border-stone-200/60 dark:border-stone-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                      {meal.title}
                    </h3>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Öğün Başlığı
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white dark:bg-[#231F1E] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
                      value={meal.title}
                      onChange={(e) => handleMealChange(mIdx, "title", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Öğün Notu
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white dark:bg-[#231F1E] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
                      value={meal.note || ""}
                      onChange={(e) => handleMealChange(mIdx, "note", e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                        Yemek Seçenekleri ({meal.options.length})
                      </label>
                      <button
                        onClick={() => addOption(mIdx)}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-0.5"
                      >
                        <Plus size={12} />
                        <span>Seçenek Ekle</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {meal.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            className="flex-1 bg-white dark:bg-[#231F1E] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-1.5 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
                            value={opt}
                            onChange={(e) => handleOptionChange(mIdx, oIdx, e.target.value)}
                          />
                          <button
                            onClick={() => removeOption(mIdx, oIdx)}
                            className="p-1.5 text-stone-400 hover:text-rose-500 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "rules" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  Diyet Kuralları ({data.warnings.length})
                </span>
                <button
                  onClick={addWarning}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Kural Ekle</span>
                </button>
              </div>

              <div className="space-y-2">
                {data.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs font-bold text-stone-400">{idx + 1}.</span>
                    <input
                      type="text"
                      className="flex-1 bg-stone-50 dark:bg-[#1A1615] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
                      value={w}
                      onChange={(e) => handleWarningChange(idx, e.target.value)}
                    />
                    <button
                      onClick={() => removeWarning(idx)}
                      className="p-1.5 text-stone-400 hover:text-rose-500 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "forbidden" && (
            <div className="space-y-5">
              {(data.forbidden || []).map((group, gIdx) => (
                <div key={gIdx} className="bg-stone-50 dark:bg-[#1A1615] rounded-2xl p-4 border border-stone-200/60 dark:border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-rose-500">
                      {group.category}
                    </h3>
                    <button
                      onClick={() => addForbiddenItem(gIdx)}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-0.5"
                    >
                      <Plus size={12} />
                      <span>Ürün Ekle</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {(group.items || []).map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          className="flex-1 bg-white dark:bg-[#231F1E] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-1.5 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden focus:border-rose-400"
                          value={item}
                          onChange={(e) => handleForbiddenItemChange(gIdx, iIdx, e.target.value)}
                        />
                        <button
                          onClick={() => removeForbiddenItem(gIdx, iIdx)}
                          className="p-1.5 text-stone-400 hover:text-rose-500 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "lovenotes" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Sevgi Notları Listesi ({(data.loveNotes || DEFAULT_LOVE_NOTES).length})
                  </span>
                  <p className="text-[11px] text-stone-400">
                    İstediğin uzunlukta yazabilirsin; satır başları mektupta aynen korunur.
                  </p>
                </div>

                <button
                  onClick={addLoveNote}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 shrink-0"
                >
                  <Plus size={13} />
                  <span>Yeni Not Ekle</span>
                </button>
              </div>

              <div className="space-y-3">
                {(data.loveNotes || DEFAULT_LOVE_NOTES).map((note, idx) => (
                  <div key={idx} className="bg-stone-50 dark:bg-[#1A1615] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 flex items-start gap-2">
                    <span className="text-xs font-bold text-stone-400 pt-2">{idx + 1}.</span>
                    <textarea
                      rows={3}
                      className="flex-1 bg-white dark:bg-[#231F1E] border border-stone-200 dark:border-stone-700/80 rounded-xl p-2.5 text-xs text-stone-800 dark:text-stone-100 leading-relaxed focus:outline-hidden focus:border-rose-400 resize-y font-serif"
                      value={note}
                      onChange={(e) => handleLoveNoteChange(idx, e.target.value)}
                      placeholder="Günün sevgi notunu yaz..."
                    />
                    <button
                      onClick={() => removeLoveNote(idx)}
                      className="p-1.5 text-stone-400 hover:text-rose-500 transition-colors pt-2"
                      title="Notu Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alt Kaydet Butonu */}
        <div className="p-4 px-6 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-[#1E1A19]">
          {saveStatus === "success" && (
            <span className="text-xs font-bold text-emerald-500">
              Başarıyla kaydedildi!
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs font-bold text-rose-500">
              Kaydetme başarısız oldu.
            </span>
          )}
          {!saveStatus && <span />}

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs shadow-rose-500/25 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
