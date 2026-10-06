import type { QuickAddResult, TransactionType } from "@/types";
import { DEFAULT_CATEGORIES } from "./defaultCategories";

// ─── Income keywords ──────────────────────────────────────────────────────────
const INCOME_KEYWORDS = [
  "salary", "stipend", "income", "freelance", "received", "got",
  "refund", "cashback", "dividend", "interest", "bonus", "award",
  "prize", "gift received", "credit",
];

// ─── Money-given keywords ──────────────────────────────────────────────────────
const MONEY_GIVEN_KEYWORDS = [
  "gave", "given to", "sent to", "paid to", "lent", "borrowed by",
  "mummy", "papa", "mom", "dad", "mother", "father", "brother", "sister",
  "didi", "bhai", "bhaiya",
];

// ─── Money-received keywords ──────────────────────────────────────────────────
const MONEY_RECEIVED_KEYWORDS = [
  "from rahul", "from ankit", "from friend", "borrowed from", "returned by",
];

// ─── Smart type detection ─────────────────────────────────────────────────────
function detectType(input: string): { type: TransactionType; confidence: "high" | "medium" | "low" } {
  const lower = input.toLowerCase();

  // Check income first
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) {
      return { type: "income", confidence: "high" };
    }
  }

  // Check money given
  for (const kw of MONEY_GIVEN_KEYWORDS) {
    if (lower.includes(kw)) {
      return { type: "money_given", confidence: "high" };
    }
  }

  // Check money received  
  for (const kw of MONEY_RECEIVED_KEYWORDS) {
    if (lower.includes(kw)) {
      return { type: "money_received", confidence: "high" };
    }
  }

  // Default to expense
  return { type: "expense", confidence: "medium" };
}

// ─── Smart category detection ──────────────────────────────────────────────────
function detectCategory(description: string): string | undefined {
  const lower = description.toLowerCase();

  // Check every category's keywords, leaf categories first (most specific)
  const leafCategories = DEFAULT_CATEGORIES.filter((c) => {
    const hasChildren = DEFAULT_CATEGORIES.some((c2) => c2.parentId === c.id);
    return !hasChildren && c.keywords && c.keywords.length > 0;
  });

  for (const cat of leafCategories) {
    if (!cat.keywords) continue;
    for (const kw of cat.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return cat.id;
      }
    }
  }

  // Fall back to parent categories
  const parentCategories = DEFAULT_CATEGORIES.filter((c) => {
    return !c.parentId && c.keywords && c.keywords.length > 0;
  });

  for (const cat of parentCategories) {
    if (!cat.keywords) continue;
    for (const kw of cat.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return cat.id;
      }
    }
  }

  return "other";
}

// ─── Extract person name ──────────────────────────────────────────────────────
function extractPerson(input: string): string | undefined {
  // Patterns: "received from Rahul", "gave to Mummy", "Mummy 5000"
  const fromMatch = input.match(/(?:from|to)\s+([A-Za-z]+)/i);
  if (fromMatch) return fromMatch[1];

  // Common people names at start of string
  const familyNames = ["mummy", "papa", "mom", "dad", "mother", "father", "bhai", "didi", "aai", "baba"];
  const lower = input.toLowerCase();
  for (const name of familyNames) {
    if (lower.startsWith(name)) {
      return input.split(/\s+/)[0];
    }
  }

  return undefined;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseQuickAdd(input: string): QuickAddResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try to extract amount — find the last standalone number
  // Support formats: "Chai 15", "Auto 50", "Salary 29000", "Petrol 500.50"
  const amountRegex = /(\d+(?:\.\d{1,2})?)\s*$/;
  const amountFromFront = /^(\d+(?:\.\d{1,2})?)\s+(.+)$/;

  let description = "";
  let amount = 0;

  // Try "description amount" pattern first
  const endMatch = trimmed.match(/^(.+?)\s+(\d+(?:\.\d{1,2})?)$/);
  if (endMatch) {
    description = endMatch[1].trim();
    amount = parseFloat(endMatch[2]);
  } else {
    // Try "amount description" pattern
    const frontMatch = trimmed.match(amountFromFront);
    if (frontMatch) {
      amount = parseFloat(frontMatch[1]);
      description = frontMatch[2].trim();
    } else {
      // Only description, no amount
      const numOnly = trimmed.match(amountRegex);
      if (numOnly) {
        amount = parseFloat(numOnly[1]);
        description = trimmed.replace(numOnly[1], "").trim() || "Transaction";
      } else {
        // No amount at all
        return null;
      }
    }
  }

  if (!amount || amount <= 0) return null;
  if (!description) description = "Transaction";

  const { type, confidence } = detectType(description + " " + trimmed);
  const categoryId = detectCategory(description);
  const person = extractPerson(description);

  return {
    description: capitalizeFirst(description),
    amount,
    type,
    categoryId,
    person,
    confidence,
    needsConfirmation: confidence === "low",
  };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Learned mappings (localStorage-backed) ───────────────────────────────────

const LEARNED_KEY = "et_learned_categories";

export function getLearnedMappings(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LEARNED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function learnMapping(keyword: string, categoryId: string): void {
  if (typeof window === "undefined") return;
  const existing = getLearnedMappings();
  existing[keyword.toLowerCase()] = categoryId;
  localStorage.setItem(LEARNED_KEY, JSON.stringify(existing));
}

export function applyLearnedMappings(
  result: QuickAddResult
): QuickAddResult {
  const learned = getLearnedMappings();
  const lower = result.description.toLowerCase();
  for (const [kw, catId] of Object.entries(learned)) {
    if (lower.includes(kw)) {
      return { ...result, categoryId: catId };
    }
  }
  return result;
}
