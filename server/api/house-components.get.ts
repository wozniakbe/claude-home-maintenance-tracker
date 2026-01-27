import { getHouseComponentsByUserId } from "~~/lib/db/queries/house-component";

export default defineAuthenticatedEventHandler(async (event) => {
  return getHouseComponentsByUserId(event.context.user.id);
});
