<!-- filepath: /components/Navigation.vue -->
<template>
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <!-- Logo/Home Link -->
          <NuxtLink to="/" class="flex-shrink-0 flex items-center">
            <span class="text-xl font-bold text-gray-800">My Blog</span>
          </NuxtLink>
          
          <!-- Navigation Links -->
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <NuxtLink
              to="/"
              class="inline-flex items-center px-1 pt-1 border-b-2"
              :class="[$route.path === '/' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700']"
            >
              Home
            </NuxtLink>
            <NuxtLink
              to="/blog"
              class="inline-flex items-center px-1 pt-1 border-b-2"
              :class="[$route.path.startsWith('/blog') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700']"
            >
              Blog
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile menu, shows/hides based on menu state -->
    <div class="sm:hidden">
      <div class="pt-2 pb-3 space-y-1">
        <NuxtLink
          to="/"
          class="block pl-3 pr-4 py-2 text-base font-medium"
          :class="[$route.path === '/' ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : 'border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700']"
        >
          Home
        </NuxtLink>
        <NuxtLink
          to="/blog"
          class="block pl-3 pr-4 py-2 text-base font-medium"
          :class="[$route.path.startsWith('/blog') ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : 'border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700']"
        >
          Blog
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
// The component will automatically have access to the route via useRoute()
const route = useRoute()
</script>
