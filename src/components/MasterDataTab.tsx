import React, { useState } from 'react';
import { Customer, Model, Item, Process } from '../types';
import { Plus, Trash2, Tag, Layers, UserCheck, ShieldCheck } from 'lucide-react';

interface MasterDataTabProps {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  models: Model[];
  setModels: (models: Model[]) => void;
  items: Item[];
  setItems: (items: Item[]) => void;
  processes: Process[];
  setProcesses: (processes: Process[]) => void;
}

type ActiveSubTab = 'customer' | 'model' | 'item' | 'proses';

export default function MasterDataTab({
  customers,
  setCustomers,
  models,
  setModels,
  items,
  setItems,
  processes,
  setProcesses
}: MasterDataTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('customer');

  // Input states
  const [customerInput, setCustomerInput] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [itemInput, setItemInput] = useState('');
  const [itemSelectedProcesses, setItemSelectedProcesses] = useState<string[]>([]);
  const [processInput, setProcessInput] = useState('');

  // Addition handlers
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInput.trim()) return;
    const newCustomer: Customer = {
      id: 'cust_' + Date.now(),
      name: customerInput.trim()
    };
    const updated = [...customers, newCustomer];
    setCustomers(updated);
    localStorage.setItem('prod_customers', JSON.stringify(updated));
    setCustomerInput('');
  };

  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelInput.trim()) return;
    const newModel: Model = {
      id: 'model_' + Date.now(),
      name: modelInput.trim()
    };
    const updated = [...models, newModel];
    setModels(updated);
    localStorage.setItem('prod_models', JSON.stringify(updated));
    setModelInput('');
  };

  const handleAddProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processInput.trim()) return;
    const newProcess: Process = {
      id: 'proc_' + Date.now(),
      name: processInput.trim()
    };
    const updated = [...processes, newProcess];
    setProcesses(updated);
    localStorage.setItem('prod_processes', JSON.stringify(updated));
    setProcessInput('');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemInput.trim()) return;
    const newItem: Item = {
      id: 'item_' + Date.now(),
      name: itemInput.trim(),
      processes: [...itemSelectedProcesses]
    };
    const updated = [...items, newItem];
    setItems(updated);
    localStorage.setItem('prod_items', JSON.stringify(updated));
    setItemInput('');
    setItemSelectedProcesses([]);
  };

  // Toggle selected processes for an item creation
  const handleToggleProcessSelection = (processId: string) => {
    if (itemSelectedProcesses.includes(processId)) {
      setItemSelectedProcesses(itemSelectedProcesses.filter(id => id !== processId));
    } else {
      setItemSelectedProcesses([...itemSelectedProcesses, processId]);
    }
  };

  // Deletion helper with Indonesian confirms
  const handleDelete = (type: ActiveSubTab, id: string, name: string) => {
    if (!window.confirm(`Hapus master ${type}: "${name}"? Tindakan ini kemungkinan berpengaruh pada inputan.`)) return;

    if (type === 'customer') {
      const updated = customers.filter(c => c.id !== id);
      setCustomers(updated);
      localStorage.setItem('prod_customers', JSON.stringify(updated));
    } else if (type === 'model') {
      const updated = models.filter(m => m.id !== id);
      setModels(updated);
      localStorage.setItem('prod_models', JSON.stringify(updated));
    } else if (type === 'proses') {
      const updated = processes.filter(p => p.id !== id);
      setProcesses(updated);
      localStorage.setItem('prod_processes', JSON.stringify(updated));
      // Also clean in item relationships
      const updatedItems = items.map(item => ({
        ...item,
        processes: item.processes.filter(pId => pId !== id)
      }));
      setItems(updatedItems);
      localStorage.setItem('prod_items', JSON.stringify(updatedItems));
    } else if (type === 'item') {
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      localStorage.setItem('prod_items', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Sub-tab Selector */}
      <div className="flex bg-natural-200 p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveSubTab('customer')}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition duration-200 ${
            activeSubTab === 'customer'
              ? 'bg-leaf-500 text-white shadow-sm'
              : 'text-natural-700 hover:text-natural-900'
          }`}
        >
          Customer
        </button>
        <button
          onClick={() => setActiveSubTab('model')}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition duration-200 ${
            activeSubTab === 'model'
              ? 'bg-leaf-500 text-white shadow-sm'
              : 'text-natural-700 hover:text-natural-900'
          }`}
        >
          Model
        </button>
        <button
          onClick={() => setActiveSubTab('item')}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition duration-200 ${
            activeSubTab === 'item'
              ? 'bg-leaf-500 text-white shadow-sm'
              : 'text-natural-700 hover:text-natural-900'
          }`}
        >
          Item
        </button>
        <button
          onClick={() => setActiveSubTab('proses')}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition duration-200 ${
            activeSubTab === 'proses'
              ? 'bg-leaf-500 text-white shadow-sm'
              : 'text-natural-700 hover:text-natural-900'
          }`}
        >
          Proses
        </button>
      </div>

      {/* Sub-tab Content Area */}
      <div className="bg-white rounded-2xl border border-natural-200 p-5 shadow-sm space-y-5">
        {/* Sub-tab Titles */}
        <div>
          <h3 className="font-bold text-natural-900 text-base flex items-center gap-2">
            {activeSubTab === 'customer' && <UserCheck className="w-5 h-5 text-leaf-500" />}
            {activeSubTab === 'model' && <Tag className="w-5 h-5 text-leaf-500" />}
            {activeSubTab === 'item' && <Layers className="w-5 h-5 text-leaf-500" />}
            {activeSubTab === 'proses' && <ShieldCheck className="w-5 h-5 text-leaf-500" />}
            Master {activeSubTab.toUpperCase()}
          </h3>
          <p className="text-xs text-natural-600">Tambah dan kelola daftar {activeSubTab} produksi.</p>
        </div>

        {/* 1. CUSTOMER SUB-TAB */}
        {activeSubTab === 'customer' && (
          <div className="space-y-4">
            <form onSubmit={handleAddCustomer} className="flex gap-2">
              <input
                type="text"
                placeholder="Masukkan nama Customer (misal: Honda, Toyota)..."
                value={customerInput}
                onChange={e => setCustomerInput(e.target.value)}
                className="flex-1 bg-natural-100 hover:bg-natural-50/50 border border-natural-250 focus:border-leaf-500 focus:bg-white text-natural-900 placeholder-natural-600 outline-none text-xs rounded-xl px-4 py-3 transition"
              />
              <button
                type="submit"
                className="bg-leaf-500 hover:bg-leaf-600 active:scale-95 text-white p-3 rounded-xl transition flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            <div className="border border-natural-100 rounded-xl overflow-hidden min-h-[120px] bg-natural-50">
              {customers.length === 0 ? (
                <div className="text-center py-8 text-natural-600 text-xs">Belum ada data customer.</div>
              ) : (
                <div className="divide-y divide-natural-200/60 max-h-[300px] overflow-y-auto">
                  {customers.map(cust => (
                    <div key={cust.id} className="flex items-center justify-between p-3.5 bg-white">
                      <span className="text-xs font-semibold text-natural-900">{cust.name}</span>
                      <button
                        onClick={() => handleDelete('customer', cust.id, cust.name)}
                        className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. MODEL SUB-TAB */}
        {activeSubTab === 'model' && (
          <div className="space-y-4">
            <form onSubmit={handleAddModel} className="flex gap-2">
              <input
                type="text"
                placeholder="Masukkan nama Model (misal: CVT-2023, Gear-A)..."
                value={modelInput}
                onChange={e => setModelInput(e.target.value)}
                className="flex-1 bg-natural-100 hover:bg-natural-50/50 border border-natural-250 focus:border-leaf-500 focus:bg-white text-natural-900 placeholder-natural-600 outline-none text-xs rounded-xl px-4 py-3 transition"
              />
              <button
                type="submit"
                className="bg-leaf-500 hover:bg-leaf-600 active:scale-95 text-white p-3 rounded-xl transition flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            <div className="border border-natural-100 rounded-xl overflow-hidden min-h-[120px] bg-natural-50">
              {models.length === 0 ? (
                <div className="text-center py-8 text-natural-600 text-xs">Belum ada data model.</div>
              ) : (
                <div className="divide-y divide-natural-200/60 max-h-[300px] overflow-y-auto">
                  {models.map(mdl => (
                    <div key={mdl.id} className="flex items-center justify-between p-3.5 bg-white">
                      <span className="text-xs font-semibold text-natural-900">{mdl.name}</span>
                      <button
                        onClick={() => handleDelete('model', mdl.id, mdl.name)}
                        className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. PROSES SUB-TAB */}
        {activeSubTab === 'proses' && (
          <div className="space-y-4">
            <form onSubmit={handleAddProcess} className="flex gap-2">
              <input
                type="text"
                placeholder="Masukkan jenis Proses (misal: Stamping, Welding, QC)..."
                value={processInput}
                onChange={e => setProcessInput(e.target.value)}
                className="flex-1 bg-natural-100 hover:bg-natural-50/50 border border-natural-250 focus:border-leaf-500 focus:bg-white text-natural-900 placeholder-natural-600 outline-none text-xs rounded-xl px-4 py-3 transition"
              />
              <button
                type="submit"
                className="bg-leaf-500 hover:bg-leaf-600 active:scale-95 text-white p-3 rounded-xl transition flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            <div className="border border-natural-100 rounded-xl overflow-hidden min-h-[120px] bg-natural-50">
              {processes.length === 0 ? (
                <div className="text-center py-8 text-natural-600 text-xs">Belum ada data proses. Buat dahulu agar bisa dihubungkan ke Item.</div>
              ) : (
                <div className="divide-y divide-natural-200/60 max-h-[300px] overflow-y-auto">
                  {processes.map(proc => (
                    <div key={proc.id} className="flex items-center justify-between p-3.5 bg-white">
                      <span className="text-xs font-semibold text-natural-900">{proc.name}</span>
                      <button
                        onClick={() => handleDelete('proses', proc.id, proc.name)}
                        className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. ITEM SUB-TAB WITH EMBEDDED PROCESS CHOOSER */}
        {activeSubTab === 'item' && (
          <div className="space-y-4">
            <form onSubmit={handleAddItem} className="space-y-3 bg-natural-50 border border-natural-200 p-4 rounded-2xl">
              <div>
                <label className="block text-xs font-bold text-natural-800 mb-1.5">Nama Item</label>
                <input
                  type="text"
                  placeholder="Masukkan nama Item (misal: Bumper Depan, Gear shaft)..."
                  value={itemInput}
                  onChange={e => setItemInput(e.target.value)}
                  className="w-full bg-white border border-natural-250 focus:border-leaf-500 text-natural-900 placeholder-natural-600 outline-none text-xs rounded-xl px-4 py-3 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-natural-800 mb-1 flex items-center gap-1.5">
                  Hubungkan dengan Proses (<span className="text-red-600 font-normal">bisa beberapa proses</span>)
                </label>
                <p className="text-[10px] text-natural-600 mb-2">
                  Pilih rentetan proses yang akan dilalui produk ini. Ini akan memfilter dropdown saat Input Produksi.
                </p>
                {processes.length === 0 ? (
                  <p className="text-[10px] text-red-600 italic">Silakan buat daftar Proses terlebih dahulu di sub-tab "Proses".</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-1 bg-white border border-natural-200 rounded-xl">
                    {processes.map(proc => {
                      const isSelected = itemSelectedProcesses.includes(proc.id);
                      return (
                        <button
                          key={proc.id}
                          type="button"
                          onClick={() => handleToggleProcessSelection(proc.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs leading-none font-semibold transition ${
                            isSelected
                              ? 'bg-leaf-600 text-white shadow-sm scale-95'
                              : 'bg-natural-100 hover:bg-natural-200 text-natural-800'
                          }`}
                        >
                          {proc.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!itemInput.trim()}
                className="w-full bg-leaf-500 hover:bg-leaf-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-xs py-3 rounded-xl transition shadow-sm active:scale-95"
              >
                Simpan Item Baru
              </button>
            </form>

            <div className="border border-natural-100 rounded-xl overflow-hidden min-h-[120px] bg-natural-50">
              {items.length === 0 ? (
                <div className="text-center py-8 text-natural-600 text-xs">Belum ada data item.</div>
              ) : (
                <div className="divide-y divide-natural-200/60 max-h-[300px] overflow-y-auto">
                  {items.map(itm => (
                    <div key={itm.id} className="p-3.5 bg-white flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-natural-900">{itm.name}</span>
                        <button
                          onClick={() => handleDelete('item', itm.id, itm.name)}
                          className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Show connected process list pills */}
                      <div className="flex flex-wrap gap-1">
                        {itm.processes && itm.processes.length > 0 ? (
                          itm.processes.map(pId => {
                            const foundProc = processes.find(p => p.id === pId);
                            return (
                              <span
                                key={pId}
                                className="text-[9px] bg-leaf-50 text-leaf-700 font-bold px-2 py-0.5 rounded-md border border-leaf-100"
                              >
                                {foundProc ? foundProc.name : 'Unknown Process'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-red-600 italic">Belum dihubungkan ke proses</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
