import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  ResponsiveContainer,
} from "recharts";
import prisma from "../db.server";
import { TitleBar } from "@shopify/app-bridge-react";
import { Page, Card, Text, Layout, BlockStack } from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // First get all unique product IDs from views
  const views = await prisma.productView.findMany();
  const productIds = [...new Set(views.map((view) => view.shopifyProductId))];

  // Fetch product details from Shopify
  const productMeta = {};
  for (const productId of productIds) {
    try {
      const response = await admin.graphql(
        `#graphql
        query Product($id: ID!) {
          product(id: $id) {
            id
            title
            featuredImage {
              url
            }
          }
        }
        `,
        {
          variables: {
            id: `gid://shopify/Product/${productId}`,
          },
        },
      );
      
      const productData = await response.json();
      productMeta[productId] = {
        name: productData.data.product?.title || `Product ${productId}`,
        image:
          productData.data.product?.featuredImage?.url ||
          "https://via.placeholder.com/80",
      };
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
      productMeta[productId] = {
        name: `Product ${productId}`,
        image: "https://via.placeholder.com/80",
      };
    }
  }
  const grouped = {};
  views.forEach((view) => {
    const date = new Date(view.viewedAt).toISOString().split("T")[0];
    const pid = view.shopifyProductId;
    const key = `${pid}_${date}`;
    grouped[key] = grouped[key] || { date, productId: pid, count: 0 };
    grouped[key].count += 1;
  });
  return json({
    chartData: Object.values(grouped),
    productMeta,
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
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, bottom: 50, left: 0 }}
                    >
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        label={{
                          value: "Date",
                          position: "insideBottom",
                          offset: -5,
                        }}
                      />
                      <YAxis
                        label={{
                          value: "Views",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip
                        formatter={(value, name, props) => [
                          `${value} views`,
                          `Product`,
                        ]}
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
                    const meta = productMeta[entry.productId];
                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "10px",
                          padding: "10px",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        <img
                          src={meta?.image || ""}
                          alt={meta?.name || "Product"}
                          width={50}
                          height={50}
                          style={{ marginRight: "10px" }}
                        />
                        <div>
                          <Text as="p" variant="bodyMd" fontWeight="bold">
                            {meta?.name || "Unknown Product"}
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
