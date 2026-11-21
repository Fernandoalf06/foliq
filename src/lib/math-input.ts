/**
 * Safe recursive-descent arithmetic expression parser for Quick Entry amount fields.
 * Supports +, -, *, /, unicode x/×/÷, parentheses, and decimals without eval().
 */

const MAX_AMOUNT = 999_999_999_999;

export function hasMathOperator(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  return /[+\-*/×÷x()]/.test(s.replace(/^-/, ""));
}

type Token =
  | { type: "num"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(input: string): Token[] | null {
  const normalized = input
    .trim()
    .replace(/\s+/g, "")
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/");

  if (!normalized) return null;

  const tokens: Token[] = [];
  let i = 0;

  while (i < normalized.length) {
    const ch = normalized[i];

    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let numStr = "";
      let dotCount = 0;
      while (
        i < normalized.length &&
        ((normalized[i] >= "0" && normalized[i] <= "9") ||
          normalized[i] === "." ||
          normalized[i] === ",")
      ) {
        const c = normalized[i];
        if (c === ",") {
          // Treat comma as decimal only if no dot seen and <= 2 digits follow before non-digit
          const rest = normalized.slice(i + 1).match(/^\d+/)?.[0] ?? "";
          if (dotCount === 0 && rest.length > 0 && rest.length <= 2) {
            numStr += ".";
            dotCount += 1;
          }
          // Otherwise ignore as thousands separator
        } else if (c === ".") {
          dotCount += 1;
          if (dotCount > 1) return null;
          numStr += ".";
        } else {
          numStr += c;
        }
        i += 1;
      }
      const value = Number.parseFloat(numStr);
      if (!Number.isFinite(value)) return null;
      tokens.push({ type: "num", value });
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i += 1;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i += 1;
      continue;
    }

    return null;
  }

  return tokens;
}

export function evaluateAmountExpression(raw: string): number | null {
  const tokens = tokenize(raw);
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token | undefined => {
    const t = tokens[pos];
    pos += 1;
    return t;
  };

  function parseExpression(): number | null {
    let left = parseTerm();
    if (left === null) return null;

    while (true) {
      const next = peek();
      if (next?.type === "op" && (next.value === "+" || next.value === "-")) {
        consume();
        const right = parseTerm();
        if (right === null) return null;
        left = next.value === "+" ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): number | null {
    let left = parseUnary();
    if (left === null) return null;

    while (true) {
      const next = peek();
      if (next?.type === "op" && (next.value === "*" || next.value === "/")) {
        consume();
        const right = parseUnary();
        if (right === null) return null;
        if (next.value === "/") {
          if (right === 0) return null;
          left = left / right;
        } else {
          left = left * right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parseUnary(): number | null {
    const next = peek();
    if (next?.type === "op" && (next.value === "+" || next.value === "-")) {
      consume();
      const val = parseUnary();
      if (val === null) return null;
      return next.value === "-" ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary(): number | null {
    const token = consume();
    if (!token) return null;
    if (token.type === "num") return token.value;
    if (token.type === "lparen") {
      const inner = parseExpression();
      if (inner === null) return null;
      const closing = consume();
      if (closing?.type !== "rparen") return null;
      return inner;
    }
    return null;
  }

  const result = parseExpression();
  if (result === null || pos !== tokens.length) return null;
  if (!Number.isFinite(result) || result <= 0 || result > MAX_AMOUNT) {
    return null;
  }

  return Math.round(result * 100) / 100;
}
