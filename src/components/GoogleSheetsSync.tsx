import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Database, FileSpreadsheet, LogIn, LogOut, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { initAuth, googleSignIn, logout as firebaseLogout } from '../lib/firebase';
import { findSpreadsheet, createSpreadsheet, syncMasterData } from '../lib/sheets';
import { Customer, Model, Item, Process } from '../types';

interface GoogleSheetsSyncProps {
  onTokenChange: (token: string | null) => void;
  onUserChange: (user: User | null) => void;
  customers: Customer[];
  models: Model[];
  items: Item[];
  processes: Process[];
}

export default function GoogleSheetsSync({
  onTokenChange,
  onUserChange,
  customers,
  models,
  items,
  processes
}: GoogleSheetsSyncProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'creating' | 'syncing' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCustomFirebase, setShowCustomFirebase] = useState(false);
  const [customConfigJson, setCustomConfigJson] = useState(localStorage.getItem('custom_firebase_config') || '');

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        onUserChange(currentUser);
        onTokenChange(currentToken);
        localStorage.setItem('sheets_token', currentToken);
        loadSpreadsheetDetails(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
        onUserChange(null);
        onTokenChange(null);
        localStorage.removeItem('sheets_token');
        setSpreadsheetId(null);
        setSpreadsheetUrl(null);
        setStatus('idle');
      }
    );
    return () => unsubscribe();
  }, []);

  const loadSpreadsheetDetails = async (authToken: string) => {
    setStatus('searching');
    setErrorMsg(null);
    try {
      // Check localStorage first to see if we stored a spreadsheet ID
      const savedId = localStorage.getItem('prod_spreadsheet_id');
      const savedUrl = localStorage.getItem('prod_spreadsheet_url');
      
      if (savedId && savedUrl) {
        setSpreadsheetId(savedId);
        setSpreadsheetUrl(savedUrl);
        setStatus('connected');
        return;
      }

      const sheet = await findSpreadsheet(authToken);
      if (sheet) {
        setSpreadsheetId(sheet.id);
        setSpreadsheetUrl(sheet.url);
        localStorage.setItem('prod_spreadsheet_id', sheet.id);
        localStorage.setItem('prod_spreadsheet_url', sheet.url);
        setStatus('connected');
      } else {
        setStatus('idle');
      }
    } catch (err: any) {
      console.error("Google Drive scanning error:", err);
      
      let rawMsg = err.message || '';
      let parsedGoogleError = '';
      let isApiDisabled = false;
      let projectId = 'aplikasi-monitoring-af88a';
      
      try {
        const custom = localStorage.getItem('custom_firebase_config');
        if (custom) {
          const parsed = JSON.parse(custom);
          if (parsed && parsed.projectId) {
            projectId = parsed.projectId;
          }
        }
      } catch (e) {}

      // Safe parse if message is JSON from Google API
      if (typeof rawMsg === 'string' && rawMsg.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(rawMsg);
          if (parsed && parsed.error) {
            parsedGoogleError = parsed.error.message || '';
          }
        } catch (_) {}
      }

      const checkStr = (parsedGoogleError || rawMsg || '').toLowerCase();
      
      if (
        checkStr.includes('has not been used') || 
        checkStr.includes('disabled') || 
        checkStr.includes('api_key_invalid') || 
        checkStr.includes('permission_denied') || 
        checkStr.includes('restricted') ||
        checkStr.includes('not enabled')
      ) {
        isApiDisabled = true;
      }

      let consoleUrl = `https://console.cloud.google.com/apis/library?project=${projectId}`;
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const foundUrls = checkStr.match(urlRegex);
      if (foundUrls && foundUrls.length > 0) {
        consoleUrl = foundUrls[0].replace(/[.,);'"]+$/, ''); // clean trailing chars
      }

      if (isApiDisabled) {
        setErrorMsg(
          `API Google Drive / Sheets belum diaktifkan pada proyek Firebase kustom Anda di Google Cloud.\n\n` +
          `Detail Error:\n${parsedGoogleError || rawMsg}\n\n` +
          `🔴 CARA MEMPERBAIKI:\n` +
          `1. Buka halaman pengaturan Google Cloud Console Anda.\n` +
          `2. Anda harus mencari dan mengaktifkan "Google Drive API" serta "Google Sheets API" secara manual.`
        );
      } else {
        setErrorMsg(
          `Gagal memindai Google Drive. Detail error:\n${parsedGoogleError || rawMsg || 'Pemeriksaan akses gagal.'}\n\n` +
          `Harap pastikan izin Google Drive and Sheets telah diaktifkan di Console Firebase/GCP Anda.`
        );
      }
      setStatus('error');
    }
  };

  const handleSignIn = async () => {
    setStatus('searching');
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        onUserChange(result.user);
        onTokenChange(result.accessToken);
        localStorage.setItem('sheets_token', result.accessToken);
        await loadSpreadsheetDetails(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign in error detail:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg(
          `Domain ini (${window.location.hostname}) tidak diizinkan oleh proyek Firebase default. ` +
          `Langkah perbaikan:\n` +
          `1. Jika Anda meng-host di Vercel/GitHub Pages, mendaftarkan "${window.location.hostname}" ke "Authorized Domains" di Firebase Console proyek Anda.\n` +
          `2. Atau gunakan opsi "Pengaturan Advanced" di bawah untuk memasukkan konfigurasi Firebase milik Anda sendiri.`
        );
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Jendela masuk (popup) diblokir oleh browser. Harap izinkan popup di browser Anda dan coba lagi.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Proses masuk dibatalkan karena jendela login ditutup.');
      } else {
        setErrorMsg(`Gagal masuk Google: ${err.message || 'Error tidak diketahui'}. Pastikan koneksi internet lancar dan periksa konfigurasi domain Anda.`);
      }
      setStatus('error');
    }
  };

  const handleSaveCustomConfig = () => {
    try {
      if (!customConfigJson.trim()) {
        localStorage.removeItem('custom_firebase_config');
        alert('Menggunakan kembali konfigurasi default AI Studio. Halaman akan dimuat ulang.');
        window.location.reload();
        return;
      }
      const parsed = JSON.parse(customConfigJson);
      if (!parsed.apiKey || !parsed.authDomain || !parsed.projectId) {
        alert('Format salah! Pastikan JSON konfigurasi Firebase memiliki minimal "apiKey", "authDomain", dan "projectId".');
        return;
      }
      localStorage.setItem('custom_firebase_config', JSON.stringify(parsed, null, 2));
      alert('Konfigurasi Firebase kustom berhasil disimpan. Halaman akan dijalankan ulang untuk menerapkan perubahan.');
      window.location.reload();
    } catch (e) {
      alert('Format JSON tidak valid! Silakan periksa kembali tanda koma atau tanda petik dua yang Anda gunakan.');
    }
  };

  const handleResetCustomConfig = () => {
    localStorage.removeItem('custom_firebase_config');
    setCustomConfigJson('');
    alert('Konfigurasi dibatalkan kembali ke bawaan AI Studio. Halaman akan dimuat ulang.');
    window.location.reload();
  };

  const handleCreateSheet = async () => {
    if (!token) return;
    setStatus('creating');
    setErrorMsg(null);
    try {
      const sheet = await createSpreadsheet(token);
      setSpreadsheetId(sheet.id);
      setSpreadsheetUrl(sheet.url);
      localStorage.setItem('prod_spreadsheet_id', sheet.id);
      localStorage.setItem('prod_spreadsheet_url', sheet.url);
      setStatus('connected');
      
      // Auto-sync existing master records
      if (customers.length > 0 || models.length > 0 || items.length > 0 || processes.length > 0) {
        await syncMasterData(sheet.id, token, customers, models, items, processes);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal membuat spreadsheet baru. Periksa koneksi atau izin.');
      setStatus('error');
    }
  };

  const handleSyncMasters = async () => {
    if (!token || !spreadsheetId) return;
    setStatus('syncing');
    setErrorMsg(null);
    try {
      await syncMasterData(spreadsheetId, token, customers, models, items, processes);
      setStatus('connected');
      alert('Master Data berhasil disinkronkan ke Google Sheets!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal menyinkronkan data master.');
      setStatus('error');
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseLogout();
      // local items are retained so users don't lose local setups
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-natural-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-leaf-100 p-2 rounded-xl text-leaf-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-natural-900 text-sm">Integrasi Google Sheets</h3>
            <p className="text-xs text-natural-600">Sinkronisasi data produksi otomatis</p>
          </div>
        </div>
        
        {user && (
          <button 
            onClick={handleSignOut}
            className="text-xs flex items-center gap-1 text-natural-600 hover:text-red-600 border border-natural-200 px-2.5 py-1 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        )}
      </div>

      {!user ? (
        <div>
          <p className="text-xs text-natural-700 leading-relaxed mb-4">
            Simpan data produksi Anda secara permanen. Hubungkan dengan akun Google Anda untuk membuat lembar pelacakan di Google Sheets.
          </p>

          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-leaf-600 text-white rounded-xl py-3 px-4 font-semibold text-sm hover:bg-leaf-700 active:scale-95 transition"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>Hubungkan Google Sheets</span>
          </button>

          <div className="mt-5 pt-4 border-t border-natural-100">
            <button
              onClick={() => setShowCustomFirebase(!showCustomFirebase)}
              className="text-xs text-leaf-600 hover:text-leaf-700 font-semibold flex items-center gap-1 transition"
            >
              {showCustomFirebase ? 'Sembunyikan Pengaturan Advanced' : 'Hosting di Vercel / GitHub Pages? (Pengaturan Advanced)'}
            </button>

            {showCustomFirebase && (
              <div className="mt-3 bg-natural-50 rounded-xl p-3.5 border border-natural-200 lg:p-4 space-y-3">
                <p className="text-[11px] text-natural-600 leading-relaxed">
                  Jika Anda menggunakan Vercel atau GitHub Pages, Google Sign-In bawaan AI Studio akan terblokir oleh Google/Firebase karena domain Anda berbeda dengan domain sandbox kami.
                </p>
                
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg text-[10px] leading-relaxed">
                  <strong>Solusi:</strong> Tambahkan domain <code>{window.location.hostname}</code> di halaman <strong>Authorized Domains</strong> Firebase Console proyek Anda, ATAU tempel Web SDK Config milik Firebase Anda sendiri di bawah:
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-natural-700 uppercase mb-1">
                    Konfigurasi Firebase Web SDK (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={customConfigJson}
                    onChange={(e) => setCustomConfigJson(e.target.value)}
                    placeholder={`{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "..."\n}`}
                    className="w-full text-[10px] font-mono bg-white border border-natural-300 rounded-lg p-2 focus:ring-1 focus:ring-leaf-500 focus:border-leaf-500"
                  />
                </div>

                <div className="flex gap-2 text-[11px]">
                  <button
                    onClick={handleSaveCustomConfig}
                    className="bg-leaf-600 hover:bg-leaf-700 text-white font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    Simpan & Reload
                  </button>
                  {localStorage.getItem('custom_firebase_config') && (
                    <button
                      onClick={handleResetCustomConfig}
                      className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      Reset Default
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* User profile small indicator */}
          <div className="flex items-center gap-2 bg-natural-50 p-2.5 rounded-xl border border-natural-100 mb-2">
            {user.photoURL ? (
              <img src={user.photoURL || undefined} alt={user.displayName || 'Google User'} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-natural-200 flex items-center justify-center text-xs font-bold">{user.displayName ? user.displayName[0] : 'U'}</div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-natural-950 truncate">{user.displayName || 'Pengguna Google'}</p>
              <p className="text-[10px] text-natural-600 truncate">{user.email}</p>
            </div>
          </div>

          {status === 'searching' && (
            <div className="flex items-center justify-center gap-2.5 py-4 text-natural-600">
              <RefreshCw className="w-4 h-4 animate-spin text-leaf-500" />
              <span className="text-xs">Memindai arsip produksi di Google Drive...</span>
            </div>
          )}

          {status === 'creating' && (
            <div className="flex items-center justify-center gap-2.5 py-4 text-natural-600">
              <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
              <span className="text-xs font-medium">Membuat Spreadsheet "Monitoring Produksi"...</span>
            </div>
          )}

          {status === 'syncing' && (
            <div className="flex items-center justify-center gap-2.5 py-4 text-natural-600">
              <RefreshCw className="w-4 h-4 animate-spin text-leaf-600" />
              <span className="text-xs">Menyinkronkan data master...</span>
            </div>
          )}

          {status === 'idle' && !spreadsheetId && (
            <div className="pt-2">
              <p className="text-xs text-natural-600 mb-3 bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl">
                TIDAK DITEMUKAN: Lembar "Monitoring Produksi" belum ada di akun Google Drive Anda.
              </p>
              <button
                onClick={handleCreateSheet}
                className="w-full bg-leaf-500 hover:bg-leaf-600 text-white rounded-xl py-2.5 font-semibold text-xs active:scale-95 transition shadow-sm"
              >
                Buat Spreadsheet Baru di Drive
              </button>
            </div>
          )}

          {spreadsheetId && (
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-2.5 bg-leaf-50 border border-leaf-100 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 text-leaf-500 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-leaf-800">
                  <span className="font-semibold block">Sistem Terintegrasi Google Sheets</span>
                  Data shift aktif akan otomatis diunggah ke spreadsheet ketika Anda menyelesaikan shift.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={spreadsheetUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-white text-natural-800 hover:bg-natural-50 text-xs font-semibold border border-natural-300 rounded-xl py-2.5 transition"
                >
                  Buka Spreadsheet
                </a>
                
                <button
                  onClick={handleSyncMasters}
                  disabled={status === 'syncing'}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-leaf-600 hover:bg-leaf-700 text-white text-xs font-semibold rounded-xl py-2.5 transition"
                >
                  <Database className="w-3.5 h-3.5" />
                  Backup Master Data
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex flex-col gap-2.5 text-stone-800 bg-red-50/75 border border-red-200 p-4 rounded-xl text-xs mt-2 leading-relaxed whitespace-pre-line">
              <div className="flex items-center gap-2 font-bold text-red-700 border-b border-red-100 pb-1.5 mb-1">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>Integrasi Google Sheets Terkendala</span>
              </div>
              
              <div className="text-stone-700 text-[11px] font-medium font-sans">
                {errorMsg}
              </div>

              {/* Quick resolution helper buttons if API is probably disabled or custom domain */}
              {(errorMsg.toLowerCase().includes('api') || errorMsg.toLowerCase().includes('google-apps') || errorMsg.toLowerCase().includes('drive') || errorMsg.toLowerCase().includes('sheet')) && (
                <div className="mt-2 space-y-2 border-t border-red-100 pt-2.5">
                  <p className="font-semibold text-red-800 text-[10px] uppercase tracking-wider">Langkah Cepat Perbaikan:</p>
                  
                  <div className="flex flex-col gap-1.5">
                    <a
                      href={`https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${JSON.parse(localStorage.getItem('custom_firebase_config') || '{}').projectId || 'aplikasi-monitoring-af88a'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-natural-50 border border-red-300 rounded-lg p-2.5 text-xs font-semibold text-rose-700 shadow-sm transition"
                    >
                      🚀 1. Klik Aktifkan Google Drive API
                    </a>
                    
                    <a
                      href={`https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=${JSON.parse(localStorage.getItem('custom_firebase_config') || '{}').projectId || 'aplikasi-monitoring-af88a'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-natural-50 border border-red-300 rounded-lg p-2.5 text-xs font-semibold text-emerald-700 shadow-sm transition"
                    >
                      🚀 2. Klik Aktifkan Google Sheets API
                    </a>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const t = token || localStorage.getItem('sheets_token');
                      if (t) {
                        loadSpreadsheetDetails(t);
                      } else {
                        handleSignIn();
                      }
                    }}
                    className="w-full mt-1 bg-leaf-600 hover:bg-leaf-700 text-white font-semibold rounded-lg py-2.5 text-xs transition active:scale-[0.98]"
                  >
                    🔄 Sudah Aktif? Klik Coba Hubungkan Kembali
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
