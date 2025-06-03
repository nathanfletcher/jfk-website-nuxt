<!-- filepath: /components/Navigation.vue -->
<template>
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <!-- Logo/Home Link -->
        <NuxtLink to="/" class="flex-shrink-0 flex items-center">
          <span class="text-xl font-bold text-gray-800">John Tamakloe (Evangelist)</span>
        </NuxtLink>
        
        <!-- Navigation Links (always horizontal) -->
        <div class="flex ml-6 space-x-8">
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
  </nav>
</template>

<script setup lang="ts">
// The component will automatically have access to the route via useRoute()
const route = useRoute()
</script>
