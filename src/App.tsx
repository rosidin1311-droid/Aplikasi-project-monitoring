import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, ClipboardPaste, Database } from 'lucide-react';

import { Customer, Model, Item, Process, ProductionEntry, ShiftStatus } from './types';
import DashboardTab from './components/DashboardTab';
import InputProduksiTab from './components/InputProduksiTab';
import MasterDataTab from './components/MasterDataTab';
import GoogleSheetsSync from './components/GoogleSheetsSync';
import logoImg from './assets/images/logo_produksi_1781996851386.jpg';

export default function App() {
  const [activeTab, setActiveTab2] = useState<'dashboard' | 'input' | 'master'>('input'); // Default to rapid input form so operators can work instantly!

  // Master States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

  // Production Logs
  const [entries, setEntries] = useState<ProductionEntry[]>([]);

  // Selected date defaults to today's date in local system time (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });

  // Current active typing shift
  const [activeShift, setActiveShift] = useState<'1' | '2' | '3'>('1');

  // Lock status of shifts of the selected date
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>({
    date: selectedDate,
    shift1Locked: false,
    shift2Locked: false,
    shift3Locked: false
  });

  // Google OAuth Sync States
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const storedCustomers = localStorage.getItem('prod_customers');
      const storedModels = localStorage.getItem('prod_models');
      const storedItems = localStorage.getItem('prod_items');
      const storedProcesses = localStorage.getItem('prod_processes');
      const storedEntries = localStorage.getItem('prod_entries');
      const savedSpreadsheetId = localStorage.getItem('prod_spreadsheet_id');

      if (storedCustomers) setCustomers(JSON.parse(storedCustomers));
      if (storedModels) setModels(JSON.parse(storedModels));
      if (storedItems) setItems(JSON.parse(storedItems));
      if (storedProcesses) setProcesses(JSON.parse(storedProcesses));
      if (storedEntries) setEntries(JSON.parse(storedEntries));
      if (savedSpreadsheetId) setSpreadsheetId(savedSpreadsheetId);

      // Default Setup of some simple master data if completely empty so the user feels right at home!
      if (!storedCustomers && !storedModels && !storedItems && !storedProcesses) {
        const initCustomers: Customer[] = [
          { id: '1', name: 'Astra Honda Motor' },
          { id: '2', name: 'Yamaha Indonesia' },
          { id: '3', name: 'Suzuki Indomobil' }
        ];
        const initModels: Model[] = [
          { id: '1', name: 'Vario 160' },
          { id: '2', name: 'NMAX Turbo' },
          { id: '3', name: 'GSX-R150' }
        ];
        const initProcesses: Process[] = [
          { id: '1', name: 'Stamping / Press' },
          { id: '2', name: 'Welding / Las' },
          { id: '3', name: 'Painting / Cat' },
          { id: '4', name: 'Assembly / Perakitan' },
          { id: '5', name: 'Quality Inspection' }
        ];
        // Connect all processes to some default items
        const initItems: Item[] = [
          { id: '1', name: 'Frame Body / Rasis Utama', processes: ['1', '2', '5'] },
          { id: '2', name: 'Fuel Tank / Tangki Bahan Bakar', processes: ['1', '2', '3', '5'] },
          { id: '3', name: 'Side Panel / Cover Samping', processes: ['1', '3', '4', '5'] }
        ];

        setCustomers(initCustomers);
        setModels(initModels);
        setProcesses(initProcesses);
        setItems(initItems);

        localStorage.setItem('prod_customers', JSON.stringify(initCustomers));
        localStorage.setItem('prod_models', JSON.stringify(initModels));
        localStorage.setItem('prod_processes', JSON.stringify(initProcesses));
        localStorage.setItem('prod_items', JSON.stringify(initItems));
      }
    } catch (e) {
      console.error('Error loading Master Data from LocalStorage:', e);
    }
  }, []);

  // Update shift lock statuses when date changes
  useEffect(() => {
    try {
      const allShiftStatuses = JSON.parse(localStorage.getItem('prod_shift_statuses') || '{}');
      if (allShiftStatuses[selectedDate]) {
        setShiftStatus(allShiftStatuses[selectedDate]);
      } else {
        // Find if they are existing locked items on that day to deduce lock state retroactively
        const dayEntries = entries.filter(e => e.date === selectedDate);
        const shift1Locked = dayEntries.some(e => e.shift === '1' && e.isLocked);
        const shift2Locked = dayEntries.some(e => e.shift === '2' && e.isLocked);
        const shift3Locked = dayEntries.some(e => e.shift === '3' && e.isLocked);

        setShiftStatus({
          date: selectedDate,
          shift1Locked,
          shift2Locked,
          shift3Locked
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedDate, entries]);

  // Hook to automatically detect current hours and suggest shift
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr >= 7 && hr < 15) {
      setActiveShift('1');
    } else if (hr >= 15 && hr < 23) {
      setActiveShift('2');
    } else {
      setActiveShift('3');
    }
  }, []);

  const handleAddProductionEntry = (newEntry: ProductionEntry) => {
    const updated = [newEntry, ...entries];
    setEntries(updated);
    localStorage.setItem('prod_entries', JSON.stringify(updated));
  };

  // Lift token & spreadsheet ID updates from Google Sheet Sync component
  const handleTokenChange = (token: string | null) => {
    setGoogleToken(token);
  };
  const handleUserChange = (user: User | null) => {
    setGoogleUser(user);
  };

  return (
    <div className="min-h-screen bg-stone-100/40 text-stone-800 flex flex-col items-center">
      
      {/* Phone wrap container */}
      <div className="w-full max-w-md bg-stone-50 min-h-screen flex flex-col shadow-xl border-x border-natural-200 relative">
        
        {/* Application Elegant Branding Header */}
        <header className="bg-white border-b border-natural-200 text-natural-900 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full border border-natural-200 overflow-hidden bg-[#0A0714] shrink-0 flex items-center justify-center shadow-sm">
              <img 
                src={logoImg} 
                alt="Monitoring Produksi Logo" 
                className="w-full h-full object-cover scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight uppercase text-natural-900">PROTRACK</h1>
              <p className="text-[10px] text-natural-650 uppercase tracking-wider font-bold">Monitoring Produksi</p>
            </div>
          </div>
          <div className="bg-leaf-100 border border-leaf-500/20 px-2.5 py-1 rounded-full text-[9px] font-bold text-leaf-500 uppercase tracking-widest">
            Mobile ONLY
          </div>
        </header>

        {/* Content Body view area with animation */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardTab
                  entries={entries}
                  setEntries={setEntries}
                  customers={customers}
                  models={models}
                  items={items}
                  processes={processes}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  shiftStatus={shiftStatus}
                  setShiftStatus={setShiftStatus}
                  googleToken={googleToken}
                  spreadsheetId={spreadsheetId}
                />
              )}

              {activeTab === 'input' && (
                <InputProduksiTab
                  customers={customers}
                  models={models}
                  items={items}
                  processes={processes}
                  selectedDate={selectedDate}
                  activeShift={activeShift}
                  setActiveShift={setActiveShift}
                  onAddEntry={handleAddProductionEntry}
                />
              )}

              {activeTab === 'master' && (
                <div className="space-y-4">
                  {/* Google Sheets Sync dashboard available on Master configuration */}
                  <GoogleSheetsSync
                    onTokenChange={handleTokenChange}
                    onUserChange={handleUserChange}
                    customers={customers}
                    models={models}
                    items={items}
                    processes={processes}
                  />

                  <MasterDataTab
                    customers={customers}
                    setCustomers={setCustomers}
                    models={models}
                    setModels={setModels}
                    items={items}
                    setItems={setItems}
                    processes={processes}
                    setProcesses={setProcesses}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Persistent Bottom Tab Navigation for Mobile */}
        <nav className="sticky bottom-0 left-0 right-0 bg-white border-t border-natural-200 pt-2 pb-3.5 px-4 grid grid-cols-3 gap-1 z-30 shadow-md">
          <button
            onClick={() => setActiveTab2('dashboard')}
            className={`flex flex-col items-center justify-center gap-1.5 py-1.5 rounded-xl transition ${
              activeTab === 'dashboard'
                ? 'text-leaf-600 bg-leaf-50 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px]">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab2('input')}
            className={`flex flex-col items-center justify-center gap-1.5 py-1.5 rounded-xl transition ${
              activeTab === 'input'
                ? 'text-leaf-600 bg-leaf-50 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <ClipboardPaste className="w-5 h-5" />
            <span className="text-[10px]">Input</span>
          </button>

          <button
            onClick={() => setActiveTab2('master')}
            className={`flex flex-col items-center justify-center gap-1.5 py-1.5 rounded-xl transition ${
              activeTab === 'master'
                ? 'text-leaf-600 bg-leaf-50 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Database className="w-5 h-5" />
            <span className="text-[10px]">Master data</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
