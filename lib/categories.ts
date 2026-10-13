export const CATEGORIES: [string, string][] = [
  ["food", "Food and drinks"], ["transport", "Petrol and transportation"], ["car_installment", "Car installment"],
  ["car_maintenance", "Car maintenance"], ["toll_parking", "Toll and parking"], ["shopping", "Shopping"],
  ["online", "Online purchases"], ["bills", "Bills and utilities"], ["phone_internet", "Phone and internet"],
  ["insurance", "Insurance"], ["family", "Family"], ["entertainment", "Entertainment"], ["health", "Health"],
  ["education", "Education"], ["debt_repayment", "Debt repayment"], ["savings", "Savings"], ["other", "Other"],
];
export const METHODS: [string, string][] = [
  ["cash", "Cash"], ["debit_card", "Debit card"], ["credit_card", "Credit card"],
  ["bank_transfer", "Bank transfer"], ["e_wallet", "E-wallet"], ["other", "Other"],
];
export const INCOME_TYPES = ["salary", "bonus", "freelance", "allowance", "other"] as const;
export const CATEGORY_KEYS = CATEGORIES.map((c) => c[0]) as [string, ...string[]];
export const METHOD_KEYS = METHODS.map((c) => c[0]) as [string, ...string[]];
export const QUICK: { label: string; d: string; c: string; e: number }[] = [
  { label: "Lunch", d: "Lunch", c: "food", e: 1 }, { label: "Petrol", d: "Petrol", c: "transport", e: 1 },
  { label: "Toll", d: "Toll", c: "toll_parking", e: 1 }, { label: "Parking", d: "Parking", c: "toll_parking", e: 1 },
  { label: "Online shopping", d: "Online shopping", c: "online", e: 0 },
];
