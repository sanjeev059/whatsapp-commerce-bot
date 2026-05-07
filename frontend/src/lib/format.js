export const formatINR = (n) => {
  if (n === null || n === undefined) return "₹0";
  const v = Math.round(Number(n));
  return "₹" + v.toLocaleString("en-IN");
};
