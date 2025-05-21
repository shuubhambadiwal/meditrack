import { PGlite } from '@electric-sql/pglite';
import { useState, useEffect } from 'react';

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

// Create and initialize the database
export async function initializeDb() {
  try {
    // Use IndexedDB for persistence with a simple name
    const db = new PGlite('idb://meditrack');
    
    // Create the patients table if it doesn't exist
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
    
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Database connection singleton
let dbInstance: any = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await initializeDb();
  }
  return dbInstance;
}

// React hook for database operations
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

// Helper function to map SQL row to Patient object
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

// Helper function to convert Patient to SQL parameters
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

// Broadcast channel for cross-tab communication
const dbChannel = new BroadcastChannel('meditrack-db-channel');

// Function to broadcast data changes to other tabs
export function broadcastChange(type: string, data?: any) {
  dbChannel.postMessage({ type, data, timestamp: Date.now() });
}

// Hook to listen for changes from other tabs
export function useDbChanges(callback: (message: any) => void) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      callback(event.data);
    };

    dbChannel.addEventListener('message', handleMessage);

    return () => {
      dbChannel.removeEventListener('message', handleMessage);
    };
  }, [callback]);
}