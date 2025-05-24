import { useEffect, useState } from "react";
import { useDb, useDbChanges, mapRowToPatient } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Dashboard() {
  const { db, loading, error } = useDb();
  const [stats, setStats] = useState({
    totalPatients: 0,
    recentPatients: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    if (!db || loading) return;

    setIsLoading(true);

    try {
      // Get total patient count
      const totalCount = await db.query(`SELECT COUNT(*) FROM patients`);
      const totalPatients = parseInt(totalCount.rows[0].count);
      
      // Get patients added in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const isoDate = sevenDaysAgo.toISOString();
      
      const recentCount = await db.query(
        `SELECT COUNT(*) FROM patients WHERE created_at > $1`,
        [isoDate]
      );
      const recentPatients = parseInt(recentCount.rows[0].count);
      
      setStats({
        totalPatients,
        recentPatients,
      });
    } catch (err) {
      console.error("Failed to fetch statistics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load stats on component mount
  useEffect(() => {
    if (db && !loading) {
      fetchStats();
    }
  }, [db, loading]);

  // Listen for changes from other tabs
  useDbChanges((message) => {
    if (message.type === 'patient-added') {
      fetchStats();
    }
  });

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-destructive">
          Failed to load database: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 animate-fade-in">
      <Card className="theme-transition">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? (
              <div className="h-6 w-16 animate-pulse bg-muted rounded"></div>
            ) : (
              stats.totalPatients
            )}
          </div>
          <p className="text-xs text-muted-foreground">Registered patients</p>
        </CardContent>
      </Card>
      
      <Card className="theme-transition">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Recent Patients</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-muted-foreground"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 3v18" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? (
              <div className="h-6 w-16 animate-pulse bg-muted rounded"></div>
            ) : (
              stats.recentPatients
            )}
          </div>
          <p className="text-xs text-muted-foreground">Added in the last 7 days</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 theme-transition">
        <CardHeader>
          <CardTitle>Welcome to MediTrack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              This patient management system lets you register patients and query their data using SQL.
              All data is stored in your browser using PGlite.
            </p>
            <h3 className="text-lg font-medium">Key Features</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>You can Register new patients.</li>
              <li>Query patient data using raw SQL in the SQL Console</li>
              <li>Persist patient data across page refreshes</li>
              <li>Data is synchronized across browser tabs automatically</li>
            </ul>
            <h3 className="text-lg font-medium">Get Started</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>In this Dashboard, the total and last week patients count will be there & info about this project.</li>
              <li>In the Patients section, register new patients. Un-register form are also persist on refresh. You can Reset form using clear form button.</li>
              <li>Query results will be shown in the table with pagination in SQL Console. Query history for each unique command, persist on refresh & synced.</li>
              <li>Toggle between light and dark mode using the theme button. Also it is Responsive(Desktop, Tablet, Mobile).</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}