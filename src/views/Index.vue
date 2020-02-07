<template>
  <header-section/>
  <carosol-section/>
</template>

<script>

import Header from '@/components/Header.vue'
import Carosol from '@/components/Carosol.vue'

export default {
    name: 'Home',

    data () {
      return {
        
      }
    },

    components: {
      'header-section': Header,
      'carosol-section': Carosol
    },
}
</script>