'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CopyIcon,
  CheckIcon,
  TableIcon,
  DownloadIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { SpreadsheetColumn, SpreadsheetRow, SpreadsheetArtifactMetadata } from '@/types/artifacts';

interface SpreadsheetArtifactViewProps {
  columns: SpreadsheetColumn[];
  rows: SpreadsheetRow[];
  title: string;
  metadata?: SpreadsheetArtifactMetadata;
  className?: string;
  isStreaming?: boolean;
  onUpdate?: (columns: SpreadsheetColumn[], rows: SpreadsheetRow[]) => void;
  editable?: boolean;
}

/**
 * Convert spreadsheet data to CSV string
 */
function toCSV(columns: SpreadsheetColumn[], rows: SpreadsheetRow[]): string {
  const header = columns.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',');
  const dataRows = rows.map(row => {
    return columns.map(col => {
      const value = row.cells[col.id];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      return String(value);
    }).join(',');
  });
  return [header, ...dataRows].join('\n');
}

/**
 * Spreadsheet Artifact View - Interactive table with editing capabilities
 */
export function SpreadsheetArtifactView({
  columns: initialColumns,
  rows: initialRows,
  title,
  metadata,
  className = '',
  isStreaming = false,
  onUpdate,
  editable = true,
}: SpreadsheetArtifactViewProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState(initialRows);
  const [copied, setCopied] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sort rows if needed
  const sortedRows = useMemo(() => {
    if (!sortColumn) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a.cells[sortColumn];
      const bVal = b.cells[sortColumn];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortColumn, sortDirection]);

  const handleCopy = useCallback(async () => {
    const csv = toCSV(columns, rows);
    await navigator.clipboard.writeText(csv);
    setCopied(true);
    toast.success('Copied as CSV!');
    setTimeout(() => setCopied(false), 2000);
  }, [columns, rows]);

  const handleDownload = useCallback(() => {
    const csv = toCSV(columns, rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [columns, rows, title]);

  const handleSort = useCallback((colId: string) => {
    if (sortColumn === colId) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colId);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const startEditing = useCallback((rowId: string, colId: string, currentValue: string | number | boolean | null) => {
    if (!editable) return;
    setEditingCell({ rowId, colId });
    setEditValue(currentValue?.toString() || '');
  }, [editable]);

  const finishEditing = useCallback(() => {
    if (!editingCell) return;

    const newRows = rows.map(row => {
      if (row.id === editingCell.rowId) {
        const col = columns.find(c => c.id === editingCell.colId);
        let value: string | number | boolean | null = editValue;

        // Type coercion based on column type
        if (col?.type === 'number') {
          const num = parseFloat(editValue);
          value = isNaN(num) ? null : num;
        } else if (col?.type === 'boolean') {
          value = editValue.toLowerCase() === 'true';
        }

        return {
          ...row,
          cells: { ...row.cells, [editingCell.colId]: value },
        };
      }
      return row;
    });

    setRows(newRows);
    setEditingCell(null);
    onUpdate?.(columns, newRows);
  }, [editingCell, editValue, rows, columns, onUpdate]);

  const addRow = useCallback(() => {
    const newRow: SpreadsheetRow = {
      id: `row-${Date.now()}`,
      cells: columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
    };
    const newRows = [...rows, newRow];
    setRows(newRows);
    onUpdate?.(columns, newRows);
  }, [columns, rows, onUpdate]);

  const deleteRow = useCallback((rowId: string) => {
    const newRows = rows.filter(r => r.id !== rowId);
    setRows(newRows);
    onUpdate?.(columns, newRows);
  }, [rows, columns, onUpdate]);

  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <TableIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {rows.length} rows • {columns.length} columns
              {isStreaming && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Loading...
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editable && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addRow}
              className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
              title="Add row"
            >
              <PlusIcon className="w-4 h-4" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Download as CSV"
          >
            <DownloadIcon className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-colors ${
              copied
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Copy as CSV"
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              {columns.map(col => (
                <th
                  key={col.id}
                  className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  style={{ minWidth: col.width || 120 }}
                  onClick={() => handleSort(col.id)}
                >
                  <div className="flex items-center gap-1">
                    {col.name}
                    {sortColumn === col.id && (
                      sortDirection === 'asc'
                        ? <ArrowUpIcon className="w-3 h-3" />
                        : <ArrowDownIcon className="w-3 h-3" />
                    )}
                  </div>
                  {col.type && (
                    <span className="text-[10px] text-gray-400 font-normal">
                      {col.type}
                    </span>
                  )}
                </th>
              ))}
              {editable && (
                <th className="w-10 px-2" />
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900/50">
            {sortedRows.map((row, rowIndex) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: rowIndex * 0.02 }}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
              >
                {columns.map(col => {
                  const value = row.cells[col.id];
                  const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;

                  return (
                    <td
                      key={col.id}
                      className="px-4 py-2.5 text-gray-900 dark:text-gray-100"
                      onDoubleClick={() => startEditing(row.id, col.id, value)}
                    >
                      {isEditing ? (
                        <input
                          type={col.type === 'number' ? 'number' : 'text'}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={finishEditing}
                          onKeyDown={e => {
                            if (e.key === 'Enter') finishEditing();
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="w-full px-2 py-1 rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span className={col.type === 'number' ? 'font-mono' : ''}>
                          {value === null || value === undefined ? (
                            <span className="text-gray-400">—</span>
                          ) : col.type === 'boolean' ? (
                            value ? '✓' : '✗'
                          ) : (
                            String(value)
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
                {editable && (
                  <td className="px-2">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {editable ? 'Double-click to edit • ' : ''}Click headers to sort
        </p>
      </div>
    </div>
  );
}

export default SpreadsheetArtifactView;
