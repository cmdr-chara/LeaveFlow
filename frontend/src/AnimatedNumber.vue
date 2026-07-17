<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props=withDefaults(defineProps<{value:number;duration?:number}>(),{duration:700})
const shown=ref(0)
let frame=0

function animate(next:number,previous:number){
  cancelAnimationFrame(frame)
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){shown.value=next;return}
  const start=performance.now(), distance=next-previous
  const tick=(time:number)=>{
    const progress=Math.min((time-start)/props.duration,1)
    const eased=1-Math.pow(1-progress,4)
    shown.value=Math.round(previous+distance*eased)
    if(progress<1)frame=requestAnimationFrame(tick)
  }
  frame=requestAnimationFrame(tick)
}
watch(()=>props.value,(next,previous)=>animate(next,previous))
onMounted(()=>animate(props.value,0))
onBeforeUnmount(()=>cancelAnimationFrame(frame))
</script>
<template><span class="animated-number">{{shown}}</span></template>
