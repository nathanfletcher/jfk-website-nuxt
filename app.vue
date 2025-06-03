<template>
  <div>
    <!-- Navbar -->
    <nav class="bg-gradient-to-r from-blue-700 to-blue-400 shadow-lg py-4 px-6 flex items-center justify-between animate-fade-in-down">
      <NuxtLink to="/" class="flex items-center gap-2">
        <span class="text-white text-2xl font-extrabold tracking-tight">JFK Blog</span>
      </NuxtLink>
      <div class="flex gap-6">
        <NuxtLink to="/" class="nav-link" exact>Home</NuxtLink>
        <NuxtLink to="/blog" class="nav-link">Blog</NuxtLink>
        <a href="#about" class="nav-link">About</a>
        <a href="#contact" class="nav-link">Contact</a>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section animate-fade-in-up">
      <div class="container mx-auto py-12 flex flex-col items-center text-center">
        <img src="https://ui-avatars.com/api/?name=John+Franklin+Tamakloe&background=0D8ABC&color=fff&size=128" alt="JFK Avatar" class="rounded-full shadow-lg mb-6 animate-pop-in" width="128" height="128" />
        <h1 class="text-4xl md:text-5xl font-bold mb-4 text-blue-800">Hi, I'm John Franklin Tamakloe</h1>
        <p class="text-lg md:text-xl text-gray-700 mb-6 max-w-2xl">Welcome to my personal blog where I share reflections, stories, and lessons from my journey of faith, life, and learning. Join me as we explore unity, purpose, and the beauty of everyday moments.</p>
        <NuxtLink to="/blog" class="cta-btn">Read Latest Posts</NuxtLink>
      </div>
    </section>

    <!-- Sample Content Section -->
    <section class="container mx-auto py-10 animate-fade-in">
      <div class="grid md:grid-cols-3 gap-8">
        <div class="card">
          <h2 class="card-title">Unity in Diversity</h2>
          <p class="card-desc">Discover how our differences can bring us together and enrich our shared experiences.</p>
        </div>
        <div class="card">
          <h2 class="card-title">Faith & Reflection</h2>
          <p class="card-desc">Weekly meditations and insights from scripture and daily life.</p>
        </div>
        <div class="card">
          <h2 class="card-title">Life Lessons</h2>
          <p class="card-desc">Stories and advice on navigating challenges, building character, and finding joy.</p>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section id="about" class="bg-blue-50 py-12 animate-fade-in-up">
      <div class="container mx-auto max-w-3xl text-center">
        <h2 class="text-3xl font-bold mb-4 text-blue-700">About Me</h2>
        <p class="text-lg text-gray-700">I'm a lifelong learner, teacher, and believer in the power of community. Through this blog, I hope to inspire thoughtful conversations and encourage others to grow in faith and kindness.</p>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-12 animate-fade-in">
      <div class="container mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold mb-4 text-blue-700">Contact</h2>
        <p class="text-lg text-gray-700 mb-4">Have a question or want to connect? Reach out below!</p>
        <a href="mailto:jfk@example.com" class="cta-btn">Email Me</a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// No logic needed for homepage
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-40px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.7); }
  80% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
.animate-fade-in { animation: fade-in 1s ease; }
.animate-fade-in-up { animation: fade-in-up 1s cubic-bezier(.4,0,.2,1); }
.animate-fade-in-down { animation: fade-in-down 1s cubic-bezier(.4,0,.2,1); }
.animate-pop-in { animation: pop-in 0.7s cubic-bezier(.4,0,.2,1); }

.nav-link {
  color: #fff;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  position: relative;
}
.nav-link:hover, .nav-link.router-link-exact-active {
  background: rgba(255,255,255,0.15);
  color: #f0f8ff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}

.cta-btn {
  background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
  color: #fff;
  font-weight: 600;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(56,189,248,0.15);
  transition: background 0.2s, transform 0.2s;
  text-decoration: none;
  display: inline-block;
}
.cta-btn:hover {
  background: linear-gradient(90deg, #1e40af 0%, #0ea5e9 100%);
  transform: translateY(-2px) scale(1.03);
}

.card {
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.07);
  padding: 2rem 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
  text-align: center;
  cursor: pointer;
  border: 1px solid #e0e7ef;
}
.card:hover {
  transform: translateY(-6px) scale(1.03);
  box-shadow: 0 8px 32px rgba(37,99,235,0.13);
}
.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 0.5rem;
}
.card-desc {
  color: #334155;
  font-size: 1rem;
}

.hero-section {
  background: linear-gradient(120deg, #f0f9ff 0%, #e0e7ef 100%);
}

.container {
  max-width: 700px;
}
</style>
