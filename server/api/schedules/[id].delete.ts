import { deleteSchedule, getScheduleWithOwnership } from "~~/lib/db/queries/maintenance-schedule";

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

  await deleteSchedule(scheduleId);

  return { success: true };
});
