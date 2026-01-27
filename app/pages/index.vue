<script setup lang="ts">
const authStore = useAuthStore();
</script>

<template>
  <div>
    <!-- Hero Section -->
    <div class="hero bg-base-200 rounded-box">
      <div class="hero-content py-16 text-center">
        <div class="max-w-2xl">
          <h1 class="text-5xl font-bold">
            Home Tracker
          </h1>
          <p class="py-6 text-lg">
            Stay ahead of home maintenance. Track every component of your house,
            schedule recurring tasks, and never miss important upkeep again.
          </p>
          <NuxtLink
            v-if="authStore.user"
            to="/dashboard"
            class="btn btn-primary btn-lg"
          >
            Go to Dashboard
          </NuxtLink>
          <button
            v-else
            class="btn btn-primary btn-lg"
            :disabled="authStore.loading"
            @click="() => authStore.signIn()"
          >
            <span
              v-if="authStore.loading"
              class="loading loading-spinner"
            />
            <template v-else>
              Get Started
              <Icon name="tabler:brand-github" size="24" />
            </template>
          </button>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="py-12">
      <h2 class="mb-8 text-center text-3xl font-bold">
        Everything You Need
      </h2>
      <div class="grid gap-6 md:grid-cols-3">
        <div class="card bg-base-200">
          <div class="card-body items-center text-center">
            <Icon
              name="tabler:home-cog"
              size="48"
              class="mb-2 text-primary"
            />
            <h3 class="card-title">
              Track Components
            </h3>
            <p>
              Catalog everything in your home—from the furnace to the kitchen sink.
              Organize with hierarchical relationships.
            </p>
          </div>
        </div>

        <div class="card bg-base-200">
          <div class="card-body items-center text-center">
            <Icon
              name="tabler:calendar-repeat"
              size="48"
              class="mb-2 text-primary"
            />
            <h3 class="card-title">
              Schedule Maintenance
            </h3>
            <p>
              Set up recurring maintenance intervals. Get reminders when tasks are
              due or approaching.
            </p>
          </div>
        </div>

        <div class="card bg-base-200">
          <div class="card-body items-center text-center">
            <Icon
              name="tabler:camera"
              size="48"
              class="mb-2 text-primary"
            />
            <h3 class="card-title">
              Document Work
            </h3>
            <p>
              Log completed maintenance with notes and photos. Build a complete
              history of your home's care.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- How It Works Section -->
    <div class="bg-base-200 rounded-box p-8">
      <h2 class="mb-8 text-center text-3xl font-bold">
        How It Works
      </h2>
      <ul class="steps steps-vertical lg:steps-horizontal w-full">
        <li class="step step-primary">
          Add your home components
        </li>
        <li class="step step-primary">
          Set maintenance schedules
        </li>
        <li class="step step-primary">
          Complete tasks as they come due
        </li>
        <li class="step step-primary">
          Review history anytime
        </li>
      </ul>
    </div>
  </div>
</template>
