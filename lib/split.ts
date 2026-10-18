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

// How much of one receipt line a person had, e.g. 2 of "3 x Veg Biryani".
export type Portion = { name: string; units: number };

// assignments[i] = who had receipt.items[i] and how many units; empty means everyone shares it equally.
// Each line is split by units; tax, tip, fees and discounts in proportion to what each person ordered.
export function splitBill(receipt: Receipt, assignments: Portion[][], people: Person[], extraTipPercent = 0): Share[] {
  const shares: Share[] = people.map((p) => ({ ...p, lines: [], totalCents: 0 }));
  const idx = new Map(people.map((p, i) => [p.name, i]));

  receipt.items.forEach((item, i) => {
    const units = new Map<number, number>(); // person index -> units, merging duplicate names
    for (const { name, units: u } of assignments[i] ?? []) {
      const j = idx.get(name);
      if (j !== undefined && u > 0) units.set(j, (units.get(j) ?? 0) + u);
    }
    if (!units.size) people.forEach((_, j) => units.set(j, 1));
    const sharers = [...units.keys()];
    const weights = [...units.values()];
    const total = weights.reduce((a, b) => a + b, 0);
    const parts = allocate(toCents(item.price), weights);
    sharers.forEach((s, k) => {
      const label = weights[k] === total ? item.name : `${item.name} (${+weights[k].toFixed(2)}/${+total.toFixed(2)})`;
      if (parts[k]) shares[s].lines.push({ name: label, cents: parts[k] });
    });
  });

  const subtotals = shares.map((s) => s.lines.reduce((a, l) => a + l.cents, 0));
  const itemsTotal = subtotals.reduce((a, b) => a + b, 0);
  const receiptTotal = receipt.total > 0 ? toCents(receipt.total) : itemsTotal + toCents(receipt.tax) + toCents(receipt.tip);
  const extras = receiptTotal - itemsTotal + Math.round((itemsTotal * extraTipPercent) / 100);

  allocate(extras, subtotals).forEach((c, i) => c && shares[i].lines.push({ name: "Tax, tip & fees", cents: c }));
  shares.forEach((s) => (s.totalCents = s.lines.reduce((a, l) => a + l.cents, 0)));
  return shares;
}
