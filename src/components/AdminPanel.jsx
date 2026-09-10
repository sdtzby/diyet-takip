import React, { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { X, Plus, Trash2, Save, Sparkles, BookOpen, Utensils, Ban, Heart } from "lucide-react";

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

export default function AdminPanel({ initialData, onClose, onSaveSuccess }) {
  const [formData, setFormData] = useState(() => {
    const data = JSON.parse(JSON.stringify(initialData || {}));
    if (!data.forbidden || data.forbidden.length === 0) {
      data.forbidden = DEFAULT_FORBIDDEN;
    }
    if (!data.loveNotes || data.loveNotes.length === 0) {
      data.loveNotes = DEFAULT_LOVE_NOTES;
    }
    if (!data.warnings) {
      data.warnings = [];
    }
    if (!data.meals) {
      data.meals = [];
    }
    return data;
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("meals");

  // 1. Kurallar
  const handleWarningChange = (index, value) => {
    const updated = [...formData.warnings];
    updated[index] = value;
    setFormData({ ...formData, warnings: updated });
  };
  const addWarning = () => {
    setFormData({ ...formData, warnings: [...formData.warnings, "Yeni prensip ekleyin..."] });
  };
  const removeWarning = (index) => {
    setFormData({ ...formData, warnings: formData.warnings.filter((_, i) => i !== index) });
  };

  // 2. Öğünler
  const handleMealFieldChange = (mealIndex, field, value) => {
    const updatedMeals = [...formData.meals];
    updatedMeals[mealIndex] = { ...updatedMeals[mealIndex], [field]: value };
    setFormData({ ...formData, meals: updatedMeals });
  };
  const handleOptionChange = (mealIndex, optionIndex, value) => {
    const updatedMeals = [...formData.meals];
    const updatedOptions = [...updatedMeals[mealIndex].options];
    updatedOptions[optionIndex] = value;
    updatedMeals[mealIndex].options = updatedOptions;
    setFormData({ ...formData, meals: updatedMeals });
  };
  const addOption = (mealIndex) => {
    const updatedMeals = [...formData.meals];
    updatedMeals[mealIndex].options.push("Yeni alternatif...");
    setFormData({ ...formData, meals: updatedMeals });
  };
  const removeOption = (mealIndex, optionIndex) => {
    const updatedMeals = [...formData.meals];
    updatedMeals[mealIndex].options = updatedMeals[mealIndex].options.filter((_, i) => i !== optionIndex);
    setFormData({ ...formData, meals: updatedMeals });
  };

  // 3. Yasaklar
  const handleForbiddenCategoryChange = (cIdx, value) => {
    const updated = [...formData.forbidden];
    updated[cIdx] = { ...updated[cIdx], category: value };
    setFormData({ ...formData, forbidden: updated });
  };
  const handleForbiddenItemChange = (cIdx, iIdx, value) => {
    const updated = [...formData.forbidden];
    const items = [...updated[cIdx].items];
    items[iIdx] = value;
    updated[cIdx] = { ...updated[cIdx], items };
    setFormData({ ...formData, forbidden: updated });
  };
  const addForbiddenCategory = () => {
    setFormData({
      ...formData,
      forbidden: [...formData.forbidden, { category: "Yeni Kategori", items: ["Örnek gıda"] }]
    });
  };
  const removeForbiddenCategory = (cIdx) => {
    setFormData({ ...formData, forbidden: formData.forbidden.filter((_, i) => i !== cIdx) });
  };
  const addForbiddenItem = (cIdx) => {
    const updated = [...formData.forbidden];
    updated[cIdx] = { ...updated[cIdx], items: [...updated[cIdx].items, "Yeni madde"] };
    setFormData({ ...formData, forbidden: updated });
  };
  const removeForbiddenItem = (cIdx, iIdx) => {
    const updated = [...formData.forbidden];
    updated[cIdx] = { ...updated[cIdx], items: updated[cIdx].items.filter((_, i) => i !== iIdx) };
    setFormData({ ...formData, forbidden: updated });
  };

  // 4. Sevgi Notları
  const handleLoveNoteChange = (index, value) => {
    const updated = [...formData.loveNotes];
    updated[index] = value;
    setFormData({ ...formData, loveNotes: updated });
  };
  const addLoveNote = () => {
    setFormData({ ...formData, loveNotes: [...formData.loveNotes, "Seni çok seviyorum..."] });
  };
  const removeLoveNote = (index) => {
    setFormData({ ...formData, loveNotes: formData.loveNotes.filter((_, i) => i !== index) });
  };

  // Kaydet (Undefined alanları temizler)
  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanData = JSON.parse(
        JSON.stringify(formData, (key, value) => (value === undefined ? "" : value))
      );
      await setDoc(doc(db, "config", "diet_data"), cleanData);
      onSaveSuccess(cleanData);
      onClose();
    } catch (err) {
      console.error("Diyet ayarları kaydedilemedi:", err);
      alert(`Ayarlar kaydedilirken hata oluştu:\n${err.code || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-900/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1C1817] border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst Başlık & Sekmeler */}
        <div className="px-5 pt-4 pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0 bg-white/95 dark:bg-[#1C1817]/95">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-100 tracking-tight">
                Diyet Yapılandırması
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center justify-center transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setActiveTab("meals")}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                activeTab === "meals"
                  ? "bg-rose-500 text-white shadow-xs shadow-rose-500/30"
                  : "bg-stone-100 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400"
              }`}
            >
              <Utensils size={11} />
              <span>Öğünler</span>
            </button>
            <button
              onClick={() => setActiveTab("forbidden")}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                activeTab === "forbidden"
                  ? "bg-rose-500 text-white shadow-xs shadow-rose-500/30"
                  : "bg-stone-100 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400"
              }`}
            >
              <Ban size={11} />
              <span>Yasaklar</span>
            </button>
            <button
              onClick={() => setActiveTab("warnings")}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                activeTab === "warnings"
                  ? "bg-rose-500 text-white shadow-xs shadow-rose-500/30"
                  : "bg-stone-100 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400"
              }`}
            >
              <BookOpen size={11} />
              <span>Kurallar</span>
            </button>
            <button
              onClick={() => setActiveTab("loveNotes")}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                activeTab === "loveNotes"
                  ? "bg-rose-500 text-white shadow-xs shadow-rose-500/30"
                  : "bg-stone-100 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400"
              }`}
            >
              <Heart size={11} className={activeTab === "loveNotes" ? "fill-white" : "text-rose-400"} />
              <span>Notlar ({formData.loveNotes?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Gövde */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs text-stone-700 dark:text-stone-200">
          
          {/* TAB 1: ÖĞÜNLER */}
          {activeTab === "meals" && (
            <div className="space-y-4">
              {formData.meals.map((meal, mIdx) => (
                <div key={meal.id} className="bg-stone-50/70 dark:bg-[#241F1D] border border-stone-200/80 dark:border-stone-800 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-stone-800 dark:text-stone-100 text-xs uppercase">{meal.title}</span>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">ID: {meal.id}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-400 mb-1">Öğün Notu / Zamanı</label>
                      <input
                        type="text"
                        value={meal.note || ""}
                        onChange={(e) => handleMealFieldChange(mIdx, "note", e.target.value)}
                        className="w-full bg-white dark:bg-[#181514] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-1.5 text-xs text-stone-800 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-400 mb-1">Görsel Adı</label>
                      <input
                        type="text"
                        value={meal.image || ""}
                        onChange={(e) => handleMealFieldChange(mIdx, "image", e.target.value)}
                        className="w-full bg-white dark:bg-[#181514] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-1.5 text-xs text-stone-800 dark:text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block text-[10px] font-semibold text-stone-400">Alternatifler</label>
                    {meal.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(mIdx, oIdx, e.target.value)}
                          className="flex-1 bg-white dark:bg-[#181514] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-1.5 text-xs text-stone-800 dark:text-stone-100"
                        />
                        <button onClick={() => removeOption(mIdx, oIdx)} className="p-1.5 text-stone-400 hover:text-rose-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addOption(mIdx)} className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <Plus size={13} />
                      <span>Alternatif Ekle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: YASAKLAR */}
          {activeTab === "forbidden" && (
            <div className="space-y-4">
              {formData.forbidden?.map((cat, cIdx) => (
                <div key={cIdx} className="bg-stone-50/70 dark:bg-[#241F1D] border border-stone-200/80 dark:border-stone-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold text-rose-500 uppercase mb-1">Kategori Başlığı</label>
                      <input
                        type="text"
                        value={cat.category}
                        onChange={(e) => handleForbiddenCategoryChange(cIdx, e.target.value)}
                        className="w-full bg-white dark:bg-[#181514] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 dark:text-stone-100"
                      />
                    </div>
                    <button onClick={() => removeForbiddenCategory(cIdx)} className="mt-4 p-2 text-stone-400 hover:text-rose-600">
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {cat.items.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 ml-1" />
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleForbiddenItemChange(cIdx, iIdx, e.target.value)}
                          className="flex-1 bg-white dark:bg-[#181514] border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-1 text-xs text-stone-800 dark:text-stone-100"
                        />
                        <button onClick={() => removeForbiddenItem(cIdx, iIdx)} className="p-1 text-stone-400 hover:text-rose-600">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addForbiddenItem(cIdx)} className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <Plus size={13} />
                      <span>Madde Ekle</span>
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addForbiddenCategory} className="w-full py-2.5 border border-dashed border-rose-300 dark:border-rose-800/80 rounded-2xl text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5">
                <Plus size={14} />
                <span>Yeni Yasak Kategorisi</span>
              </button>
            </div>
          )}

          {/* TAB 3: KURALLAR */}
          {activeTab === "warnings" && (
            <div className="space-y-2.5">
              {formData.warnings?.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-stone-50/70 dark:bg-[#241F1D] border border-stone-200/80 dark:border-stone-800 p-2.5 rounded-xl">
                  <span className="text-rose-500 font-bold ml-1">•</span>
                  <input
                    type="text"
                    value={w}
                    onChange={(e) => handleWarningChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-0 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden"
                  />
                  <button onClick={() => removeWarning(idx)} className="p-1 text-stone-400 hover:text-rose-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addWarning} className="w-full mt-2 py-2.5 border border-dashed border-rose-300 dark:border-rose-800/80 rounded-2xl text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5">
                <Plus size={14} />
                <span>Yeni Prensip Ekle</span>
              </button>
            </div>
          )}

          {/* TAB 4: SEVGİ NOTLARI */}
          {activeTab === "loveNotes" && (
            <div className="space-y-3">
              <p className="text-[11px] text-stone-400 dark:text-stone-500 leading-relaxed">
                Eşinin her gün göreceği sevgi sözleri. Her gün sırayla gösterilir ve liste tükenmeden aynı söz tekrar etmez.
              </p>
              
              <div className="space-y-2.5">
                {formData.loveNotes?.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-stone-50/70 dark:bg-[#241F1D] border border-stone-200/80 dark:border-stone-800 p-2.5 rounded-2xl">
                    <span className="text-rose-500 font-bold text-xs mt-1 ml-1">#{idx + 1}</span>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => handleLoveNoteChange(idx, e.target.value)}
                      className="flex-1 bg-white dark:bg-[#181514] border border-stone-200 dark:border-stone-700/80 rounded-xl p-2 text-xs text-stone-800 dark:text-stone-100 focus:outline-hidden resize-none"
                    />
                    <button onClick={() => removeLoveNote(idx)} className="p-1.5 text-stone-400 hover:text-rose-600 mt-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addLoveNote}
                className="w-full mt-2 py-2.5 border border-dashed border-rose-300 dark:border-rose-800/80 rounded-2xl text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>Yeni Sevgi Notu Ekle</span>
              </button>
            </div>
          )}

        </div>

        {/* Alt Butonlar */}
        <div className="px-5 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50/80 dark:bg-[#1C1817] flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400">
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs shadow-rose-500/25 transition-all disabled:opacity-60"
          >
            <Save size={14} />
            <span>{saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
