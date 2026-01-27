import { getHouseComponentBySlug } from "~~/lib/db/queries/house-component";
import { createSchedule } from "~~/lib/db/queries/maintenance-schedule";
import { InsertMaintenanceSchedule } from "~~/lib/db/schema";

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

  const result = await readValidatedBody(event, InsertMaintenanceSchedule.safeParse);

  if (!result.success) {
    return sendZodError(event, result.error);
  }

  return createSchedule(houseComponent.id, result.data);
});
