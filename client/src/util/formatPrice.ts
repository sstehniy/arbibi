const MAX_DECIMALS = 20;

// Initialize the formatter once to improve performance
const formatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: MAX_DECIMALS,
  useGrouping: true, // Adds commas for thousands
});

/**
 * Formats a price string into a human-readable format.
 * Always uses fixed-point notation, including for very small numbers.
 *
 * @param price - The price as a string.
 * @returns The formatted price.
 */
export function formatPrice(price: string): string {
  const numberPrice = parseFloat(price);

  // Handle invalid numbers
  if (isNaN(numberPrice)) {
    return "0.00";
  }

  // Use Intl.NumberFormat to format the number
  let formattedPrice = formatter.format(numberPrice);

  // Ensure that very small numbers are displayed in fixed-point notation
  // by using toLocaleString with fixed decimal places
  // This step is redundant with Intl.NumberFormat but added for clarity
  // and to handle cases where Intl might switch to exponential notation.
  if (Math.abs(numberPrice) < 1e-4 && numberPrice !== 0) {
    // toLocaleString does not switch to exponential, so this is safe
    formattedPrice = numberPrice.toLocaleString("en-US", {
      minimumFractionDigits: 20, // Display up to MAX_DECIMALS
      maximumFractionDigits: MAX_DECIMALS,
      useGrouping: true,
    });

    // Optionally, trim trailing zeros beyond the necessary decimal places
    // while ensuring at least two decimal places
    formattedPrice = trimTrailingZeros(formattedPrice);
  }

  return formattedPrice;
}

/**
 * Trims trailing zeros from a decimal string while ensuring at least two decimal places.
 *
 * @param numStr - The number string to trim.
 * @returns The trimmed number string.
 */
function trimTrailingZeros(numStr: string): string {
  // Split the number into integer and decimal parts
  const [integerPart, decimalPart] = numStr.split(".");

  if (!decimalPart) {
    // If there's no decimal part, add two zeros
    return `${integerPart}.00`;
  }

  // Remove trailing zeros
  let trimmedDecimal = decimalPart.replace(/0+$/, "");

  // Ensure at least two decimal places
  if (trimmedDecimal.length < 2) {
    trimmedDecimal = trimmedDecimal.padEnd(2, "0");
  }

  return `${integerPart}.${trimmedDecimal}`;
}
