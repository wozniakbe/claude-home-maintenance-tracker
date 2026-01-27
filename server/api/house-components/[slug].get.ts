import { getHouseComponentBySlug } from "~~/lib/db/queries/house-component";

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

  return houseComponent;
});
