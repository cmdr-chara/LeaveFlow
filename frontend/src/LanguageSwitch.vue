<script setup lang="ts">
import { Globe2 } from 'lucide-vue-next'

import { currentLocale, setLocale, t, type Locale } from './i18n'

const choose = (locale: Locale) => setLocale(locale)
</script>

<template>
  <div class="language-switch" role="group" :aria-label="t('language.label')">
    <Globe2 :size="15" aria-hidden="true"/>
    <button type="button" :class="{ active: currentLocale === 'it' }" @click="choose('it')">IT</button>
    <button type="button" :class="{ active: currentLocale === 'en' }" @click="choose('en')">EN</button>
  </div>
</template>
