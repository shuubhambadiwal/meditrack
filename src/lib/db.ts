
import { PGlite } from '@electric-sql/pglite';
import { useState, useEffect, useCallback } from 'react';

// Define our patient schema
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  insuranceProvider: string;
  insuranceNumber: string;
  medicalConditions: string;
  medications: string;
  allergies: string;
  createdAt: string;
  updatedAt: string;
}


export async function initializeDb() {
  try {
    // Use IndexedDB for persistence with a simple name
    const db = new PGlite('idb://meditrack');
    
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL, 
        date_of_birth TEXT NOT NULL,
        gender TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        insurance_provider TEXT,
        insurance_number TEXT,
        medical_conditions TEXT,
        medications TEXT,
        allergies TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    

    await db.exec(`
      CREATE TABLE IF NOT EXISTS form_persistence (
        form_id TEXT PRIMARY KEY,
        form_data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    
 
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sql_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}


let dbInstance: any = null;
let dbChannel: BroadcastChannel;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await initializeDb();
  }
  return dbInstance;
}


export function useDb() {
  const [db, setDb] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initDb = async () => {
      try {
        const database = await getDb();
        if (isMounted) {
          setDb(database);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize database'));
          setLoading(false);
        }
      }
    };

    initDb();

    return () => {
      isMounted = false;
    };
  }, []);

  return { db, loading, error };
}


export function mapRowToPatient(row: any): Patient {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    insuranceProvider: row.insurance_provider || '',
    insuranceNumber: row.insurance_number || '',
    medicalConditions: row.medical_conditions || '',
    medications: row.medications || '',
    allergies: row.allergies || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}


export function patientToSqlParams(patient: Patient): any[] {
  return [
    patient.id,
    patient.firstName,
    patient.lastName,
    patient.dateOfBirth,
    patient.gender,
    patient.email,
    patient.phone,
    patient.address,
    patient.insuranceProvider,
    patient.insuranceNumber,
    patient.medicalConditions,
    patient.medications,
    patient.allergies,
    patient.createdAt,
    patient.updatedAt
  ];
}


export async function saveToPGlite(db: any, tableName: string, key: string, value: any) {
  if (!db) return;
  
  try {
    const now = new Date().toISOString();
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    if (tableName === 'form_persistence') {

      await db.query(`
        INSERT INTO form_persistence (form_id, form_data, updated_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (form_id) 
        DO UPDATE SET form_data = $2, updated_at = $3
      `, [key, stringValue, now]);
    } else if (tableName === 'sql_settings') {

      await db.query(`
        INSERT INTO sql_settings (key, value, updated_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, updated_at = $3
      `, [key, stringValue, now]);
    }
  } catch (err) {
    console.error(`Failed to save data to ${tableName}:`, err);
    throw err;
  }
}


function getBroadcastChannel() {
  if (typeof window === 'undefined') return null;
  
  if (!dbChannel) {
    try {
      dbChannel = new BroadcastChannel('meditrack-db-channel');
    } catch (err) {
      console.error('Failed to create BroadcastChannel:', err);
      return null;
    }
  }
  return dbChannel;
}


export function broadcastChange(type: string, data?: any) {
  const channel = getBroadcastChannel();
  if (!channel) return;
  
  channel.postMessage({ type, data, timestamp: Date.now() });
}


export function useDbChanges(callback: (message: any) => void) {
  
  useEffect(() => {
    const channel = getBroadcastChannel();
    if (!channel) return;

    const handleMessage = (event: MessageEvent) => {
      callback(event.data);
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
    };
  }, [callback]); 
}