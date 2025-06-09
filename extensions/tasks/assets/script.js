document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("taskForm");
  const taskList = document.getElementById("tasks");

  form.addEventListener("submit", async function (e) {
    e.preventDefault(); // Stop the default form action

    const task = document.getElementById("taskTitle").value;
    const description = document.getElementById("taskDescription").value;
    const fromData = new FormData();
    fromData.append("task", task);
    fromData.append("description", description);

    try {
      const response = await fetch("/apps/api/tasks", {
        method: "POST",
        body: fromData,
      });

      if (!response.ok) {
        console.log(response);
        throw new Error("Failed to send task");
      }

      const result = await response.json();

      // Optional: Show task in list
      const li = document.createElement("li");
      li.textContent = `${result.task} - ${result.description}`;
      taskList.appendChild(li);

      form.reset(); // Clear form
    } catch (error) {
      console.error("Error:", error);
      alert("Task submission failed.");
    }
  });
});
