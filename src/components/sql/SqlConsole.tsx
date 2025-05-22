
import { useState, useEffect } from "react";
import { useDb, useDbChanges } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Square } from "lucide-react";

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth: string): number => {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
};

// Helper function to format column headers
const formatColumnHeader = (header: string): string => {
  return header
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export function SqlConsole() {
  const { db, loading, error } = useDb();
  const [sql, setSql] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [formattedHeaders, setFormattedHeaders] = useState<{[key: string]: string}>({});
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("results");
  const { toast } = useToast();

  
  useEffect(() => {
    const loadSavedData = async () => {
      if (!db) return;
      
      try {

        const historyQuery = await db.query(`SELECT value FROM sql_settings WHERE key = 'sql_history'`);
        if (historyQuery.rows?.length) {
          setSqlHistory(JSON.parse(historyQuery.rows[0].value));
        }
       
        await db.exec(`
          CREATE TABLE IF NOT EXISTS sql_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
        `);
        

        const queryResult = await db.query(`SELECT value FROM sql_settings WHERE key = 'last_query'`);
        if (queryResult.rows && queryResult.rows.length > 0) {
          setSql(queryResult.rows[0].value);
        } else {
       
          setSql("SELECT * FROM patients;");
        }
        
  
        const resultsQuery = await db.query(`SELECT value FROM sql_settings WHERE key = 'last_results'`);
        const columnsQuery = await db.query(`SELECT value FROM sql_settings WHERE key = 'last_columns'`);
        const headersQuery = await db.query(`SELECT value FROM sql_settings WHERE key = 'last_headers'`);
        
        if (resultsQuery.rows?.length && columnsQuery.rows?.length && headersQuery.rows?.length) {
          setResults(JSON.parse(resultsQuery.rows[0].value));
          setResultColumns(JSON.parse(columnsQuery.rows[0].value));
          setFormattedHeaders(JSON.parse(headersQuery.rows[0].value));
        }
      } catch (err) {
        console.error("Failed to load saved SQL data:", err);
      }
    };
    
    if (db && !loading) {
      loadSavedData();
    }
  }, [db, loading]);

  // useEffect(() => {
  //   if (db && sqlHistory.length) {
  //     saveSqlSettings('sql_history', sqlHistory);
  //   }
  // }, [sqlHistory, db]);
  
  // Function to save settings to PGlite
  // const saveSqlSettings = async (key: string, value: any) => {
  //   if (!db) return;
  //   try {
  //     await db.exec(
  //       `INSERT INTO sql_settings (key, value)
  //        VALUES (?, ?)
  //        ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  //       [key, typeof value === "object" ? JSON.stringify(value) : value]
  //     );
  //   } catch (err) {
  //     console.error(`Failed to save SQL setting ${key}:`, err);
  //   }
  // };
  
  
  // useEffect(() => {
  //   if (sql && db) {
  //     saveSqlSettings('last_query', sql);
  //   }
  // }, [sql, db]);

  
  const resetResults = async () => {
    if (!db) return;
    
    setResults([]);
    setResultColumns([]);
    setFormattedHeaders({});
    
    
    try {
      await db.exec(`
        DELETE FROM sql_settings 
        WHERE key IN ('last_results', 'last_columns', 'last_headers')
      `);
      
      toast({
        title: "Results cleared",
        description: "Query results have been reset",
      });
    } catch (err) {
      console.error("Failed to clear saved results:", err);
      toast({
        variant: "destructive",
        title: "Error clearing results",
        description: "Failed to reset query results",
      });
    }
  };

 
  const executeQuery = async () => {
    if (!db || loading || !sql.trim()) return;

    setIsExecuting(true);
    const startTime = performance.now();

    try {
    
      const result = await db.query(sql);
      
     
      const endTime = performance.now();
      setExecutionTime(endTime - startTime);
      
      
      if (result.rows && result.rows.length > 0) {
        const columns = Object.keys(result.rows[0]);
        
       
        const processedResults = result.rows.map(row => {
          const processedRow = { ...row };
          
 
          if (row.date_of_birth) {
            processedRow.age = calculateAge(row.date_of_birth);
          }
          
          return processedRow;
        });
        
        
        const headers: {[key: string]: string} = {};
        columns.forEach(col => {
          headers[col] = formatColumnHeader(col);
        });
        
      
        if (columns.includes('date_of_birth')) {
          headers['age'] = 'Age';
        }
        
        setFormattedHeaders(headers);
        setResults(processedResults);
        
      
        let reorderedColumns = [...columns];
        
        if (columns.includes('date_of_birth') && columns.includes('gender')) {
        
          reorderedColumns = reorderedColumns.filter(col => col !== 'age');
          
      
          const genderIndex = reorderedColumns.indexOf('gender');
          if (genderIndex !== -1) {
            reorderedColumns.splice(genderIndex + 1, 0, 'age');
          }
        } else if (columns.includes('date_of_birth')) {
          
          reorderedColumns.push('age');
        }
        
        setResultColumns(reorderedColumns);
        
     
        // await saveSqlSettings('last_results', processedResults);
        // await saveSqlSettings('last_columns', reorderedColumns);
        // await saveSqlSettings('last_headers', headers);
      } else if (result.rows) {
       
        setResultColumns([]);
        setFormattedHeaders({});
        setResults([]);
        
        
        await db.exec(`
          DELETE FROM sql_settings 
          WHERE key IN ('last_results', 'last_columns', 'last_headers')
        `);
      } else {
        
        setResultColumns(['rowCount']);
        const headers = { 'rowCount': 'Row Count' };
        setFormattedHeaders(headers);
        const queryResults = [{ rowCount: result.rowCount || 'Success' }];
        setResults(queryResults);
        
        
        // await saveSqlSettings('last_results', queryResults);
        // await saveSqlSettings('last_columns', ['rowCount']);
        // await saveSqlSettings('last_headers', headers);
      }

     
      setSqlHistory(prev => {
       
        if (!prev.includes(sql)) {
          const newHistory = [...prev, sql].slice(-10); 
          return newHistory;
        }
        return prev;
      });
      
      setActiveTab("results");

      toast({
        title: "Query executed successfully",
        description: `Completed in ${(endTime - startTime).toFixed(2)}ms`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Query failed",
        description: err instanceof Error ? err.message : "An unknown error occurred",
      });
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

 
  useDbChanges(async (message) => {
    if (message.type === 'patient-added' && activeTab === 'results') {
      if (sql.toLowerCase().includes('from patients')) {
      
        executeQuery();
      }
    }
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }
  };

  const loadHistoryItem = (item: string) => {
    setSql(item);
  };

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
    <div className="flex flex-col gap-4 animate-fade-in">
      <Card className="theme-transition">
        <CardHeader>
          <CardTitle className="text-2xl">SQL Console</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter SQL query..."
              className="h-32 font-mono resize-none theme-transition"
            />
            <div className="flex items-center justify-between">
              <Button 
                onClick={executeQuery} 
                disabled={loading || isExecuting || !sql.trim()}
                className="theme-transition"
              >
                {isExecuting ? "Executing..." : "Execute Query"}
              </Button>
              <div className="text-sm text-muted-foreground">
                {executionTime > 0 && `Last execution: ${executionTime.toFixed(2)}ms`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">Query History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="results" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="flex justify-end p-2 border-b">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={resetResults}
                  className="flex items-center gap-1"
                  disabled={results.length === 0}
                >
                  <Square className="h-4 w-4" />
                  Reset
                </Button>
              </div>
              <ScrollArea className="h-[400px] rounded-md theme-transition">
                <div className="overflow-auto">
                  {results.length > 0 ? (
                    <div className="w-full min-w-max">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            {resultColumns.map((column) => (
                              <th
                                key={column}
                                className="bg-muted px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap theme-transition"
                              >
                                {formattedHeaders[column] || formatColumnHeader(column)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {results.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {resultColumns.map((column) => (
                                <td
                                  key={`${rowIndex}-${column}`}
                                  className="px-4 py-2 text-sm whitespace-nowrap theme-transition"
                                >
                                  {row[column] !== null ? String(row[column]) : "NULL"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground theme-transition">
                        {isExecuting ? "Executing query..." : "No results to display"}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] rounded-md border theme-transition">
                {sqlHistory.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {sqlHistory.map((query, index) => (
                      <li 
                        key={index} 
                        className="px-4 py-3 hover:bg-muted cursor-pointer theme-transition"
                        onClick={() => loadHistoryItem(query)}
                      >
                        <p className="text-sm font-mono whitespace-pre-wrap">{query}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground theme-transition">No query history</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}