export interface Customer {
  id: string;
  name: string;
}

export interface Model {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  processes: string[]; // Associated processes
}

export interface Process {
  id: string;
  name: string;
}

export interface ProductionEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:MM:SS
  shift: '1' | '2' | '3';
  processInitId: string; // Proses dahulu
  customerId: string;
  modelId: string;
  itemId: string;
  processItemId: string; // Proses sesuai item
  okCount: number;
  ngCount: number;
  nextProcessId: string;
  isLocked: boolean; // Shift finished
}

export interface ShiftStatus {
  date: string;
  shift1Locked: boolean;
  shift2Locked: boolean;
  shift3Locked: boolean;
}
