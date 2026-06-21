import { ProductionEntry, Customer, Model, Item, Process } from '../types';

export interface SheetsSyncState {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  isSyncing: boolean;
  error: string | null;
}

/**
 * Helper to fetch with auth token
 */
async function sheetsFetch(url: string, token: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Google API Error (${res.status}): ${errText}`);
    throw new Error(errText || `Request failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Searches Google Drive for an existing "Monitoring Produksi" spreadsheet
 */
export async function findSpreadsheet(token: string): Promise<{ id: string; url: string } | null> {
  const query = encodeURIComponent("name = 'Monitoring Produksi' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;
  const data = await sheetsFetch(url, token);
  
  if (data.files && data.files.length > 0) {
    return {
      id: data.files[0].id,
      url: data.files[0].webViewLink,
    };
  }
  return null;
}

/**
 * Creates a brand new spreadsheet with pre-configured sheets (tabs) for monitoring
 */
export async function createSpreadsheet(token: string): Promise<{ id: string; url: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const body = {
    properties: {
      title: 'Monitoring Produksi',
    },
    sheets: [
      { properties: { title: 'Daftar_Produksi' } },
      { properties: { title: 'Master_Customer' } },
      { properties: { title: 'Master_Model' } },
      { properties: { title: 'Master_Item' } },
      { properties: { title: 'Master_Proses' } },
    ],
  };

  const spreadsheet = await sheetsFetch(url, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize spreadsheet tables by adding headers to each sheet
  try {
    await initializeHeaders(spreadsheetId, token);
  } catch (error) {
    console.error('Failed to initialize sheet headers, continuing anyway:', error);
  }

  return { id: spreadsheetId, url: spreadsheetUrl };
}

/**
 * Populate headers for clean initial look
 */
async function initializeHeaders(spreadsheetId: string, token: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  
  const body = {
    valueInputOption: 'RAW',
    data: [
      {
        range: 'Daftar_Produksi!A1:N1',
        values: [[
          'ID_Entry', 'Tanggal', 'Waktu', 'Shift', 
          'Proses_Awal', 'Customer', 'Model', 'Item_Nama', 
          'Proses_Item', 'OK', 'NG', 'Next_Proses', 
          'Status_Lock', 'Waktu_Selesai_Shift'
        ]]
      },
      {
        range: 'Master_Customer!A1:B1',
        values: [['ID', 'Nama_Customer']]
      },
      {
        range: 'Master_Model!A1:B1',
        values: [['ID', 'Nama_Model']]
      },
      {
        range: 'Master_Item!A1:C1',
        values: [['ID', 'Nama_Item', 'Daftar_Proses_Associated']]
      },
      {
        range: 'Master_Proses!A1:B1',
        values: [['ID', 'Nama_Proses']]
      }
    ],
  };

  await sheetsFetch(url, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Appends a list of production entries to 'Daftar_Produksi' sheet
 */
export async function appendProductionEntries(
  spreadsheetId: string,
  token: string,
  entries: ProductionEntry[],
  // Master references to resolve name displays
  customers: Customer[],
  models: Model[],
  items: Item[],
  processes: Process[]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar_Produksi!A:N:append?valueInputOption=USER_ENTERED`;
  
  // Quick resolution helpers to avoid ugly raw IDs in Excel
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || id;
  const getModelName = (id: string) => models.find(m => m.id === id)?.name || id;
  const getItemName = (id: string) => items.find(i => i.id === id)?.name || id;
  const getProcessName = (id: string) => processes.find(p => p.id === id)?.name || id;

  const rowValues = entries.map(entry => {
    return [
      entry.id,
      entry.date,
      entry.timestamp,
      `Shift ${entry.shift}`,
      getProcessName(entry.processInitId),
      getCustomerName(entry.customerId),
      getModelName(entry.modelId),
      getItemName(entry.itemId),
      // processItem could be raw or process matched
      getProcessName(entry.processItemId),
      entry.okCount,
      entry.ngCount,
      getProcessName(entry.nextProcessId),
      entry.isLocked ? 'Locked / Shift Selesai' : 'Aktif',
      entry.isLocked ? new Date().toISOString() : '-'
    ];
  });

  const body = {
    values: rowValues,
  };

  await sheetsFetch(url, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Synchronizes the complete local Master Data to Google Sheets to keep backups
 */
export async function syncMasterData(
  spreadsheetId: string,
  token: string,
  customers: Customer[],
  models: Model[],
  items: Item[],
  processes: Process[]
): Promise<void> {
  // We use batchUpdate or clear then put. Clear is cleaner for masters to avoid duplicates!
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`;
  const clearBody = {
    ranges: [
      'Master_Customer!A2:B',
      'Master_Model!A2:B',
      'Master_Item!A2:C',
      'Master_Proses!A2:B'
    ]
  };

  await sheetsFetch(clearUrl, token, {
    method: 'POST',
    body: JSON.stringify(clearBody)
  });

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const dataPayload: any[] = [];

  if (customers.length > 0) {
    dataPayload.push({
      range: `Master_Customer!A2:B${customers.length + 1}`,
      values: customers.map(c => [c.id, c.name])
    });
  }
  if (models.length > 0) {
    dataPayload.push({
      range: `Master_Model!A2:B${models.length + 1}`,
      values: models.map(m => [m.id, m.name])
    });
  }
  if (items.length > 0) {
    dataPayload.push({
      range: `Master_Item!A2:C${items.length + 1}`,
      values: items.map(i => [i.id, i.name, i.processes.join(', ')])
    });
  }
  if (processes.length > 0) {
    dataPayload.push({
      range: `Master_Proses!A2:B${processes.length + 1}`,
      values: processes.map(p => [p.id, p.name])
    });
  }

  if (dataPayload.length > 0) {
    await sheetsFetch(updateUrl, token, {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload,
      }),
    });
  }
}
