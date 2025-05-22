
import { useDb } from "@/lib/db";
import { useState, useEffect } from "react";

export function useFormPersistence(formId: string, initialData: any = {}) {
  const { db, loading } = useDb();
  const [formData, setFormData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved form data
  useEffect(() => {
    const loadFormData = async () => {
      if (!db || loading) return;
      
      try {
        // Get saved form data if it exists
        const result = await db.query(
          `SELECT form_data FROM form_persistence WHERE form_id = $1`, 
          [formId]
        );
        
        if (result.rows && result.rows.length > 0) {
          setFormData(JSON.parse(result.rows[0].form_data));
        }
      } catch (err) {
        console.error(`Failed to load form data for ${formId}:`, err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (db && !loading) {
      loadFormData();
    }
  }, [db, loading, formId]);

  // Save form data
  const saveFormData = async (data: any) => {
    if (!db) return;
    
    setFormData(data);
    
    try {
      // Use upsert to save form data
      await db.exec(`
        INSERT INTO form_persistence (form_id, form_data, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (form_id) 
        DO UPDATE SET form_data = $2, updated_at = CURRENT_TIMESTAMP
      `, [formId, JSON.stringify(data)]);
    } catch (err) {
      console.error(`Failed to save form data for ${formId}:`, err);
    }
  };
  
  // Clear form data
  const clearFormData = async () => {
    if (!db) return;
    
    setFormData(initialData);
    
    try {
      await db.exec(`DELETE FROM form_persistence WHERE form_id = $1`, [formId]);
    } catch (err) {
      console.error(`Failed to clear form data for ${formId}:`, err);
    }
  };

  return {
    formData,
    saveFormData,
    clearFormData,
    isLoading,
  };
}
