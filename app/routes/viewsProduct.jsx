import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { BarChart, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer } from "recharts";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page, Card, Text, Layout, BlockStack } from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const views = await prisma.productView.findMany();

  // Get unique product IDs from views
  const productIds = [...new Set(views.map(view => view.shopifyProductId))];

  // Fetch product details from Shopify in batches
  const productMeta = {};
  const batchSize = 10; // Shopify recommends batching to avoid timeouts
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    
    const response = await admin.graphql(
      `#graphql
      query Products($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            featuredImage {
              url
            }
          }
        }
      }
      `,
      {
        variables: {
          ids: batch.map(id => `gid://shopify/Product/${id}`)
        }
      }
    );

    const productData = await response.json();
    productData.data.nodes.forEach(node => {
      if (node) {
        const productId = node.id.split('/').pop();
        productMeta[productId] = {
          name: node.title,
          image: node.featuredImage?.url || "https://via.placeholder.com/80"
        };
      }
    });
  }

  // Group by product and day
  const grouped = {};
  views.forEach((view) => {
    const date = new Date(view.viewedAt).toISOString().split('T')[0];
    const pid = view.shopifyProductId;
    const key = `${pid}_${date}`;
    grouped[key] = grouped[key] || { date, productId: pid, count: 0 };
    grouped[key].count += 1;
  });

  return json({ 
    chartData: Object.values(grouped),
    productMeta 
  });
};

export default function ViewsProduct() {
  const { chartData, productMeta } = useLoaderData();

  return (
    <Page>
      <TitleBar title="Product Views Analytics" />
      <BlockStack gap="400">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Product Views by Day
                </Text>
                <div style={{ padding: "1rem" }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 50, left: 0 }}>
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        label={{ value: "Date", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis label={{ value: "Views", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        formatter={(value, name, props) => [`${value} views`, `Product`]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Views" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Product View Details
                </Text>
                <div style={{ marginTop: "1rem" }}>
                  {chartData.map((entry, index) => {
                    const meta = productMeta[entry.productId] || {
                      name: `Product ${entry.productId}`,
                      image: "https://via.placeholder.com/80"
                    };
                    return (
                      <div 
                        key={index} 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          marginBottom: "10px",
                          padding: "10px",
                          borderBottom: "1px solid #eee"
                        }}
                      >
                        <img 
                          src={meta.image} 
                          alt={meta.name} 
                          width={50} 
                          height={50} 
                          style={{ marginRight: "10px" }} 
                        />
                        <div>
                          <Text as="p" variant="bodyMd" fontWeight="bold">
                            {meta.name}
                          </Text>
                          <Text as="p" variant="bodySm">
                            ID: {entry.productId}
                          </Text>
                          <Text as="p" variant="bodySm">
                            Date: {entry.date}, Views: {entry.count}
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}