import React from 'react';
import { Customer, Model, Item, Process, ProductionEntry, ShiftStatus } from '../types';
import { Calendar, Download, Lock, CheckCircle2, Trash2, ArrowLeft, ArrowRight, Layers, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { appendProductionEntries } from '../lib/sheets';

interface DashboardTabProps {
  entries: ProductionEntry[];
  setEntries: (entries: ProductionEntry[]) => void;
  customers: Customer[];
  models: Model[];
  items: Item[];
  processes: Process[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  shiftStatus: ShiftStatus;
  setShiftStatus: (status: ShiftStatus) => void;
  googleToken: string | null;
  spreadsheetId: string | null;
}

export default function DashboardTab({
  entries,
  setEntries,
  customers,
  models,
  items,
  processes,
  selectedDate,
  setSelectedDate,
  shiftStatus,
  setShiftStatus,
  googleToken,
  spreadsheetId
}: DashboardTabProps) {

  // Helper names resolvers
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || id;
  const getModelName = (id: string) => models.find(m => m.id === id)?.name || id;
  const getItemName = (id: string) => items.find(i => i.id === id)?.name || id;
  const getProcessName = (id: string) => processes.find(p => p.id === id)?.name || id;

  // Filter entries of the selected date
  const todaysEntries = entries.filter(e => e.date === selectedDate);

  // Divide entries by shifts
  const shift1Entries = todaysEntries.filter(e => e.shift === '1');
  const shift2Entries = todaysEntries.filter(e => e.shift === '2');
  const shift3Entries = todaysEntries.filter(e => e.shift === '3');

  // Change date helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Lock a particular shift and sync if Sheets connected
  const handleLockShift = async (shift: '1' | '2' | '3', shiftEntriesArray: ProductionEntry[]) => {
    if (shiftEntriesArray.length === 0) {
      alert(`Sif ${shift} belum memiliki data inputan apapun.`);
      return;
    }

    const conf = window.confirm(
      `Konfirmasi Selesai Inputan untuk SIF ${shift}?\nTindakan ini akan mengunci seluruh data Sif ${shift} pada hari ini agar asisten shift berikutnya bisa mulai dengan bersih.\nData juga akan otomatis diunggah ke Google Sheets jika terhubung.`
    );
    if (!conf) return;

    // First unlock everything in that shift and flag as locked
    const updatedEntries = entries.map(e => {
      if (e.date === selectedDate && e.shift === shift) {
        return { ...e, isLocked: true };
      }
      return e;
    });

    setEntries(updatedEntries);
    localStorage.setItem('prod_entries', JSON.stringify(updatedEntries));

    // Update shift locked status
    const newStatus = { ...shiftStatus };
    if (shift === '1') newStatus.shift1Locked = true;
    if (shift === '2') newStatus.shift2Locked = true;
    if (shift === '3') newStatus.shift3Locked = true;
    setShiftStatus(newStatus);
    
    // Save shit status list keyed by date
    const allStatuses = JSON.parse(localStorage.getItem('prod_shift_statuses') || '{}');
    allStatuses[selectedDate] = newStatus;
    localStorage.setItem('prod_shift_statuses', JSON.stringify(allStatuses));

    // Google Sheets Backup
    if (googleToken && spreadsheetId) {
      try {
        await appendProductionEntries(
          spreadsheetId,
          googleToken,
          shiftEntriesArray,
          customers,
          models,
          items,
          processes
        );
        alert(`Sif ${shift} berhasil disimpan, dikunci, dan disinkronkan ke Google Sheets!`);
      } catch (err) {
        console.error(err);
        alert(`Sif ${shift} dikunci secara lokal, namun gagal sync Google Sheets. Cek koneksi Anda.`);
      }
    } else {
      alert(`Sif ${shift} berhasil diselesaikan dan dikunci secara lokal di memori HP.`);
    }
  };

  // Delete individual active entry
  const handleDeleteEntry = (id: string) => {
    if (!window.confirm('Hapus log input produksi ini?')) return;
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    localStorage.setItem('prod_entries', JSON.stringify(updated));
  };

  // CSV downloand for a specific shift
  const handleDownloadCSV = (shift: '1' | '2' | '3', shiftEntries: ProductionEntry[]) => {
    if (shiftEntries.length === 0) {
      alert(`Tidak ada data produksi untuk diunduh di SIF ${shift}.`);
      return;
    }

    // Compose CSV Headers
    const headers = [
      'No',
      'Tanggal',
      'Waktu',
      'Sif',
      'Proses Awal',
      'Customer',
      'Model',
      'Item',
      'Proses Item',
      'Hasil OK',
      'NG',
      'Proses Selanjutnya',
      'Status'
    ];

    // Map rows
    const rows = shiftEntries.map((e, idx) => [
      idx + 1,
      e.date,
      e.timestamp,
      `Shift ${e.shift}`,
      getProcessName(e.processInitId),
      getCustomerName(e.customerId),
      getModelName(e.modelId),
      getItemName(e.itemId),
      getProcessName(e.processItemId),
      e.okCount,
      e.ngCount,
      getProcessName(e.nextProcessId),
      e.isLocked ? 'Locked' : 'Active'
    ]);

    // CSV format assembly
    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Produksi_Sif_${shift}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateShiftSummary = (shiftEntries: ProductionEntry[]) => {
    const totalOK = shiftEntries.reduce((acc, curr) => acc + curr.okCount, 0);
    const totalNG = shiftEntries.reduce((acc, curr) => acc + curr.ngCount, 0);
    const totalScrapPercent = totalOK + totalNG > 0 
      ? ((totalNG / (totalOK + totalNG)) * 100).toFixed(1) 
      : '0.0';
    return { totalOK, totalNG, totalScrapPercent };
  };

  const renderShiftCard = (shift: '1' | '2' | '3', shiftEntries: ProductionEntry[], isLocked: boolean) => {
    const { totalOK, totalNG, totalScrapPercent } = calculateShiftSummary(shiftEntries);
    
    return (
      <div className="bg-white rounded-2xl border border-natural-200 shadow-sm overflow-hidden">
        {/* Header bar of shift card */}
        <div className="bg-natural-100 px-4 py-3.5 flex items-center justify-between border-b border-natural-200">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-natural-900 bg-natural-200 px-2.5 py-1 rounded-lg">
              SIF {shift}
            </span>
            {isLocked ? (
              <span className="flex items-center gap-1 text-[10px] bg-leaf-500 text-white font-bold px-2 py-0.5 rounded-full shadow-sm">
                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> Selesai & Terkunci
              </span>
            ) : (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Berjalan / Aktif
              </span>
            )}
          </div>
          
          <span className="text-[10px] font-bold text-natural-700">
            {shiftEntries.length} Records
          </span>
        </div>

        {/* Stats segment */}
        <div className="grid grid-cols-3 divide-x divide-natural-200 bg-stone-50 border-b border-natural-200 text-center py-2.5">
          <div>
            <p className="text-[9px] text-natural-600 uppercase font-bold">Total OK</p>
            <p className="text-sm font-extrabold text-leaf-600">{totalOK}</p>
          </div>
          <div>
            <p className="text-[9px] text-natural-600 uppercase font-bold">Total NG</p>
            <p className="text-sm font-extrabold text-orange-600">{totalNG}</p>
          </div>
          <div>
            <p className="text-[9px] text-natural-600 uppercase font-bold">% NG (Scrap)</p>
            <p className="text-sm font-extrabold text-neutral-600">{totalScrapPercent}%</p>
          </div>
        </div>

        {/* Entries detailed table */}
        <div className="p-3">
          {shiftEntries.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-natural-600 italic">
              Belum ada inputan produksi di Sif {shift} hari ini.
            </div>
          ) : (
            <div className="space-y-2 mb-3 max-h-[220px] overflow-y-auto pr-1">
              {shiftEntries.map((entry) => (
                <div 
                  key={entry.id} 
                  className={`border rounded-xl p-3 text-xs relative ${
                    entry.isLocked 
                      ? 'bg-stone-50/50 border-stone-200 text-natural-700' 
                      : 'bg-white border-leaf-100/80 shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-leaf-700 bg-leaf-100 px-2 py-0.5 rounded-md text-[10px]">
                      {entry.timestamp}
                    </span>
                    {!entry.isLocked && (
                      <button 
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-stone-400 hover:text-red-500 transition -mt-1 -mr-1 p-1"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px] pt-1">
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase font-bold">Customer & Model</span>
                      <span className="font-semibold">{getCustomerName(entry.customerId)} - {getModelName(entry.modelId)}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase font-bold">Item & Proses Kerja</span>
                      <span className="font-semibold">{getItemName(entry.itemId)} ({getProcessName(entry.processItemId)})</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase font-bold">OK/NG</span>
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="text-leaf-600">OK: {entry.okCount}</span>
                        <span className="text-stone-305">|</span>
                        <span className="text-orange-600">NG: {entry.ngCount}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase font-bold">Rute (Awal → Selanjutnya)</span>
                      <span className="font-semibold truncate block">
                        {getProcessName(entry.processInitId)} → {getProcessName(entry.nextProcessId)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons inside Card */}
          {shiftEntries.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-natural-100">
              <button
                type="button"
                onClick={() => handleDownloadCSV(shift, shiftEntries)}
                className="flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-2.5 px-3 rounded-xl transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </button>

              {isLocked ? (
                <button
                  type="button"
                  disabled
                  className="bg-leaf-50 border border-leaf-200 text-leaf-600 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 opacity-80"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Selesai
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLockShift(shift, shiftEntries)}
                  className="bg-leaf-600 hover:bg-leaf-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Selesai Sif
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calculate day total stats
  const totalOKToday = todaysEntries.reduce((sum, e) => sum + e.okCount, 0);
  const totalNGToday = todaysEntries.reduce((sum, e) => sum + e.ngCount, 0);
  const scrapPercentToday = totalOKToday + totalNGToday > 0 
    ? ((totalNGToday / (totalOKToday + totalNGToday)) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-4 pb-20">
      {/* Date picking calendar controllers */}
      <div className="bg-white border border-natural-200 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-natural-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-leaf-600" />
            Kalender Pemantauan
          </h3>
          <button 
            onClick={handleSetToday}
            className="text-[10px] font-bold text-leaf-600 bg-leaf-50 px-2.5 py-1 rounded-lg hover:bg-leaf-100 border border-leaf-200 transition"
          >
            Hari Ini
          </button>
        </div>

        <div className="grid grid-cols-12 gap-1.5 items-center">
          <button
            onClick={handlePrevDay}
            className="col-span-2 flex items-center justify-center bg-natural-100 hover:bg-natural-200 hover:text-stone-900 p-3 rounded-xl text-natural-700 transition"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="col-span-8 text-center text-xs font-bold bg-stone-50 border border-natural-250 py-3 rounded-xl text-natural-900 placeholder-natural-600 outline-none focus:border-leaf-500"
          />

          <button
            onClick={handleNextDay}
            className="col-span-2 flex items-center justify-center bg-natural-100 hover:bg-natural-200 hover:text-stone-900 p-3 rounded-xl text-natural-700 transition"
          >
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Daily cumulative widgets */}
      <div className="bg-leaf-600 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[10px] uppercase tracking-wider font-bold text-leaf-100">KUMULATIF PRODUKSI HARIAN</h4>
            <span className="text-xs font-semibold text-leaf-100/90 block mt-0.5">{selectedDate}</span>
          </div>
          <p className="text-[10px] opacity-90 border border-white/20 px-2.5 py-0.5 rounded-lg font-mono bg-white/10">
            Total {todaysEntries.length} logs
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
          <div>
            <span className="text-[9px] text-leaf-100 block uppercase font-bold">TOTAL OK</span>
            <span className="text-xl font-black">{totalOKToday} <span className="text-xs font-normal opacity-70">pcs</span></span>
          </div>
          <div>
            <span className="text-[9px] text-amber-200 block uppercase font-bold">TOTAL NG</span>
            <span className="text-xl font-black">{totalNGToday} <span className="text-xs font-normal opacity-70">pcs</span></span>
          </div>
          <div>
            <span className="text-[9px] text-stone-200 block uppercase font-bold">% SCRAP</span>
            <span className="text-xl font-black text-amber-100">{scrapPercentToday}%</span>
          </div>
        </div>
      </div>

      {/* Sheets connection reminder bar if not active */}
      {!googleToken && (
        <div className="bg-amber-50 border border-amber-200 cursor-pointer p-3.5 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[10px] text-amber-900 leading-relaxed">
            Google Sheets tidak terhubung. Data Anda hanya disimpan di memori HP. Hubungkan Google di tab <span className="font-bold underline">Master Data</span> agar tersimpan aman di Cloud Drive secara berkala.
          </p>
        </div>
      )}

      {/* Shift 1 Card */}
      {renderShiftCard('1', shift1Entries, shiftStatus.shift1Locked)}

      {/* Shift 2 Card */}
      {renderShiftCard('2', shift2Entries, shiftStatus.shift2Locked)}

      {/* Shift 3 Card */}
      {renderShiftCard('3', shift3Entries, shiftStatus.shift3Locked)}
    </div>
  );
}
