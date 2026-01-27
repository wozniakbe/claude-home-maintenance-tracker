import { getHouseComponentByName, getHouseComponentBySlug, updateHouseComponent } from "~~/lib/db/queries/house-component";
import { UpdateHouseComponent } from "~~/lib/db/schema";

export default defineAuthenticatedEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Slug is required",
    });
  }

  const existing = await getHouseComponentBySlug(event.context.user.id, slug);
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: "House component not found",
    });
  }

  const result = await readValidatedBody(event, UpdateHouseComponent.safeParse);

  if (!result.success) {
    return sendZodError(event, result.error);
  }

  // Check for name conflict if name is being changed
  if (result.data.name && result.data.name !== existing.name) {
    const nameConflict = await getHouseComponentByName(event.context.user.id, result.data.name);
    if (nameConflict) {
      throw createError({
        statusCode: 409,
        statusMessage: "A house component with that name already exists.",
      });
    }
  }

  return updateHouseComponent(event.context.user.id, slug, result.data);
});
