import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getTaskWithOwnership } from "~~/lib/db/queries/task";
import { deleteTaskImage } from "~~/lib/db/queries/task-image";
import env from "~~/lib/env";
import { z } from "zod";

export default defineAuthenticatedEventHandler(async (event) => {
  const imageId = getRouterParam(event, "image-id");
  const taskId = getRouterParam(event, "id");

  if (!imageId || !z.coerce.number().safeParse(imageId).success) {
    throw createError({
      statusCode: 422,
      statusMessage: "Invalid image ID",
    });
  }

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Task ID is required",
    });
  }

  const parsedTaskId = Number.parseInt(taskId, 10);
  if (Number.isNaN(parsedTaskId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid task ID",
    });
  }

  // Verify user owns this task
  const task = await getTaskWithOwnership(parsedTaskId, event.context.user.id);
  if (!task) {
    throw createError({
      statusCode: 404,
      statusMessage: "Task not found",
    });
  }

  // Delete from database (returns the deleted record with the key)
  const deleted = await deleteTaskImage(Number(imageId), event.context.user.id);

  if (deleted) {
    // Delete from S3
    const client = createS3Client();
    const command = new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: deleted.key,
    });
    await client.send(command);
  }

  setResponseStatus(event, 204);
});
