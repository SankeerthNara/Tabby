"use client";

import type { CellValueChangedEvent, ColDef, EditableCallbackParams, ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useRef } from "react";
import { addItem, removeItem, setExtra, setItem, type Person, type Portion, type Receipt, type Share } from "@/lib/split";
import { gridTheme } from "./grid";

// One row per receipt line; pinned rows at the bottom carry tax, tip and what each person pays.
type Row = { i: number; kind: "item" | "tax" | "tip" | "extra" | "total"; name: string; price: number | null; units: Record<string, number | string> };

type Props = {
  receipt: Receipt;
  assignments: Portion[][];
  people: Person[];
  shares: Share[];
  extraTip: number;
  fmt: (cents: number) => string;
  tone: (name: string) => string[]; // [background, text] from TONES
  onChange: (r: Receipt, a: Portion[][]) => void;
};

// The review step as a spreadsheet: fix any price, name, or who had how many, and every share re-splits instantly (no AI call).
export default function ReviewGrid({ receipt, assignments, people, shares, extraTip, fmt, tone, onChange }: Props) {
  const grid = useRef<AgGridReact<Row>>(null);
  // Units per person on line i; no assignment means everyone shared it equally.
  const unitsOf = (i: number) => people.map((p) => ({ name: p.name, units: assignments[i]?.length ? (assignments[i].find((x) => x.name === p.name)?.units ?? 0) : 1 }));
  const money = (v: unknown) => {
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  };

  const rows: Row[] = receipt.items.map((it, i) => ({
    i,
    kind: "item",
    name: it.name,
    price: it.price,
    units: Object.fromEntries(unitsOf(i).map((u) => [u.name, +u.units.toFixed(2)])),
  }));
  const pinned: Row[] = [
    { i: -1, kind: "tax", name: "Tax", price: receipt.tax, units: {} },
    { i: -1, kind: "tip", name: "Tip on receipt", price: receipt.tip, units: {} },
    ...(extraTip > 0 ? [{ i: -1, kind: "extra" as const, name: `Extra tip you asked for (${+extraTip.toFixed(2)}%)`, price: null, units: {} }] : []),
    { i: -1, kind: "total", name: "Each pays", price: null, units: Object.fromEntries(shares.map((s) => [s.name, fmt(s.totalCents)])) },
  ];

  const editable = (p: EditableCallbackParams<Row>, col: "name" | "price" | "person") =>
    p.data?.kind === "item" || (col === "price" && (p.data?.kind === "tax" || p.data?.kind === "tip"));

  const columns: ColDef<Row>[] = [
    { headerName: "Item", field: "name", flex: 2, minWidth: 190, editable: (p) => editable(p, "name"), cellClass: (p) => (p.data?.kind === "total" ? "font-bold" : "") },
    {
      headerName: "Price",
      field: "price",
      width: 112,
      type: "rightAligned",
      editable: (p) => editable(p, "price"),
      valueFormatter: (p) => (p.value === null || p.value === undefined ? "" : fmt(Math.round(p.value * 100))),
      valueParser: (p) => money(p.newValue) ?? p.oldValue,
    },
    ...people.map(
      (person): ColDef<Row> => ({
        headerName: person.name || "?",
        colId: `person:${person.name}`,
        minWidth: 104,
        flex: 1,
        type: "rightAligned",
        headerStyle: { color: tone(person.name)[1] },
        editable: (p) => editable(p, "person"),
        valueGetter: (p) => p.data?.units[person.name] ?? "",
        valueSetter: (p) => {
          const v = money(p.newValue);
          if (v === null || !p.data) return false;
          p.data.units = { ...p.data.units, [person.name]: v };
          return true;
        },
        cellStyle: (p): Record<string, string | number> | null =>
          p.data?.kind === "item" && p.value ? { background: tone(person.name)[0], color: tone(person.name)[1], fontWeight: 600 } : p.data?.kind === "total" ? { fontWeight: 700 } : null,
      }),
    ),
    {
      headerName: "",
      colId: "remove",
      width: 56,
      sortable: false,
      cellRenderer: (p: ICellRendererParams<Row>) =>
        p.data?.kind === "item" ? (
          <span className="flex h-full items-center">
            <button
              className="grid size-8 place-items-center rounded-full text-lg text-muted hover:bg-canvas hover:text-[#b91c1c]"
              aria-label={`Remove ${p.data.name}`}
              onClick={() => onChange(removeItem(receipt, p.data!.i), assignments.filter((_, j) => j !== p.data!.i))}
            >
              ×
            </button>
          </span>
        ) : null,
    },
  ];

  const changed = (e: CellValueChangedEvent<Row>) => {
    const row = e.data;
    const col = e.colDef.colId ?? e.colDef.field;
    if (row.kind === "tax" || row.kind === "tip") return onChange(setExtra(receipt, row.kind, row.price ?? 0), assignments);
    const it = receipt.items[row.i];
    if (col === "name") return onChange(setItem(receipt, row.i, { ...it, name: String(row.name).trim() || it.name }), assignments);
    if (col === "price") return onChange(setItem(receipt, row.i, { ...it, price: row.price ?? it.price }), assignments);
    // A person's units on this line; nobody picked means everyone shares it equally.
    const next = Object.entries(row.units)
      .map(([name, units]) => ({ name, units: Number(units) }))
      .filter((x) => x.units > 0);
    onChange(receipt, receipt.items.map((_, j) => (j === row.i ? next : (assignments[j] ?? []))));
  };

  return (
    <div>
      <AgGridReact<Row>
        ref={grid}
        theme={gridTheme}
        rowData={rows}
        pinnedBottomRowData={pinned}
        columnDefs={columns}
        defaultColDef={{ sortable: false, suppressMovable: true, resizable: false }}
        getRowId={(p) => `${p.data.kind}-${p.data.i}`}
        singleClickEdit
        stopEditingWhenCellsLoseFocus
        domLayout="autoHeight"
        onCellValueChanged={changed}
      />
      <button
        className="mt-3 text-sm font-semibold text-blue hover:underline"
        onClick={() => {
          onChange(addItem(receipt, { name: "New item", price: 0 }), [...assignments, []]);
          // Open the new line's name for typing once the grid has the row.
          setTimeout(() => grid.current?.api.startEditingCell({ rowIndex: receipt.items.length, colKey: "name" }), 50);
        }}
      >
        + Add a line
      </button>
    </div>
  );
}
