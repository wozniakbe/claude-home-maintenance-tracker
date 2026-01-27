import { getScheduleWithOwnership, updateSchedule } from "~~/lib/db/queries/maintenance-schedule";
import { UpdateMaintenanceSchedule } from "~~/lib/db/schema";

export default defineAuthenticatedEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Schedule ID is required",
    });
  }

  const scheduleId = Number.parseInt(id, 10);
  if (Number.isNaN(scheduleId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid schedule ID",
    });
  }

  const schedule = await getScheduleWithOwnership(scheduleId, event.context.user.id);
  if (!schedule) {
    throw createError({
      statusCode: 404,
      statusMessage: "Schedule not found",
    });
  }

  const result = await readValidatedBody(event, UpdateMaintenanceSchedule.safeParse);

  if (!result.success) {
    return sendZodError(event, result.error);
  }

  return updateSchedule(scheduleId, result.data);
});
