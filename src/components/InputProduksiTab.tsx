import React, { useState, useEffect } from 'react';
import { Customer, Model, Item, Process, ProductionEntry } from '../types';
import { Play, ClipboardCheck, AlertTriangle, ChevronRight, Check, Plus, Minus, Info } from 'lucide-react';

interface InputProduksiTabProps {
  customers: Customer[];
  models: Model[];
  items: Item[];
  processes: Process[];
  selectedDate: string;
  activeShift: '1' | '2' | '3';
  setActiveShift: (shift: '1' | '2' | '3') => void;
  onAddEntry: (entry: ProductionEntry) => void;
}

export default function InputProduksiTab({
  customers,
  models,
  items,
  processes,
  selectedDate,
  activeShift,
  setActiveShift,
  onAddEntry
}: InputProduksiTabProps) {
  // Input fields state
  const [processInitId, setProcessInitId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [modelId, setModelId] = useState('');
  const [itemId, setItemId] = useState('');
  const [processItemId, setProcessItemId] = useState('');
  const [okCount, setOkCount] = useState<number>(0);
  const [ngCount, setNgCount] = useState<number>(0);
  const [nextProcessId, setNextProcessId] = useState('');

  // Dropdown list state for step 5 (proses item)
  const [availableItemProcesses, setAvailableItemProcesses] = useState<Process[]>([]);

  // Update available sub-processes when Item changes
  useEffect(() => {
    if (!itemId) {
      setAvailableItemProcesses([]);
      setProcessItemId('');
      return;
    }

    const selectedItem = items.find(i => i.id === itemId);
    if (selectedItem && selectedItem.processes && selectedItem.processes.length > 0) {
      // Find matching Process objects for the IDs listed in the item
      const itemProcs = processes.filter(p => selectedItem.processes.includes(p.id));
      setAvailableItemProcesses(itemProcs);
      
      // Auto-select first if available
      if (itemProcs.length > 0) {
        setProcessItemId(itemProcs[0].id);
      } else {
        setProcessItemId('');
      }
    } else {
      // Fallback: If no processes are bound to the item, show all processes so they can still proceed
      setAvailableItemProcesses(processes);
      setProcessItemId('');
    }
  }, [itemId, items, processes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify all fields
    if (!processInitId || !customerId || !modelId || !itemId || !processItemId || !nextProcessId) {
      alert('Silakan lengkapi semua isian dropdown terlebih dahulu.');
      return;
    }

    if (okCount < 0 || ngCount < 0) {
      alert('Hasil OK dan NG tidak boleh kurang dari 0.');
      return;
    }

    // Capture time
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

    const newEntry: ProductionEntry = {
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      date: selectedDate, // Bind to dashboard's selected date
      timestamp: timeStr,
      shift: activeShift,
      processInitId,
      customerId,
      modelId,
      itemId,
      processItemId,
      okCount,
      ngCount,
      nextProcessId,
      isLocked: false // Initially active
    };

    onAddEntry(newEntry);

    // Toast/Alert
    alert('Entry Produksi Berhasil Ditambahkan!');

    // Reset part count states (keep process configurations to speed up repeating entries!)
    setOkCount(0);
    setNgCount(0);
  };

  // Fast increment helper for floor operators using touch screens
  const adjustValue = (type: 'ok' | 'ng', amount: number) => {
    if (type === 'ok') {
      setOkCount(prev => Math.max(0, prev + amount));
    } else {
      setNgCount(prev => Math.max(0, prev + amount));
    }
  };

  const isFormValid = processInitId && customerId && modelId && itemId && processItemId && nextProcessId;

  return (
    <div className="space-y-4 pb-20">
      {/* Short quick tips config */}
      <div className="bg-leaf-50 border border-leaf-100 p-4 rounded-2xl flex items-start gap-2.5">
        <Info className="w-4.5 h-4.5 text-leaf-600 shrink-0 mt-0.5" />
        <div className="text-xs text-leaf-800 leading-relaxed">
          <span className="font-bold">Form Input Produksi Cepat</span>
          <br />
          Data akan disimpan pada tanggal <span className="font-bold underline">{selectedDate}</span>. Silakan pilih Shift aktif di bawah ini sebelum menginput:
        </div>
      </div>

      {/* Shift quick select pills */}
      <div className="bg-white border border-natural-200 p-4 rounded-2xl shadow-sm">
        <label className="block text-xs font-bold text-natural-900 mb-2">Pilih Sif Aktif (Shift):</label>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3'].map(sh => (
            <button
               key={sh}
               type="button"
               onClick={() => setActiveShift(sh as '1' | '2' | '3')}
               className={`py-3 rounded-xl border font-bold text-xs transition duration-200 ${
                 activeShift === sh
                   ? 'bg-leaf-600 border-leaf-600 text-white shadow-md'
                   : 'bg-natural-100 border-natural-200 text-natural-700 hover:bg-natural-200'
               }`}
             >
               SIF {sh}
             </button>
           ))}
        </div>
      </div>

      {/* Main cascading entry form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl border border-natural-200 p-5 shadow-sm space-y-4">
          
          {/* STEP 1: PROSES DAHULU */}
          <div>
            <label className="block text-xs font-bold text-natural-800 mb-1.5">
              1. Proses Utama / Awal
            </label>
            <select
              value={processInitId}
              onChange={e => setProcessInitId(e.target.value)}
              className="w-full bg-natural-50 hover:bg-natural-100/50 border border-natural-250 focus:border-leaf-500 focus:bg-white text-natural-900 text-xs rounded-xl px-4 py-3.5 transition outline-none"
            >
              <option value="">-- Pilih Proses Awal --</option>
              {processes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* STEP 2: CUSTOMER */}
          <div>
            <label className="block text-xs font-bold text-natural-800 mb-1.5">
              2. Customer
            </label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              className="w-full bg-natural-50 hover:bg-natural-100/50 border border-natural-250 focus:border-leaf-500 focus:bg-white text-natural-900 text-xs rounded-xl px-4 py-3.5 transition outline-none"
            >
              <option value="">-- Pilih Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* STEP 3: MODEL */}
          <div>
            <label className="block text-xs font-bold text-natural-800 mb-1.5">
              3. Model
            </label>
            <select
              value={modelId}
              onChange={e => setModelId(e.target.value)}
              className="w-full bg-natural-50 hover:bg-natural-100/50 border border-natural-250 focus:border-leaf-500 focus:bg-white text-natural-900 text-xs rounded-xl px-4 py-3.5 transition outline-none"
            >
              <option value="">-- Pilih Model --</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* STEP 4: ITEM */}
          <div>
            <label className="block text-xs font-bold text-natural-800 mb-1.5">
              4. Item
            </label>
            <select
              value={itemId}
              onChange={e => {
                setItemId(e.target.value);
                // processItemId gets auto-controlled in useEffect
              }}
              className="w-full bg-natural-50 hover:bg-natural-100/50 border border-natural-250 focus:border-leaf-500 focus:bg-white text-natural-900 text-xs rounded-xl px-4 py-3.5 transition outline-none"
            >
              <option value="">-- Pilih Item --</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* STEP 5: PROSES SESUAI ITEM (DROPDOWN DINAMIS) */}
          <div>
            <label className="block text-xs font-bold text-natural-800 mb-1 flex items-center justify-between">
              <span>5. Proses Kontrol Item</span>
              {itemId && (
                <span className="text-[10px] text-leaf-600 font-normal">
                  Disesuaikan dengan item terpilih
                </span>
              )}
            </label>
            <select
              value={processItemId}
              onChange={e => setProcessItemId(e.target.value)}
              disabled={!itemId}
              className="w-full bg-natural-50 hover:bg-natural-100/50 border border-natural-250 focus:border-leaf-500 focus:bg-white disabled:opacity-60 text-natural-900 text-xs rounded-xl px-4 py-3.5 transition outline-none"
            >
              {!itemId ? (
                <option value="">-- Pilih Item Dahulu di Atas --</option>
              ) : availableItemProcesses.length === 0 ? (
                <option value="">-- Tidak Ada Proses Terkait (Gunakan Proses Umum) --</option>
              ) : (
                <>
                  <option value="">-- Pilih Proses Kerja --</option>
                  {availableItemProcesses.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* STEP 8: NEXT PROSES (PROSES BERIKUTNYA) */}
          <div>
            <label className="block text-xs font-bold text-natural-800 mb-1.5">
              6. Proses Selanjutnya (Next Proses)
            </label>
            <select
              value={nextProcessId}
              onChange={e => setNextProcessId(e.target.value)}
              className="w-full bg-natural-50 hover:bg-natural-100/50 border border-natural-250 focus:border-leaf-500 focus:bg-white text-natural-900 text-xs rounded-xl px-4 py-3.5 transition outline-none"
            >
              <option value="">-- Pilih Proses Selanjutnya --</option>
              {processes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* STEP 6 & 7: OK & NG COUNTER PAD FOR MOBILE PHONES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OK COUNTER */}
          <div className="bg-white rounded-2xl border border-natural-200 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-natural-100 pb-2">
              <span className="text-xs font-bold text-leaf-700">Hasil OK (Diterima)</span>
              <span className="text-[10px] text-natural-600">Klik tombol untuk hitung cepat</span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => adjustValue('ok', -1)}
                className="bg-natural-100 hover:bg-natural-250 p-3.5 rounded-xl transition text-natural-800 touch-manipulation active:scale-90"
              >
                <Minus className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className="flex-1 text-center font-bold text-3xl text-leaf-600 tracking-tight select-none">
                {okCount}
              </div>

              <button
                type="button"
                onClick={() => adjustValue('ok', 1)}
                className="bg-leaf-100 hover:bg-leaf-200 text-leaf-700 p-3.5 rounded-xl transition touch-manipulation active:scale-90"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Quick multi increments */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => adjustValue('ok', 5)}
                className="bg-natural-100 hover:bg-natural-150 py-2 rounded-lg text-xs font-semibold text-natural-700 transition"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => adjustValue('ok', 10)}
                className="bg-natural-100 hover:bg-natural-150 py-2 rounded-lg text-xs font-semibold text-natural-700 transition"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => adjustValue('ok', 50)}
                className="bg-leaf-500 text-white hover:bg-leaf-600 py-2 rounded-lg text-xs font-bold transition"
              >
                +50
              </button>
            </div>

            {/* Manual Edit Input */}
            <div className="pt-2">
              <input
                type="number"
                min="0"
                value={okCount || ''}
                placeholder="Edit manual jumlah..."
                onChange={e => setOkCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center bg-stone-50 border border-stone-200 rounded-lg py-1.5 text-xs font-medium text-natural-900 outline-none focus:border-stone-400"
              />
            </div>
          </div>

          {/* NG COUNTER */}
          <div className="bg-white rounded-2xl border border-natural-200 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-natural-100 pb-2">
              <span className="text-xs font-bold text-orange-700">Hasil NG (Not Good / Scrap)</span>
              <span className="text-[10px] text-natural-600">Klik tombol untuk hitung cepat</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => adjustValue('ng', -1)}
                className="bg-natural-100 hover:bg-natural-250 p-3.5 rounded-xl transition text-natural-800 touch-manipulation active:scale-90"
              >
                <Minus className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className="flex-1 text-center font-bold text-3xl text-orange-600 tracking-tight select-none">
                {ngCount}
              </div>

              <button
                type="button"
                onClick={() => adjustValue('ng', 1)}
                className="bg-orange-100 hover:bg-orange-200 text-orange-700 p-3.5 rounded-xl transition touch-manipulation active:scale-90"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Quick multi increments */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => adjustValue('ng', 5)}
                className="bg-natural-100 hover:bg-natural-150 py-2 rounded-lg text-xs font-semibold text-natural-700 transition"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => adjustValue('ng', 10)}
                className="bg-natural-100 hover:bg-natural-150 py-2 rounded-lg text-xs font-semibold text-natural-700 transition"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => adjustValue('ng', 25)}
                className="bg-orange-500 text-white hover:bg-orange-600 py-2 rounded-lg text-xs font-bold transition"
              >
                +25
              </button>
            </div>

            {/* Manual Edit Input */}
            <div className="pt-2">
              <input
                type="number"
                min="0"
                value={ngCount || ''}
                placeholder="Edit manual scrap..."
                onChange={e => setNgCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center bg-stone-50 border border-stone-200 rounded-lg py-1.5 text-xs font-medium text-natural-900 outline-none focus:border-stone-400"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          className={`w-full font-extrabold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md transition duration-300 ${
            isFormValid
              ? 'bg-leaf-600 text-white hover:bg-leaf-700 active:scale-[0.98]'
              : 'bg-stone-300 text-stone-500 cursor-not-allowed'
          }`}
        >
          <ClipboardCheck className="w-5 h-5" />
          <span>Simpan Log Produksi (Sif {activeShift})</span>
        </button>
      </form>
    </div>
  );
}
