<template>
  <div id="app">
      <div class="container">
        <header-section/>
        <router-view/>
      </div>
      <footer-section/>
  </div>
</template>

<script>

import Footer from '@/components/Footer.vue'
import Header from '@/components/Header.vue'
export default {
    name: 'App',

    data () {
      return {
        //
      }
    },

    components: {
      'header-section': Header,
      'footer-section': Footer
    },
}
</script>