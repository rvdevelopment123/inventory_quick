import React, { useState } from 'react';
import Table from '../shared/Table';
import Modal from '../shared/Modal';
import FormInput, { FormSelect } from '../shared/FormInput';
import { useNotification } from '../../context/NotificationContext';

const Items = () => {
  const [items, setItems] = useState([
    { id: 1, sku: 'ING-001', name: 'Flour', unit: 'kg', category: 'Baking', type: 'ingredient' },
    { id: 2, sku: 'ING-002', name: 'Sugar', unit: 'kg', category: 'Baking', type: 'ingredient' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const { addNotification } = useNotification();

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'type', label: 'Type' },
    { key: 'actions', label: 'Actions', sortable: false, render: (row) => (
      <div className="action-buttons">
        <button onClick={() => handleEdit(row)} className="btn-small">Edit</button>
        <button onClick={() => handleDelete(row.id)} className="btn-small btn-danger">Delete</button>
      </div>
    )},
  ];

  const handleEdit = (item) => {
    setCurrentItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure?')) {
      setItems(items.filter(i => i.id !== id));
      addNotification('Item deleted', 'success');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (currentItem.id) {
      setItems(items.map(i => i.id === currentItem.id ? currentItem : i));
      addNotification('Item updated', 'success');
    } else {
      setItems([...items, { ...currentItem, id: Date.now() }]);
      addNotification('Item created', 'success');
    }
    setIsModalOpen(false);
    setCurrentItem(null);
  };

  const openNew = () => {
    setCurrentItem({ sku: '', name: '', unit: '', category: '', type: 'ingredient' });
    setIsModalOpen(true);
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h1>Item Management</h1>
        <button onClick={openNew} className="btn-primary">Add New Item</button>
      </div>

      <Table columns={columns} data={items} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={currentItem?.id ? 'Edit Item' : 'New Item'}
      >
        {currentItem && (
          <form onSubmit={handleSave}>
            <FormInput 
              label="SKU" 
              name="sku" 
              value={currentItem.sku} 
              onChange={e => setCurrentItem({...currentItem, sku: e.target.value})}
              required
            />
            <FormInput 
              label="Name" 
              name="name" 
              value={currentItem.name} 
              onChange={e => setCurrentItem({...currentItem, name: e.target.value})}
              required
            />
            <FormInput 
              label="Category" 
              name="category" 
              value={currentItem.category} 
              onChange={e => setCurrentItem({...currentItem, category: e.target.value})}
              required
            />
            <FormSelect 
              label="Type" 
              name="type" 
              value={currentItem.type}
              onChange={e => setCurrentItem({...currentItem, type: e.target.value})}
              options={[
                { value: 'ingredient', label: 'Ingredient' },
                { value: 'finished_good', label: 'Finished Good' }
              ]}
              required
            />
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Items;
