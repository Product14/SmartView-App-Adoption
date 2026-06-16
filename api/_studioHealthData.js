// ─── Studio Health Report — data assembly ────────────────────────────────────
// Turns the three parsed sheet sources into the payload buildStudioHealthHtml()
// expects. Kept here (shared by the endpoint and the local tester) so the
// metric → matcher wiring lives in exactly one place.

import { planCounts, lifecycleFunnel } from '../src/data/aggregations.js'
import { liveRooftops } from '../src/data/transform.js'
import { pickGroup, pickMetric, pickMetricAnywhere, adoptionMatch } from '../src/data/studioMetrics.js'
import { computeInsights, templatedCommentary } from '../src/data/studioInsights.js'
import { phraseCommentary } from './_studioHealthLLM.js'

/**
 * @param {object} sources
 * @param {Array}  sources.rooftopRows  normalizeRows() output — ALL stages (Rooftop Level tab)
 * @param {Map}    sources.healthMap    parseMatrix() output (Studio Health tab)
 * @param {Map}    sources.adoptionMap  parseMatrix() output (Studio Adoption tab)
 * @returns {Promise<object>} payload for buildStudioHealthHtml (async — may call the LLM)
 */
export async function buildStudioHealthPayload({ rooftopRows, healthMap, adoptionMap }) {
  // Funnel is a cumulative lifecycle view (Contracted ⊇ PWS/Onboarding/Live); all
  // other rooftop math counts only operational rooftops (Live/Onboarding).
  const funnel = lifecycleFunnel(rooftopRows)
  const plan = planCounts(liveRooftops(rooftopRows))

  const imagesG = pickGroup(healthMap, 'image')
  const three60G = pickGroup(healthMap, '360')
  const videoG = pickGroup(healthMap, 'video')

  const images = [
    // Two Images rows now contain "6hr": the "(%)" row and a new "# Delivered <6hrs"
    // count (reserved for later). Require "%" so we always pick the percentage, never
    // the count — independent of their row order.
    { label: 'Delivered (&lt;6 hrs) %', cols: pickMetric(imagesG, (m) => m.toLowerCase().includes('6hr') && m.includes('%')) },
    { label: 'Pendency', cols: pickMetric(imagesG, 'pendency') },
    { label: 'P95 Delivery Time (hrs)', cols: pickMetric(imagesG, 'p95') },
    // "Avg Media score" sits under a blank/global product line, so search the whole tab.
    { label: 'Avg Media Score', cols: pickMetricAnywhere(healthMap, 'media') },
  ]

  // 360 & Video "Delivered %" is the Fulfillment row (spelled "Fullfillment" on 360).
  const three60 = [
    { label: 'Delivered %', sub: '(Fulfillment)', cols: pickMetric(three60G, 'ful') },
    { label: 'Delivered (&lt;6 hrs) %', cols: pickMetric(three60G, '6hr') },
    { label: 'Pendency', cols: pickMetric(three60G, 'pendency') },
    { label: 'P95 Delivery Time (hrs)', cols: pickMetric(three60G, 'p95') },
  ]

  const video = [
    { label: 'Delivered %', sub: '(Fulfillment)', cols: pickMetric(videoG, 'ful') },
    { label: 'Delivered (&lt;12 hrs) %', cols: pickMetric(videoG, '12hr') },
    { label: 'Pendency', cols: pickMetric(videoG, 'pendency') },
    { label: 'P95 Delivery Time (hrs)', cols: pickMetric(videoG, 'p95') },
  ]

  const adoption = [
    { label: 'App', cols: pickMetric(pickGroup(adoptionMap, 'app'), adoptionMatch) },
    { label: 'SmartView VDP', cols: pickMetric(pickGroup(adoptionMap, 'smartview'), adoptionMatch) },
    { label: 'SmartMatch', cols: pickMetric(pickGroup(adoptionMap, 'match'), adoptionMatch) },
    { label: 'SmartView VLP', cols: pickMetric(pickGroup(adoptionMap, 'vlp'), adoptionMatch) },
    { label: 'Smart Campaign', cols: pickMetric(pickGroup(adoptionMap, 'campaign'), adoptionMatch) },
  ]

  // Section commentary: numbers computed deterministically, then optionally phrased
  // by GPT. Templated text is the always-available fallback (per missing section too).
  const facts = computeInsights({ images, three60, video, adoption })
  const templated = {
    images: templatedCommentary(facts.images),
    three60: templatedCommentary(facts.three60),
    video: templatedCommentary(facts.video),
    adoption: templatedCommentary(facts.adoption),
  }
  const llm = await phraseCommentary(templated)
  const commentary = {
    images: llm?.images || templated.images,
    three60: llm?.three60 || templated.three60,
    video: llm?.video || templated.video,
    adoption: llm?.adoption || templated.adoption,
  }

  return { funnel, planCounts: plan, images, three60, video, adoption, commentary }
}
