<script lang="ts" setup>
const authStore = useAuthStore();

const navLinks = computed(() => {
  if (!authStore.user)
    return [];
  return [
    { to: "/dashboard", label: "Dashboard", icon: "tabler:layout-dashboard" },
  ];
});

const mounted = useState("navbar-mounted", () => false);

onMounted(() => {
  mounted.value = true;
});
</script>

<template>
  <div class="navbar bg-base-200 px-4">
    <!-- Mobile hamburger menu -->
    <div class="flex-none lg:hidden">
      <div
        v-if="navLinks.length > 0"
        class="dropdown"
      >
        <div
          tabindex="0"
          role="button"
          class="btn btn-ghost btn-square"
          aria-label="Open menu"
        >
          <Icon name="tabler:menu-2" size="24" />
        </div>
        <ul
          tabindex="0"
          class="dropdown-content menu bg-base-200 rounded-box z-10 mt-3 w-52 p-2 shadow-lg"
        >
          <li v-for="link in navLinks" :key="link.to">
            <NuxtLink :to="link.to" class="flex items-center gap-2">
              <Icon :name="link.icon" size="20" />
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Logo/Brand -->
    <div class="flex-1">
      <NuxtLink to="/" class="btn btn-ghost text-xl font-bold">
        <Icon name="tabler:home" size="24" />
        <span class="hidden sm:inline">Home Tracker</span>
      </NuxtLink>
    </div>

    <!-- Desktop navigation links -->
    <div class="hidden lg:flex flex-none">
      <ul class="menu menu-horizontal px-1 gap-1">
        <li v-for="link in navLinks" :key="link.to">
          <NuxtLink :to="link.to" class="flex items-center gap-2">
            <Icon :name="link.icon" size="20" />
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>
    </div>

    <!-- Auth section -->
    <div class="flex-none">
      <!-- Signed in: user dropdown -->
      <div
        v-if="mounted && !authStore.loading && authStore.user"
        class="dropdown dropdown-end"
      >
        <div
          tabindex="0"
          role="button"
          class="btn btn-ghost gap-2"
        >
          <div v-if="authStore.user.image" class="avatar">
            <div class="w-8 rounded-full">
              <img
                :src="authStore.user.image"
                :alt="authStore.user.name"
              >
            </div>
          </div>
          <span class="hidden sm:inline">{{ authStore.user.name }}</span>
          <Icon
            name="tabler:chevron-down"
            size="16"
            class="hidden sm:block"
          />
        </div>
        <ul
          tabindex="0"
          class="dropdown-content menu bg-base-200 rounded-box z-10 mt-3 w-52 p-2 shadow-lg"
        >
          <li class="menu-title sm:hidden">
            <span>{{ authStore.user.name }}</span>
          </li>
          <li>
            <NuxtLink to="/sign-out" class="flex items-center gap-2">
              <Icon name="tabler:logout-2" size="20" />
              Sign Out
            </NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Not signed in: sign in button -->
      <button
        v-else
        :disabled="!mounted || authStore.loading"
        class="btn btn-primary btn-sm sm:btn-md"
        @click="() => authStore.signIn()"
      >
        <span
          v-if="!mounted || authStore.loading"
          class="loading loading-spinner loading-sm"
        />
        <Icon
          v-else
          name="tabler:brand-github"
          size="20"
        />
        <span class="hidden sm:inline">
          {{ !mounted || authStore.loading ? "Loading..." : "Sign In" }}
        </span>
      </button>
    </div>
  </div>
</template>
