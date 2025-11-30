function Dashboard() {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Willkommen zum DispoTool
        </h2>
        <p className="text-gray-600 mb-4">
          Das Dispositions-Tool für effiziente Ressourcenplanung.
        </p>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-2xl font-bold text-blue-600">0</div>
          <div className="text-gray-500 text-sm">Offene Aufträge</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-2xl font-bold text-green-600">0</div>
          <div className="text-gray-500 text-sm">Abgeschlossen</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-2xl font-bold text-purple-600">0</div>
          <div className="text-gray-500 text-sm">Monteure</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-2xl font-bold text-orange-600">0</div>
          <div className="text-gray-500 text-sm">Offene Rechnungen</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
