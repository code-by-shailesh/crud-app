import { json } from "@remix-run/node";
import prisma from "../db.server"; // Adjust the import path as needed

// POST: Record a view
export const action = async ({ request }) => {
  try {
    const body = await request.json();
    const shopifyProductId = body.shopifyProductId;

    if (!shopifyProductId) {
      return json(
        { success: false, message: "Missing product ID" },
        { status: 400 },
      );
    }
    await prisma.productView.create({
      data: { shopifyProductId },
    });

    return json({ success: true, message: "View recorded" });
  } catch (error) {
    console.error("Track view error:", error);
    return json(
      { success: false, message: "Server error", detail: error.message },
      { status: 500 },
    );
  }
};

// GET: Fetch all views
export const loader = async () => {
  try {
    const views = await prisma.productView.findMany({
      orderBy: {
        viewedAt: "desc", // Use the actual field name
      },
    });

    return json({ success: true, data: views });
  } catch (error) {
    console.error("Fetch views error:", error);
    return json(
      { success: false, message: "Server error", detail: error.message },
      { status: 500 },
    );
  }
};
