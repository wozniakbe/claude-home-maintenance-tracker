import { deleteHouseComponent, getHouseComponentBySlug } from "~~/lib/db/queries/house-component";

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

  await deleteHouseComponent(event.context.user.id, slug);

  return { success: true };
});
