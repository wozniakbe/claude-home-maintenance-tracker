import { completeScheduledTask } from "~~/lib/db/queries/maintenance-schedule";
import { completeTask, getTaskWithOwnership } from "~~/lib/db/queries/task";
import { CompleteTask } from "~~/lib/db/schema";

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

  const result = await readValidatedBody(event, CompleteTask.safeParse);

  if (!result.success) {
    return sendZodError(event, result.error);
  }

  const completedAt = result.data.completedAt ?? Date.now();

  // Complete the task
  const completedTask = await completeTask(taskId, {
    ...result.data,
    completedAt,
  });

  // If this task is linked to a schedule, create the next occurrence
  if (task.scheduleId && result.data.status === "completed") {
    await completeScheduledTask(task.scheduleId, completedAt);
  }

  return completedTask;
});
