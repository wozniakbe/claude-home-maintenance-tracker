import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getTaskWithOwnership } from "~~/lib/db/queries/task";
import env from "~~/lib/env";
import { z } from "zod";

const MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB

const ImageSchema = z.object({
  contentLength: z.number().min(1).max(MAX_CONTENT_LENGTH),
  checksum: z.string(),
});

export default defineAuthenticatedEventHandler(async (event) => {
  const result = await readValidatedBody(event, ImageSchema.safeParse);

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

  const s3 = createS3Client();

  const fileName = crypto.randomUUID();
  const key = `${event.context.user.id}/${id}/${fileName}.jpg`;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: env.S3_BUCKET,
    Key: key,
    Expires: 120,
    Fields: {
      "x-amz-checksum-sha256": result.data.checksum,
    },
    Conditions: [
      ["content-length-range", result.data.contentLength, result.data.contentLength],
      ["eq", "$x-amz-meta-user-id", event.context.user.id],
      ["eq", "$x-amz-meta-task-id", id],
    ],
  });

  fields["x-amz-meta-user-id"] = event.context.user.id;
  fields["x-amz-meta-task-id"] = id;

  return { url, fields, key };
});
