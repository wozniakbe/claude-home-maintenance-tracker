import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getTaskWithOwnership } from "~~/lib/db/queries/task";
import { insertTaskImage } from "~~/lib/db/queries/task-image";
import { InsertTaskImage } from "~~/lib/db/schema";
import env from "~~/lib/env";

type ObjectMetadata = {
  "task-id": string;
  "user-id": string;
};

export default defineAuthenticatedEventHandler(async (event) => {
  const result = await readValidatedBody(event, InsertTaskImage.safeParse);

  if (!result.success) {
    return sendZodError(event, result.error);
  }

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

  // Verify user owns this task
  const task = await getTaskWithOwnership(taskId, event.context.user.id);
  if (!task) {
    throw createError({
      statusCode: 404,
      statusMessage: "Task not found",
    });
  }

  // Verify the object exists in S3 and metadata matches
  const s3 = createS3Client();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: result.data.key,
  });

  const response = await s3.send(command);
  const metadata = response.Metadata as ObjectMetadata | undefined;

  if (!metadata || metadata["task-id"] !== id || metadata["user-id"] !== event.context.user.id) {
    throw createError({
      statusCode: 404,
      statusMessage: "Image not found",
    });
  }

  // Record in database
  const inserted = await insertTaskImage(taskId, result.data, event.context.user.id);

  return inserted;
});
