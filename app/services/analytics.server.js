const DAYS_TO_LOAD = 30;

export async function getDiscountAnalytics(admin, discountTitles = []) {
  const since = new Date(Date.now() - DAYS_TO_LOAD * 24 * 60 * 60 * 1000).toISOString();
  const allNodes = [];
  let cursor = null;
  let hasNextPage = true;

  // Fetch newest orders first, then filter locally. Shopify order search date
  // syntax varies by API/version and could return an empty dashboard even when
  // qualifying orders existed.
  while (hasNextPage) {
    const response = await admin.graphql(
      `#graphql
      query DiscountAnalytics($after: String) {
        orders(first: 250, after: $after, query: "status:any", reverse: true, sortKey: CREATED_AT) {
          edges {
            cursor
            node {
              id
              createdAt
              currentTotalPriceSet { shopMoney { amount currencyCode } }
              totalDiscountsSet { shopMoney { amount currencyCode } }
              discountApplications(first: 30) {
                edges {
                  node {
                    __typename
                    ... on AutomaticDiscountApplication { title }
                    ... on DiscountCodeApplication { code }
                  }
                }
              }
            }
          }
          pageInfo { hasNextPage }
        }
      }`,
      { variables: { after: cursor } },
    );
    const result = await response.json();
    if (result.errors?.length) {
      return { orders: [], graphqlErrors: result.errors };
    }

    const edges = result.data?.orders?.edges || [];
    allNodes.push(...edges.map(({ node }) => node));
    const oldestOrder = edges[edges.length - 1]?.node;
    hasNextPage = Boolean(result.data?.orders?.pageInfo?.hasNextPage) &&
      Boolean(oldestOrder?.createdAt && oldestOrder.createdAt >= since);
    cursor = edges[edges.length - 1]?.cursor || null;
  }

  const knownTitles = new Set(discountTitles.map((title) => String(title).trim()).filter(Boolean));
  const orders = allNodes.filter((node) => node.createdAt >= since).map((node) => {
    const applications = (node.discountApplications?.edges || []).map(({ node: application }) =>
      application.title || application.code || "Discount",
    );
    return {
      id: node.id,
      createdAt: node.createdAt,
      revenue: Number(node.currentTotalPriceSet?.shopMoney?.amount || 0),
      savings: Number(node.totalDiscountsSet?.shopMoney?.amount || 0),
      currencyCode: node.currentTotalPriceSet?.shopMoney?.currencyCode || "USD",
      hasDiscount: applications.length > 0,
      usesAppDiscount: applications.some((title) => knownTitles.has(title)),
      applications,
    };
  });

  return { orders, graphqlErrors: [] };
}
