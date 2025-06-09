import { json } from "@remix-run/node";
import prisma from "../db.server";
export async function loader({ request }) {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });
    return json({ data: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return json(
      {
        message: "Failed to fetch tasks",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
export async function action({ request }) {
  try {
    const formData = await request.formData();
    const task = formData.get("task");
    const description = formData.get("description");
    console.log(task,description);
    if (!task || !description) {
      return json(
        { message: "Task and description are required" },
        { status: 400 },
      );
    }
    const newTask = await prisma.task.create({
      data: {
        task: String(task),
        description: String(description),
      },
    });

    return json({ message: "Task created successfully", task: newTask });
  } catch (error) {
    console.error("Error creating task:", error);
    return json(
      {
        message: "Failed to create task",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
