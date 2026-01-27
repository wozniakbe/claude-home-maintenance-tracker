import { createHouseComponent, getHouseComponentByName } from "~~/lib/db/queries/house-component";
import { InsertHouseComponent } from "~~/lib/db/schema";

export default defineAuthenticatedEventHandler(async (event) => {
  const result = await readValidatedBody(event, InsertHouseComponent.safeParse);

  if (!result.success) {
    return sendZodError(event, result.error);
  }

  const existing = await getHouseComponentByName(event.context.user.id, result.data.name);
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: "A house component with that name already exists.",
    });
  }

  return createHouseComponent(event.context.user.id, result.data);
});
