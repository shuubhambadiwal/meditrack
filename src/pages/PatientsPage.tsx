import { PatientForm } from "@/components/patients/PatientForm";
import { useDb } from "@/lib/db";
import { useEffect, useState } from "react";

export default function PatientsPage() {
  const { db, loading } = useDb();
  const [isSettingUp, setIsSettingUp] = useState(true);
  
  // Set up form data persistence table
  useEffect(() => {
    const setupFormPersistence = async () => {
      if (!db || loading) return;
      
      try {
        await db.exec(`
          CREATE TABLE IF NOT EXISTS form_persistence (
            form_id TEXT PRIMARY KEY,
            form_data TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (err) {
        console.error("Failed to create form persistence table:", err);
      } finally {
        setIsSettingUp(false);
      }
    };
    
    setupFormPersistence();
  }, [db, loading]);

  if (loading || isSettingUp) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Patient Registration</h1>
        <p className="text-muted-foreground">Loading patient form...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Patient Registration</h1>
      <p className="text-muted-foreground">Register new patients in the system.</p>
      <PatientForm />
    </div>
  );
}
