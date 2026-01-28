import { getComponentsTree, getHouseComponentsByUserId } from "~~/lib/db/queries/house-component";
import { getOverdueTasks, getPendingTaskCount, getRecentlyCompletedTasks, getUpcomingTasks } from "~~/lib/db/queries/task";

export default defineAuthenticatedEventHandler(async (event) => {
  const userId = event.context.user.id;

  const [
    houseComponents,
    componentsTree,
    overdueTasks,
    upcomingTasks,
    recentlyCompletedTasks,
    pendingTaskCount,
  ] = await Promise.all([
    getHouseComponentsByUserId(userId),
    getComponentsTree(userId),
    getOverdueTasks(userId),
    getUpcomingTasks(userId),
    getRecentlyCompletedTasks(userId),
    getPendingTaskCount(userId),
  ]);

  return {
    stats: {
      componentCount: houseComponents.length,
      pendingTaskCount,
      overdueTaskCount: overdueTasks.length,
    },
    overdueTasks,
    upcomingTasks,
    recentlyCompletedTasks,
    houseComponents,
    componentsTree,
  };
});
