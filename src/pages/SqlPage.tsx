
import { SqlConsole } from "@/components/sql/SqlConsole";
import { useDb } from "@/lib/db";
import { useEffect, useState } from "react";

export default function SqlPage() {
  const { db, loading } = useDb();
  const [isSettingUp, setIsSettingUp] = useState(true);
  
  // Set up SQL settings table
  useEffect(() => {
    const setupSqlPersistence = async () => {
      if (!db || loading) return;
      
      try {
        await db.exec(`
          CREATE TABLE IF NOT EXISTS sql_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (err) {
        console.error("Failed to create SQL settings table:", err);
      } finally {
        setIsSettingUp(false);
      }
    };
    
    setupSqlPersistence();
  }, [db, loading]);

  if (loading || isSettingUp) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">SQL Console</h1>
        <p className="text-muted-foreground">Loading SQL console...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">SQL Console</h1>
      <p className="text-muted-foreground">Execute SQL queries against the patient database.</p>
      <SqlConsole />
    </div>
  );
}
