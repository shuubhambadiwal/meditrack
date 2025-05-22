import { useState, useEffect } from "react";
import { useDb, useDbChanges } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  // Replace underscores with spaces and capitalize each word
  return header
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export function SqlConsole() {
  const { db, loading, error } = useDb();
  const [sql, setSql] = useState<string>("SELECT * FROM patients;");
  const [results, setResults] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [formattedHeaders, setFormattedHeaders] = useState<{[key: string]: string}>({});
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("results");
  const { toast } = useToast();

  // Function to execute SQL
  const executeQuery = async () => {
    if (!db || loading || !sql.trim()) return;

    setIsExecuting(true);
    const startTime = performance.now();

    try {
      // Execute the query using PGlite's query method
      const result = await db.query(sql);
      
      // Capture execution time
      const endTime = performance.now();
      setExecutionTime(endTime - startTime);
      
      // Extract and set columns if we have results and rows
      if (result.rows && result.rows.length > 0) {
        const columns = Object.keys(result.rows[0]);
        
        // Process results - add age if date_of_birth is present
        const processedResults = result.rows.map(row => {
          const processedRow = { ...row };
          
          // Add calculated age if date_of_birth exists
          if (row.date_of_birth) {
            processedRow.age = calculateAge(row.date_of_birth);
          }
          
          return processedRow;
        });
        
        // Create formatted headers mapping
        const headers: {[key: string]: string} = {};
        columns.forEach(col => {
          headers[col] = formatColumnHeader(col);
        });
        
        // Add 'age' to headers
        if (columns.includes('date_of_birth')) {
          headers['age'] = 'Age';
        }
        
        setFormattedHeaders(headers);
        setResults(processedResults);
        
        // Reorder columns to place age right after gender if both exist
        let reorderedColumns = [...columns];
        
        if (columns.includes('date_of_birth') && columns.includes('gender')) {
          // Remove age if it was already there
          reorderedColumns = reorderedColumns.filter(col => col !== 'age');
          
          // Find index of gender and insert age after it
          const genderIndex = reorderedColumns.indexOf('gender');
          if (genderIndex !== -1) {
            reorderedColumns.splice(genderIndex + 1, 0, 'age');
          }
        } else if (columns.includes('date_of_birth')) {
          // Just add age at the end if gender doesn't exist
          reorderedColumns.push('age');
        }
        
        setResultColumns(reorderedColumns);
      } else if (result.rows) {
        // Query returned an empty result set
        setResultColumns([]);
        setFormattedHeaders({});
        setResults([]);
      } else {
        // Query was successful but didn't return rows (e.g., INSERT)
        setResultColumns(['rowCount']);
        setFormattedHeaders({ 'rowCount': 'Row Count' });
        setResults([{ rowCount: result.rowCount || 'Success' }]);
      }

      // Update history
      setSqlHistory(prev => {
        // Only add to history if it's a new query
        if (!prev.includes(sql)) {
          return [...prev, sql].slice(-10); // Keep last 10 queries
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

  // Listen for changes from other tabs
  useDbChanges(async (message) => {
    if (message.type === 'patient-added' && activeTab === 'results') {
      if (sql.toLowerCase().includes('from patients')) {
        // Re-execute the query to refresh the results
        executeQuery();
      }
    }
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Execute on Ctrl+Enter or Cmd+Enter
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
              <ScrollArea className="h-[400px] rounded-md border theme-transition">
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