<template>
  <div>
    <p style="font-family: monospace;">
      see console
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// test
import { Algonaut } from '@thencc/algonautjs';

export default defineComponent({
  async mounted() {
    console.log('mounted');
    this.run();
  },
  methods: {
    async run() {
      console.log('run started');

      console.log(Algonaut);

      const algonaut = new Algonaut({
        BASE_SERVER: import.meta.env.NCC_BASE_SERVER!,
        INDEX_SERVER: import.meta.env.NCC_INDEX_SERVER!,
        LEDGER: import.meta.env.NCC_LEDGER!,
        PORT: import.meta.env.NCC_PORT!,
        API_TOKEN: { [import.meta.env.NCC_API_TOKEN_HEADER!]: import.meta.env.NCC_API_TOKEN! }
      });

      // test api call
      const appInfo = await algonaut.getAppInfo(49584323);
      console.log(appInfo);

      console.log('done');

      // TODO catch this somehow
      // throw new Error('bewm');
    }
  }
});
</script>

<style scoped>
</style>
