import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<div>Dashboard</div>} />
            <Route path="/patients" element={<div>Patients</div>} />
            <Route path="/sql" element={<div>SQL Console</div>} />
          </Routes>
        </BrowserRouter>
  </QueryClientProvider>
);

export default App;
