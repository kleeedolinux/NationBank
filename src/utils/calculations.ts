/**
 * Financial calculations utility functions
 */

/**
 * Calculate inflation rate based on GDP change
 * @param previousGDP Previous GDP value
 * @param currentGDP Current GDP value
 * @returns Inflation rate as a percentage
 */
export const calculateInflation = (previousGDP: number, currentGDP: number): number => {
  if (previousGDP === 0) return 0;
  const rate = ((currentGDP - previousGDP) / previousGDP) * 100;
  return Number(rate.toFixed(2));
};

/**
 * Calculate monthly loan payment using amortization formula
 * @param principal Loan amount
 * @param rate Annual interest rate (percentage)
 * @param term Loan term in months
 * @returns Monthly payment amount
 */
export const calculateLoanPayment = (
  principal: number,
  rate: number,
  term: number
): number => {
  const monthlyRate = rate / 12 / 100;
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
    (Math.pow(1 + monthlyRate, term) - 1);
  return Number(payment.toFixed(2));
};

/**
 * Calculate investment return based on CDI rate
 * @param principal Investment amount
 * @param rate Annual interest rate (percentage)
 * @param days Investment term in days
 * @returns Expected return amount
 */
export const calculateInvestmentReturn = (
  principal: number,
  rate: number,
  days: number
): number => {
  const return_amount = principal * (1 + (rate / 100) * (days / 365));
  return Number(return_amount.toFixed(2));
};

/**
 * Calculate income tax on a transaction
 * @param amount Transaction amount
 * @param taxRate Tax rate percentage
 * @returns Tax amount
 */
export const calculateIncomeTax = (amount: number, taxRate: number): number => {
  return Number((amount * (taxRate / 100)).toFixed(2));
}; 