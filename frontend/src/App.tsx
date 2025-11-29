import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">DispoTool Dashboard</h1>
      </header>
      <main className="container mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Willkommen zum DispoTool
          </h2>
          <p className="text-gray-600">
            Das Dispositions-Tool für effiziente Ressourcenplanung.
          </p>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
