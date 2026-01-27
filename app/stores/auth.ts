import { createAuthClient } from "better-auth/vue";

const authClient = createAuthClient();

export const useAuthStore = defineStore("useAuthStore", () => {
  const session = ref<Awaited<ReturnType<typeof authClient.useSession>> | null>(null);

  // Use useState to ensure hydration safety
  const hydrated = useState("auth-hydrated", () => false);

  async function init() {
    const data = await authClient.useSession(useFetch);
    session.value = data;
    hydrated.value = true;
  }

  const user = computed(() => session.value?.data?.user);
  const loading = computed(() => !hydrated.value || session.value?.isPending);
  const initialized = computed(() => hydrated.value);

  async function signIn(callbackURL = "/dashboard") {
    const { csrf } = useCsrf();
    const headers = new Headers();
    headers.append("csrf-token", csrf);
    await authClient.signIn.social({
      provider: "github",
      callbackURL,
      errorCallbackURL: "/error",
      fetchOptions: {
        headers,
      },
    });
  }

  async function signOut() {
    const { csrf } = useCsrf();
    const headers = new Headers();
    headers.append("csrf-token", csrf);
    await authClient.signOut({
      fetchOptions: {
        headers,
      },
    });
    navigateTo("/");
  }

  return {
    init,
    initialized,
    loading,
    signIn,
    signOut,
    user,
  };
});
