import { getTaskWithOwnership, updateTask } from "~~/lib/db/queries/task";
import { UpdateTask } from "~~/lib/db/schema";

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

  const result = await readValidatedBody(event, UpdateTask.safeParse);

  if (!result.success) {
    return sendZodError(event, result.error);
  }

  return updateTask(taskId, result.data);
});
