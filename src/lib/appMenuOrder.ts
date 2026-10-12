export const ensureAppAfter = (order: string[], appId: string, afterId: string): string[] => {
  if (order.includes(appId)) return order;

  const updatedOrder = [...order];
  const anchorIndex = updatedOrder.indexOf(afterId);
  updatedOrder.splice(anchorIndex >= 0 ? anchorIndex + 1 : updatedOrder.length, 0, appId);
  return updatedOrder;
};
