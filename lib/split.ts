// Pure money math. All amounts are integer cents so shares always add up to the receipt total.

export type Item = { name: string; price: number };
export type Receipt = { merchant: string; currency: string; items: Item[]; tax: number; tip: number; total: number };
export type Person = { name: string; email: string };
export type Line = { name: string; cents: number };
export type Share = Person & { lines: Line[]; totalCents: number };

const toCents = (dollars: number) => Math.round(dollars * 100);

// Split `amount` cents by `weights` using largest remainder, so the parts sum exactly to `amount`.
export function allocate(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) weights = weights.map(() => 1);
  const total = weights.reduce((a, b) => a + b, 0);
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);
  const raw = weights.map((w) => (abs * w) / total);
  const parts = raw.map(Math.floor);
  let left = abs - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k++, left--) parts[order[k % order.length][1]]++;
  return parts.map((p) => p * sign);
}

// assignments[i] = names sharing receipt.items[i]; empty means everyone shares it.
// Tax, tip, fees and discounts are spread in proportion to what each person ordered.
export function splitBill(receipt: Receipt, assignments: string[][], people: Person[], extraTipPercent = 0): Share[] {
  const shares: Share[] = people.map((p) => ({ ...p, lines: [], totalCents: 0 }));
  const idx = new Map(people.map((p, i) => [p.name, i]));

  receipt.items.forEach((item, i) => {
    const who = (assignments[i] ?? []).map((n) => idx.get(n)).filter((n) => n !== undefined);
    const sharers = who.length ? [...new Set(who)] : people.map((_, j) => j);
    const parts = allocate(toCents(item.price), sharers.map(() => 1));
    const label = sharers.length > 1 ? `${item.name} (1/${sharers.length})` : item.name;
    sharers.forEach((s, k) => parts[k] && shares[s].lines.push({ name: label, cents: parts[k] }));
  });

  const subtotals = shares.map((s) => s.lines.reduce((a, l) => a + l.cents, 0));
  const itemsTotal = subtotals.reduce((a, b) => a + b, 0);
  const receiptTotal = receipt.total > 0 ? toCents(receipt.total) : itemsTotal + toCents(receipt.tax) + toCents(receipt.tip);
  const extras = receiptTotal - itemsTotal + Math.round((itemsTotal * extraTipPercent) / 100);

  allocate(extras, subtotals).forEach((c, i) => c && shares[i].lines.push({ name: "Tax, tip & fees", cents: c }));
  shares.forEach((s) => (s.totalCents = s.lines.reduce((a, l) => a + l.cents, 0)));
  return shares;
}
