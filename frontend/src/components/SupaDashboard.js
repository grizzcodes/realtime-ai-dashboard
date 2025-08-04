import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Save, Trash2, Edit3, Database } from 'lucide-react';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://oozperqlomwranmdfhon.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9venBlcnFsb213cmFubWRmaG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjQ2MjMsImV4cCI6MjA2OTQwMDYyM30.Cv1Pw0JiQyObo-ZKuLyNSI3ezXbgPzeGpPhOfHcvI2g'
);

const TABLES = {
  leads: {
    name: 'Leads',
    icon: '🎯',
    columns: ['name', 'source', 'stage', 'confidence', 'notes'],
    types: { confidence: 'number' }
  },
  clients: {
    name: 'Clients', 
    icon: '🏢',
    columns: ['name', 'industry', 'status', 'notes'],
    types: {}
  },
  people: {
    name: 'People',
    icon: '👥', 
    columns: ['name', 'role', 'company', 'email'],
    types: {}
  },
  outreach: {
    name: 'Outreach',
    icon: '📧',
    columns: ['channel', 'content', 'response', 'next_step'],
    types: {}
  },
  logs: {
    name: 'Activity Logs',
    icon: '📝',
    columns: ['type', 'message', 'created_by', 'timestamp'],
    types: {}
  }
};

export default function SupaDashboard() {
  const [activeTable, setActiveTable] = useState('leads');
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [tempValue, setTempValue] = useState('');

  useEffect(() => {
    loadTableData();
  }, [activeTable]);

  const loadTableData = async () => {
    setIsLoading(true);
    try {
      const { data: tableData, error } = await supabase
        .from(activeTable)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(tableData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCell = async (rowId, column, value) => {
    try {
      const { error } = await supabase
        .from(activeTable)
        .update({ 
          [column]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', rowId);

      if (error) throw error;
      
      // Update local state
      setData(prevData => 
        prevData.map(row => 
          row.id === rowId ? { ...row, [column]: value } : row
        )
      );
      
      // Log the activity
      await logActivity('data_updated', `Updated ${column} in ${activeTable}`, rowId);
    } catch (error) {
      console.error('Error updating cell:', error);
    }
  };

  const addNewRow = async () => {
    try {
      const newRow = TABLES[activeTable].columns.reduce((acc, col) => {
        acc[col] = col === 'confidence' ? 50 : '';
        return acc;
      }, {});

      const { data: insertedData, error } = await supabase
        .from(activeTable)
        .insert([newRow])
        .select();

      if (error) throw error;
      
      setData(prevData => [insertedData[0], ...prevData]);
      await logActivity('data_added', `Added new row to ${activeTable}`, insertedData[0].id);
    } catch (error) {
      console.error('Error adding row:', error);
    }
  };

  const deleteRow = async (rowId) => {
    try {
      const { error } = await supabase
        .from(activeTable)
        .delete()
        .eq('id', rowId);

      if (error) throw error;
      
      setData(prevData => prevData.filter(row => row.id !== rowId));
      await logActivity('data_deleted', `Deleted row from ${activeTable}`, rowId);
    } catch (error) {
      console.error('Error deleting row:', error);
    }
  };

  const logActivity = async (type, message, sourceId = null) => {
    try {
      await supabase
        .from('logs')
        .insert([{
          type,
          message,
          source_id: sourceId,
          source_table: activeTable,
          created_by: 'dashboard_user'
        }]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleCellClick = (rowId, column, currentValue) => {
    setEditingCell(`${rowId}-${column}`);
    setTempValue(currentValue || '');
  };

  const handleCellSave = async (rowId, column) => {
    await updateCell(rowId, column, tempValue);
    setEditingCell(null);
    setTempValue('');
  };

  const handleKeyPress = (e, rowId, column) => {
    if (e.key === 'Enter') {
      handleCellSave(rowId, column);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setTempValue('');
    }
  };

  const formatCellValue = (value, column) => {
    if (!value) return '';
    if (column === 'timestamp' || column === 'created_at') {
      return new Date(value).toLocaleString();
    }
    if (column === 'confidence' && typeof value === 'number') {
      return `${value}%`;
    }
    return value;
  };

  const getStatusColor = (value, column) => {
    if (column === 'stage') {
      const colors = {
        new: 'bg-blue-500',
        contacted: 'bg-yellow-500', 
        demo: 'bg-purple-500',
        proposal: 'bg-orange-500',
        won: 'bg-green-500',
        lost: 'bg-red-500'
      };
      return colors[value] || 'bg-gray-500';
    }
    if (column === 'status') {
      const colors = {
        active: 'bg-green-500',
        paused: 'bg-yellow-500',
        lost: 'bg-red-500'
      };
      return colors[value] || 'bg-gray-500';
    }
    return '';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Database className="text-blue-400" size={32} />
        <div>
          <h1 className="text-3xl font-bold text-glow">SUPA Dashboard</h1>
          <p className="opacity-70">Live editable Supabase database</p>
        </div>
      </div>

      {/* Table Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {Object.entries(TABLES).map(([key, table]) => (
          <button
            key={key}
            onClick={() => setActiveTable(key)}
            className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTable === key
                ? 'bg-blue-500 bg-opacity-80 text-white'
                : 'btn-glass'
            }`}
          >
            <span>{table.icon}</span>
            {table.name}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {TABLES[activeTable].icon} {TABLES[activeTable].name}
          </h2>
          <span className="text-sm opacity-70">({data.length} rows)</span>
        </div>
        <button
          onClick={addNewRow}
          className="btn-glass px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={16} />
          Add Row
        </button>
      </div>

      {/* Data Table */}
      <div className="card-glass overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="opacity-70">Loading {activeTable} data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black bg-opacity-20">
                <tr>
                  {TABLES[activeTable].columns.map(column => (
                    <th key={column} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      {column.replace('_', ' ')}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white divide-opacity-10">
                {data.map((row, rowIndex) => (
                  <tr key={row.id} className="hover:bg-white hover:bg-opacity-5">
                    {TABLES[activeTable].columns.map(column => (
                      <td key={column} className="px-4 py-3">
                        {editingCell === `${row.id}-${column}` ? (
                          <input
                            type={TABLES[activeTable].types[column] === 'number' ? 'number' : 'text'}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyPress={(e) => handleKeyPress(e, row.id, column)}
                            onBlur={() => handleCellSave(row.id, column)}
                            className="w-full bg-transparent border border-blue-500 rounded px-2 py-1 text-sm"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(row.id, column, row[column])}
                            className="cursor-pointer hover:bg-white hover:bg-opacity-10 rounded px-2 py-1 min-h-[24px] flex items-center gap-2"
                          >
                            {getStatusColor(row[column], column) && (
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(row[column], column)}`}></div>
                            )}
                            <span className="text-sm">
                              {formatCellValue(row[column], column) || (
                                <span className="opacity-40 italic">click to edit</span>
                              )}
                            </span>
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="btn-glass p-1 rounded hover:bg-red-500 hover:bg-opacity-20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="opacity-70 mb-4">No data in {activeTable} table</p>
          <button
            onClick={addNewRow}
            className="btn-glass px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
          >
            <Plus size={16} />
            Add First Row
          </button>
        </div>
      )}
    </div>
  );
}
