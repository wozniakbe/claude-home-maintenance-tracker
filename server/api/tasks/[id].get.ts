import { getTaskWithOwnership } from "~~/lib/db/queries/task";

export default defineAuthenticatedEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Task ID is required",
    });
  }

  const taskId = Number.parseInt(id, 10);
  if (Number.isNaN(taskId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid task ID",
    });
  }

  const task = await getTaskWithOwnership(taskId, event.context.user.id);
  if (!task) {
    throw createError({
      statusCode: 404,
      statusMessage: "Task not found",
    });
  }

  return task;
});
