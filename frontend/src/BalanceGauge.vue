<script setup lang="ts">
import { computed } from 'vue'
const props=defineProps<{used:number;allowance:number}>()
const available=computed(()=>Math.max(props.allowance-props.used,0))
const usedPercent=computed(()=>props.allowance?Math.min(props.used/props.allowance*100,100):0)
const availablePercent=computed(()=>props.allowance?Math.round(available.value/props.allowance*100):0)
</script>
<template>
  <div class="balance-gauge" role="img" :aria-label="`${available} giorni disponibili su ${allowance}`">
    <svg viewBox="0 0 240 240" aria-hidden="true">
      <circle class="gauge-halo" cx="120" cy="120" r="105"/>
      <circle class="gauge-track" cx="120" cy="120" r="84" pathLength="100"/>
      <circle class="gauge-available" cx="120" cy="120" r="84" pathLength="100" :style="{strokeDasharray:`${availablePercent} ${100-availablePercent}`}"/>
      <circle class="gauge-used" cx="120" cy="120" r="84" pathLength="100" :style="{strokeDasharray:`${usedPercent} ${100-usedPercent}`,strokeDashoffset:`${-availablePercent}`}"/>
      <g class="gauge-ticks"><line v-for="tick in 12" :key="tick" x1="120" y1="19" x2="120" y2="27" :transform="`rotate(${tick*30} 120 120)`"/></g>
    </svg>
    <div class="gauge-value"><span>SALDO RESIDUO</span><strong>{{availablePercent}}<i>%</i></strong><small>{{used}} {{used===1?'giorno usato':'giorni usati'}}</small></div>
  </div>
</template>
