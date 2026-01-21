import React, { useState, useEffect } from 'react';
import Table from '../shared/Table';
import { useNotification } from '../../context/NotificationContext';

const Inventory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { addNotification } = useNotification();

  // Mock data fetch
  useEffect(() => {
    const fetchData = async () => {
      // Simulate API call
      setTimeout(() => {
        setData([
          { id: 1, sku: 'ING-001', name: 'Flour', quantity: 100, location: 'Main Warehouse', category: 'Baking' },
          { id: 2, sku: 'ING-002', name: 'Sugar', quantity: 50, location: 'Main Warehouse', category: 'Baking' },
          { id: 3, sku: 'PKG-001', name: 'Box', quantity: 200, location: 'Secondary Storage', category: 'Packaging' },
        ]);
        setLoading(false);
      }, 1000);
    };
    fetchData();
  }, []);

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Item Name' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Quantity', render: (row) => (
      <span className={row.quantity < 20 ? 'text-danger' : ''}>{row.quantity}</span>
    )},
    { key: 'location', label: 'Location' },
  ];

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(filter.toLowerCase()) || 
    item.sku.toLowerCase().includes(filter.toLowerCase())
  );

  const handleExport = () => {
    addNotification('Exporting to CSV...', 'info');
    // Implement CSV export logic here
  };

  if (loading) return <div>Loading inventory...</div>;

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h1>Inventory View</h1>
        <div className="header-actions">
          <input 
            type="text" 
            placeholder="Search items..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
          <button onClick={handleExport} className="btn-secondary">Export CSV</button>
        </div>
      </div>
      
      <Table 
        columns={columns} 
        data={filteredData} 
        itemsPerPage={10}
      />
    </div>
  );
};

export default Inventory;
