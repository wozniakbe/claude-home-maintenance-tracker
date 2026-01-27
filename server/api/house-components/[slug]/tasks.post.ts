import { getHouseComponentBySlug } from "~~/lib/db/queries/house-component";
import { createTask } from "~~/lib/db/queries/task";
import { InsertTask } from "~~/lib/db/schema";

export default defineAuthenticatedEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Slug is required",
    });
  }

  const houseComponent = await getHouseComponentBySlug(event.context.user.id, slug);
  if (!houseComponent) {
    throw createError({
      statusCode: 404,
      statusMessage: "House component not found",
    });
  }

  const result = await readValidatedBody(event, InsertTask.safeParse);

  if (!result.success) {
    return sendZodError(event, result.error);
  }

  return createTask(houseComponent.id, result.data);
});
