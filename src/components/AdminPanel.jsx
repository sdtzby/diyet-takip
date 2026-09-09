import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Save, Plus, Trash2, X } from "lucide-react";

export default function AdminPanel({ initialData, onClose, onSaveSuccess }) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);

  // Uyarı işlemleri
  const handleWarningChange = (idx, value) => {
    const updated = [...data.warnings];
    updated[idx] = value;
    setData({ ...data, warnings: updated });
  };

  const addWarning = () => {
    setData({ ...data, warnings: [...data.warnings, "Yeni kural metni..."] });
  };

  const removeWarning = (idx) => {
    setData({ ...data, warnings: data.warnings.filter((_, i) => i !== idx) });
  };

  // Öğün opsiyon işlemleri
  const handleOptionChange = (mealId, optIdx, value) => {
    const updatedMeals = data.meals.map((m) => {
      if (m.id !== mealId) return m;
      const updatedOpts = [...m.options];
      updatedOpts[optIdx] = value;
      return { ...m, options: updatedOpts };
    });
    setData({ ...data, meals: updatedMeals });
  };

  const addOption = (mealId) => {
    const updatedMeals = data.meals.map((m) => {
      if (m.id !== mealId) return m;
      return { ...m, options: [...m.options, "Yeni alternatif metni..."] };
    });
    setData({ ...data, meals: updatedMeals });
  };

  const removeOption = (mealId, optIdx) => {
    const updatedMeals = data.meals.map((m) => {
      if (m.id !== mealId) return m;
      return { ...m, options: m.options.filter((_, i) => i !== optIdx) };
    });
    setData({ ...data, meals: updatedMeals });
  };

  // Firestore'a kaydetme
  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "diet_data"), data);
      onSaveSuccess(data);
      onClose();
    } catch (err) {
      alert("Hata: Kaydedilemedi! Yetki kuralını kontrol et: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto p-5 flex flex-col shadow-2xl">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-800">Diyet ve Kural Yönetimi</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 py-4 flex-1">
          {/* Uyarılar Düzenleme */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Kritik Kurallar</span>
              <button
                onClick={addWarning}
                className="text-xs flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
              >
                <Plus size={14} /> Kural Ekle
              </button>
            </div>
            {data.warnings.map((w, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={w}
                  onChange={(e) => handleWarningChange(idx, e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                />
                <button onClick={() => removeWarning(idx)} className="text-slate-400 hover:text-red-500 p-1">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <hr className="border-slate-200" />

          {/* Öğün Seçenekleri Düzenleme */}
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Öğün Alternatifleri</span>
            {data.meals.map((meal) => (
              <div key={meal.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">{meal.title}</span>
                  <button
                    onClick={() => addOption(meal.id)}
                    className="text-[11px] flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <Plus size={13} /> Seçenek Ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {meal.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(meal.id, optIdx, e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
                      />
                      <button onClick={() => removeOption(meal.id, optIdx)} className="text-slate-400 hover:text-red-500 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kaydet Butonu */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}