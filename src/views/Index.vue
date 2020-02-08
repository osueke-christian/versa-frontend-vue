<template>
    <div>
        <carosol-section/>
        <services-section/>
        <investment-section/>
        <portfolio-section/>
        <partner-section/>
    </div>

</template>

<script>
import Carosol from '@/components/Carosol.vue'
import Services from '@/components/Services.vue'
import Investment from '@/components/Investment.vue'
import Portfolio from '@/components/Portfolio.vue'
import Partner from '@/components/Partner.vue'

export default {
    name: 'Home',

    data () {
      return {
        
      }
    },

    components: {
      'carosol-section': Carosol,
      'services-section': Services,
      'investment-section': Investment,
      'portfolio-section': Portfolio,
      'partner-section': Partner
    },
}
</script>