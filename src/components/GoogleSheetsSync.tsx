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
      console.error(err);
      setErrorMsg('Gagal memindai Google Drive. Silakan coba masuk kembali.');
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
      console.error(err);
      setErrorMsg('Gagal masuk Google. Pastikan izin popup diberikan.');
      setStatus('error');
    }
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
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl text-xs mt-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
