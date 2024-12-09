export function getPriceFontSize(price: string): string {
  return price.length > 15
    ? "text-sm"
    : price.length > 10
      ? "text-md"
      : "text-2xl";
}
