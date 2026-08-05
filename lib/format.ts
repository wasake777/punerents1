/** "₹1,50,000" - full Indian-grouped rupees. */
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
