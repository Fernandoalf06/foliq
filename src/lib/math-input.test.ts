import { describe, expect, it } from "vitest";
import { evaluateAmountExpression, hasMathOperator } from "./math-input";

describe("inline amount calculator parser", () => {
  it("evaluates plain numbers and basic arithmetic with operator precedence", () => {
    expect(evaluateAmountExpression("50000")).toBe(50000);
    expect(evaluateAmountExpression("45000+18000")).toBe(63000);
    expect(evaluateAmountExpression("150000 / 3")).toBe(50000);
    expect(evaluateAmountExpression("12000 + 3 * 5000")).toBe(27000);
    expect(evaluateAmountExpression("(12000 + 3000) * 2")).toBe(30000);
    expect(evaluateAmountExpression("25000x4")).toBe(100000);
    expect(evaluateAmountExpression("100.50 + 24.25")).toBe(124.75);
  });

  it("rejects zero, negative, division by zero, and malformed expressions", () => {
    expect(evaluateAmountExpression("")).toBeNull();
    expect(evaluateAmountExpression("0")).toBeNull();
    expect(evaluateAmountExpression("10000 - 25000")).toBeNull();
    expect(evaluateAmountExpression("100 / 0")).toBeNull();
    expect(evaluateAmountExpression("50000 +")).toBeNull();
    expect(evaluateAmountExpression("alert(1)")).toBeNull();
    expect(evaluateAmountExpression("(50000 + 1000")).toBeNull();
  });

  it("detects when an input contains a math operator", () => {
    expect(hasMathOperator("50000")).toBe(false);
    expect(hasMathOperator("50000+15000")).toBe(true);
    expect(hasMathOperator("150000/3")).toBe(true);
  });
});
