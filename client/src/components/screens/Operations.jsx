import React, { useState } from 'react';
import FormInput, { FormSelect } from '../shared/FormInput';
import { useNotification } from '../../context/NotificationContext';

const Operations = () => {
  const [operationType, setOperationType] = useState('stock_in');
  const [formData, setFormData] = useState({
    itemId: '',
    quantity: '',
    source: '',
    destination: '',
    reason: ''
  });
  const { addNotification } = useNotification();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate
    if (formData.quantity <= 0) {
      addNotification('Quantity must be positive', 'error');
      return;
    }
    
    // Simulate API call
    console.log('Processing:', operationType, formData);
    addNotification('Transaction processed successfully', 'success');
    setFormData({ itemId: '', quantity: '', source: '', destination: '', reason: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="screen-container">
      <h1>Inventory Operations</h1>
      
      <div className="tabs">
        <button 
          className={`tab ${operationType === 'stock_in' ? 'active' : ''}`}
          onClick={() => setOperationType('stock_in')}
        >
          Stock In
        </button>
        <button 
          className={`tab ${operationType === 'stock_out' ? 'active' : ''}`}
          onClick={() => setOperationType('stock_out')}
        >
          Stock Out
        </button>
        <button 
          className={`tab ${operationType === 'transfer' ? 'active' : ''}`}
          onClick={() => setOperationType('transfer')}
        >
          Transfer
        </button>
      </div>

      <div className="operation-form-card">
        <form onSubmit={handleSubmit}>
          <h3>{operationType.replace('_', ' ').toUpperCase()}</h3>
          
          <FormSelect
            label="Item"
            name="itemId"
            value={formData.itemId}
            onChange={handleChange}
            options={[
              { value: '1', label: 'Flour' },
              { value: '2', label: 'Sugar' }
            ]}
            required
          />

          <FormInput
            label="Quantity"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            required
            min="1"
          />

          {operationType === 'stock_in' && (
             <FormSelect
               label="To Location"
               name="destination"
               value={formData.destination}
               onChange={handleChange}
               options={[
                 { value: '1', label: 'Main Warehouse' },
                 { value: '2', label: 'Secondary Storage' }
               ]}
               required
             />
          )}

          {operationType === 'stock_out' && (
            <>
              <FormSelect
               label="From Location"
               name="source"
               value={formData.source}
               onChange={handleChange}
               options={[
                 { value: '1', label: 'Main Warehouse' },
                 { value: '2', label: 'Secondary Storage' }
               ]}
               required
             />
             <FormInput
               label="Reason"
               name="reason"
               value={formData.reason}
               onChange={handleChange}
               required
             />
            </>
          )}

          {operationType === 'transfer' && (
            <>
              <FormSelect
               label="From Location"
               name="source"
               value={formData.source}
               onChange={handleChange}
               options={[
                 { value: '1', label: 'Main Warehouse' },
                 { value: '2', label: 'Secondary Storage' }
               ]}
               required
             />
              <FormSelect
               label="To Location"
               name="destination"
               value={formData.destination}
               onChange={handleChange}
               options={[
                 { value: '1', label: 'Main Warehouse' },
                 { value: '2', label: 'Secondary Storage' }
               ]}
               required
             />
            </>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-primary">Process Transaction</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Operations;
