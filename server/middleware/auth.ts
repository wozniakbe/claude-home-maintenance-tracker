import { auth } from "~~/lib/auth";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  if (config.testAuthBypass) {
    const testUserId = getHeader(event, "x-test-user-id");
    if (testUserId) {
      event.context.user = {
        id: testUserId,
        name: "Test User",
        email: `${testUserId}@test.com`,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return;
    }
  }

  const session = await auth.api.getSession({
    headers: event.headers,
  });
  event.context.user = session?.user;
  if (event.path.startsWith("/dashboard")) {
    if (!session?.user) {
      await sendRedirect(event, "/", 302);
    }
  }
});
