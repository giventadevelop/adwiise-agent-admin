'use client';

import React, { useState, useTransition } from 'react';
import AdminNavigation from '@/components/AdminNavigation';
import { ActionButton, RetailNav, fieldClass, labelClass } from '@/components/retail/RetailUi';
import { useAdminTenantId } from '../../AdminTenantContext';
import type { RetailLocationDTO } from '@/types/retail';
import { fetchRetailFuelRangeServer, fetchRetailLocationsServer, fetchRetailMetricsRangeServer } from '../retailServer';

type CompareRow = {
  location: RetailLocationDTO;
  sales: number;
  labor: number;
  waste: number;
  expectedProfit: number;
  actualProfit: number;
  gallons: number;
  fuelMargin: number;
};

function sum(values: Array<number | undefined>): number {
  return values.reduce<number>((total, value) => total + (value || 0), 0);
}

export default function RetailComparePage() {
  const tenantId = useAdminTenantId();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const tenantQuery = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';
  const showFuel = rows.some(row => row.location.retailerTypeCode === 'GAS_STATION');

  const load = () => {
    if (!fromDate || !toDate) {
      setError('Choose a start date and an end date.');
      return;
    }
    startTransition(async () => {
      setError('');
      const [locations, metrics, fuelDays] = await Promise.all([
        fetchRetailLocationsServer(tenantId),
        fetchRetailMetricsRangeServer(fromDate, toDate, tenantId),
        fetchRetailFuelRangeServer(fromDate, toDate, tenantId),
      ]);
      setRows(locations.map(location => {
        const days = metrics.filter(metric => metric.locationId === location.id);
        const fuel = fuelDays.filter(day => day.locationId === location.id);
        const gas = location.retailerTypeCode === 'GAS_STATION';
        return {
          location,
          sales: sum(days.map(day => day.salesUsd)),
          labor: sum(days.map(day => day.laborCostUsd)),
          waste: sum(days.map(day => day.wasteCostUsd)),
          expectedProfit: sum(days.map(day => day.expectedProfitUsd)),
          actualProfit: sum(days.map(day => day.actualProfitUsd)),
          gallons: gas ? sum(fuel.map(day => day.fuelGallonsSold)) : 0,
          fuelMargin: gas && fuel.length > 0
            ? sum(fuel.map(day => day.fuelMarginCentsPerGallon)) / fuel.length
            : 0,
        };
      }));
    });
  };

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6">
        <AdminNavigation currentPage="retail" />
      </div>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Compare stores</h1>
        <div className="mt-6">
          <RetailNav tenantQuery={tenantQuery} current="compare" />
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 grid gap-4 md:grid-cols-3 items-end">
          <label className={labelClass}>From
            <input type="date" className={fieldClass} value={fromDate} onChange={event => setFromDate(event.target.value)} />
          </label>
          <label className={labelClass}>To
            <input type="date" className={fieldClass} value={toDate} onChange={event => setToDate(event.target.value)} />
          </label>
          <ActionButton tone="orange" icon="chart" label={isPending ? 'Loading' : 'Load'} disabled={isPending} onClick={load} />
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 overflow-x-auto user-table-scroll-container bg-white rounded-lg shadow-md">
          <table className="min-w-full text-sm">
            <thead className="bg-orange-50 text-orange-900 text-left">
              <tr>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Pack</th>
                <th className="px-4 py-3">Sales</th>
                <th className="px-4 py-3">Labor</th>
                <th className="px-4 py-3">Waste</th>
                <th className="px-4 py-3">Expected profit</th>
                <th className="px-4 py-3">Actual profit</th>
                {showFuel && <th className="px-4 py-3">Gallons</th>}
                {showFuel && <th className="px-4 py-3">Fuel margin</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.location.id} className="border-t hover:bg-orange-50">
                  <td className="px-4 py-3">{row.location.locationCode}</td>
                  <td className="px-4 py-3">{row.location.retailerTypeCode}</td>
                  <td className="px-4 py-3">{row.sales.toFixed(2)}</td>
                  <td className="px-4 py-3">{row.labor.toFixed(2)}</td>
                  <td className="px-4 py-3">{row.waste.toFixed(2)}</td>
                  <td className="px-4 py-3">{row.expectedProfit.toFixed(2)}</td>
                  <td className="px-4 py-3">{row.actualProfit.toFixed(2)}</td>
                  {showFuel && <td className="px-4 py-3">{row.location.retailerTypeCode === 'GAS_STATION' ? row.gallons.toFixed(1) : ''}</td>}
                  {showFuel && <td className="px-4 py-3">{row.location.retailerTypeCode === 'GAS_STATION' ? row.fuelMargin.toFixed(1) : ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
