import React, { useState } from 'react';
import Table from '../shared/Table';
import FormInput from '../shared/FormInput';

const Reports = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Mock report data
  const data = [
    { id: 1, period: '2023-10', category: 'Baking', totalItems: 45, value: 1250.00 },
    { id: 2, period: '2023-10', category: 'Packaging', totalItems: 120, value: 450.50 },
    { id: 3, period: '2023-09', category: 'Baking', totalItems: 42, value: 1100.00 },
  ];

  const columns = [
    { key: 'period', label: 'Period' },
    { key: 'category', label: 'Category' },
    { key: 'totalItems', label: 'Total Items' },
    { key: 'value', label: 'Inventory Value ($)', render: row => row.value.toFixed(2) },
  ];

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h1>Reports</h1>
        <div className="header-actions" style={{ alignItems: 'flex-end', gap: '10px' }}>
          <FormInput 
            type="date" 
            label="Start Date" 
            name="start" 
            value={dateRange.start}
            onChange={e => setDateRange({...dateRange, start: e.target.value})}
            style={{ marginBottom: 0 }}
          />
          <FormInput 
            type="date" 
            label="End Date" 
            name="end" 
            value={dateRange.end}
            onChange={e => setDateRange({...dateRange, end: e.target.value})}
            style={{ marginBottom: 0 }}
          />
          <button className="btn-primary" style={{ height: '42px' }}>Generate</button>
          <button className="btn-secondary" style={{ height: '42px' }}>Print</button>
        </div>
      </div>

      <div className="card">
        <h3>Monthly Inventory Summary</h3>
        <Table columns={columns} data={data} />
      </div>
    </div>
  );
};

export default Reports;
