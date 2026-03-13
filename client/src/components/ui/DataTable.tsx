import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  paginated?: boolean;
  pageSize?: number;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  onRowClick,
  selectable = false,
  paginated = false,
  pageSize = 10,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedData = paginated
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 border-b-2 border-gray-200">
          <tr>
            {columns.map(column => (
              <th
                key={String(column.key)}
                className="px-4 py-3 text-left font-semibold text-gray-700"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, idx) => (
            <tr
              key={row.id}
              className="border-b hover:bg-gray-50 transition-colors"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(column => (
                <td key={String(column.key)} className="px-4 py-3 text-gray-700">
                  {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
