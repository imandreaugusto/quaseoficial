export const ensureAppAfter = (order: string[], appId: string, afterId: string): string[] => {
  if (order.includes(appId)) return order;

  const updatedOrder = [...order];
  const anchorIndex = updatedOrder.indexOf(afterId);
  updatedOrder.splice(anchorIndex >= 0 ? anchorIndex + 1 : updatedOrder.length, 0, appId);
  return updatedOrder;
};

const ensureAppsInOrder = (
  order: string[],
  appIds: string[],
  defaultAnchors: Record<string, string>,
): string[] => {
  let normalizedOrder = order;
  const firstAppId = appIds[0];
  if (firstAppId && !normalizedOrder.includes(firstAppId)) {
    normalizedOrder = [firstAppId, ...normalizedOrder];
  }

  for (const appId of appIds) {
    if (normalizedOrder.includes(appId)) continue;
    const anchorId = defaultAnchors[appId];
    normalizedOrder = anchorId
      ? ensureAppAfter(normalizedOrder, appId, anchorId)
      : [...normalizedOrder, appId];
  }

  return normalizedOrder;
};

export const ensureStudentAppsInOrder = (order: string[], appIds: string[]) =>
  ensureAppsInOrder(order, appIds, {
    actionstreet: 'home',
    flashcards: 'readclub',
  });

export const ensureAdminAppsInOrder = (order: string[], appIds: string[]) =>
  ensureAppsInOrder(order, appIds, {
    work: 'home',
    actionstreet: 'work',
    flashcards: 'readclub',
  });
