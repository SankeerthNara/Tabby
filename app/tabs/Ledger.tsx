"use client";

import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useRef, useState } from "react";
import { TONES } from "../ui";
import { gridTheme } from "../grid";

export type LedgerRow = {
  date: number;
  bill: string;
  person: string;
  email: string;
  direction: "Owes you" | "You owe";
  cents: number;
  currency: string;
  status: "Paid" | "Waiting" | "Cancelled";
  payout: string;
};

const money = (cents: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
// Open amounts per currency, e.g. "$22.19" or "$22.19 + €5.00".
const openTotal = (rows: LedgerRow[], direction: LedgerRow["direction"]) => {
  const sums = new Map<string, number>();
  for (const r of rows) if (r.direction === direction && r.status === "Waiting") sums.set(r.currency, (sums.get(r.currency) ?? 0) + r.cents);
  return [...sums].map(([cur, c]) => money(c, cur)).join(" + ") || money(0, "USD");
};

const PILL: Record<LedgerRow["status"], readonly string[]> = { Paid: TONES[1], Waiting: TONES[5], Cancelled: TONES[7] };

// Every request you've sent or received, in one sortable, searchable grid you can export.
export default function Ledger({ rows }: { rows: LedgerRow[] }) {
  const grid = useRef<AgGridReact<LedgerRow>>(null);
  const [query, setQuery] = useState("");
  const pinned = [
    { bill: "Still owed to you", total: openTotal(rows, "Owes you") },
    { bill: "You still owe", total: openTotal(rows, "You owe") },
  ] as unknown as LedgerRow[];

  const columns: ColDef<LedgerRow>[] = [
    { headerName: "Date", field: "date", width: 104, sort: "desc", valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "") },
    { headerName: "Bill", field: "bill", flex: 1.3, minWidth: 190, cellClass: (p) => (p.node.rowPinned ? "font-bold" : "font-semibold") },
    {
      headerName: "Person",
      field: "person",
      flex: 1.2,
      minWidth: 190,
      cellRenderer: (p: ICellRendererParams<LedgerRow>) =>
        p.data?.email ? (
          <span className="flex h-full flex-col justify-center leading-tight" title={p.data.email}>
            <span>{p.data.person}</span>
            <span className="truncate text-xs text-muted">{p.data.email}</span>
          </span>
        ) : null,
    },
    { headerName: "Direction", field: "direction", width: 112 },
    {
      headerName: "Amount",
      colId: "amount",
      width: 116,
      type: "rightAligned",
      valueGetter: (p) => (p.node?.rowPinned ? (p.data as unknown as { total: string }).total : p.data?.cents),
      valueFormatter: (p) => (typeof p.value === "number" ? money(p.value, p.data!.currency) : p.value),
      cellClass: "font-bold tabular-nums",
    },
    {
      headerName: "Status",
      field: "status",
      width: 116,
      cellRenderer: (p: ICellRendererParams<LedgerRow>) =>
        p.value ? (
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: PILL[p.value as LedgerRow["status"]][0], color: PILL[p.value as LedgerRow["status"]][1] }}>
            {p.value === "Paid" ? "Paid ✓" : p.value}
          </span>
        ) : null,
    },
    { headerName: "Payout", field: "payout", width: 128, cellClass: "text-xs text-muted" },
  ];

  return (
    <div className="rounded-[1.75rem] bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Ledger</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-56 rounded-full bg-canvas px-4 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            placeholder="Search bills, people, status"
            aria-label="Search the ledger"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-fg"
            onClick={() => grid.current?.api.exportDataAsCsv({ fileName: "tabby-ledger.csv", columnKeys: ["date", "bill", "person", "direction", "amount", "status", "payout"], processCellCallback: (p) => (p.column.getColId() === "date" && typeof p.value === "number" ? new Date(p.value).toISOString().slice(0, 10) : p.column.getColId() === "amount" && typeof p.value === "number" ? (p.value / 100).toFixed(2) : p.value) })}
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="mt-4">
        <AgGridReact<LedgerRow>
          ref={grid}
          theme={gridTheme}
          rowData={rows}
          pinnedBottomRowData={pinned}
          columnDefs={columns}
          defaultColDef={{ sortable: true, suppressMovable: true }}
          quickFilterText={query}
          rowHeight={56}
          domLayout="autoHeight"
          overlayNoRowsTemplate="No requests yet. Split a bill and they'll show up here."
        />
      </div>
    </div>
  );
}
