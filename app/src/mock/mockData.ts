/**
 * Mock data for development, demos, and offline states.
 * All data is representative of real Indian agricultural context.
 */

import type { SearchResult } from '../services/searchService'

export const MOCK_PADDY_BLAST_RESULT: SearchResult = {
  answer: `**Paddy Blast (Magnaporthe oryzae)** is the most widespread fungal disease affecting rice in Karnataka, especially during Kharif season.

## Identification
- Spindle-shaped lesions with grey centers and brown borders on leaves
- Collar rot at the node level in severe cases
- White or grey panicles (neck blast) in advanced stages

## Management
**Immediate action:** Remove infected leaves and destroy them. Avoid excessive nitrogen fertilizer.

**Chemical control:** Tricyclazole 75WP @ 0.6g/L water, or Carbendazim 50WP @ 1g/L

**Organic alternative:** Pseudomonas fluorescens (5g/L) as preventive spray; Neem oil (5mL/L) with soap water

## Precautions
- Do not spray during high humidity (>80%) — wait for clear conditions
- Spray in early morning or evening for best absorption
- Repeat spray after 10–12 days if infection persists`,

  citations: [
    {
      index: 1,
      source: 'ICAR-CRRI',
      title: 'Blast Disease Management in Rice',
      url: 'https://www.icar-crri.res.in',
      snippet: 'Tricyclazole remains the most effective fungicide for blast control.',
      authority_badge: 'ICAR Verified',
      authority_tier: 'gold',
      relevance_score: 0.97,
    },
    {
      index: 2,
      source: 'NIPHM',
      title: 'Integrated Pest Management - Rice Blast',
      url: 'https://niphm.gov.in',
      snippet: 'IPM strategies combining chemical and biological approaches reduce resistance risk.',
      authority_badge: 'NIPHM',
      authority_tier: 'gold',
      relevance_score: 0.91,
    },
    {
      index: 3,
      source: 'KVK Mandya',
      title: 'Kharif Crop Advisory 2024',
      url: 'https://kvk.icar.gov.in',
      snippet: 'Mandya district showed 60% blast incidence in high-humidity zones during Kharif 2023.',
      authority_badge: 'KVK Extension',
      authority_tier: 'silver',
      relevance_score: 0.84,
    },
  ],

  followUps: [
    'What is the correct dose of Tricyclazole for 1 acre?',
    'How to prevent blast in the next crop season?',
    'Are there blast-resistant paddy varieties for Mandya?',
    'What is the cost of blast treatment per acre?',
  ],

  intent: 'disease_query',
  offlineFallbackUsed: false,
  confidenceScore: 0.93,
  sourceBreakdown: { rag: 55, kag: 30, web: 15 },
  detectedLanguage: 'en',
  answerLanguage: 'en',
}

export const MOCK_MANDI_PRICES = [
  { crop: 'Tomato',     price: '₹18/kg',  change: '+₹3',  trend: 'up',   market: 'Mandya APMC'  },
  { crop: 'Paddy',      price: '₹22/kg',  change: '-₹1',  trend: 'down', market: 'Hassan APMC'  },
  { crop: 'Potato',     price: '₹14/kg',  change: '0',     trend: 'flat', market: 'Tumkur APMC'  },
  { crop: 'Sugarcane',  price: '₹3200/T', change: '+₹50', trend: 'up',   market: 'Mandya Sugar'  },
  { crop: 'Groundnut',  price: '₹58/kg',  change: '+₹2',  trend: 'up',   market: 'Dharwad APMC' },
]

export const MOCK_TASKS = [
  {
    id: '1',
    title: 'Apply Tricyclazole spray',
    description: 'Paddy blast control — Tricyclazole 75WP @ 0.6g/L on affected plots.',
    dueDate: 'Today',
    type: 'spray',
    status: 'pending',
    crop: 'Paddy',
  },
  {
    id: '2',
    title: 'Drip irrigation — North field',
    description: 'Next scheduled drip cycle for sugarcane (2 hours runtime).',
    dueDate: 'Tomorrow',
    type: 'irrigation',
    status: 'pending',
    crop: 'Sugarcane',
  },
  {
    id: '3',
    title: 'Follow-up leaf image check',
    description: "Photograph paddy leaves and compare with last week's scan.",
    dueDate: 'In 3 days',
    type: 'checkup',
    status: 'pending',
    crop: 'Paddy',
  },
  {
    id: '4',
    title: 'Apply Jeevamrut',
    description: 'Organic fertilizer dose @ 200L/acre for tomato beds.',
    dueDate: 'Yesterday',
    type: 'treatment',
    status: 'delayed',
    crop: 'Tomato',
  },
]

export const MOCK_WEATHER = {
  location: 'Mandya, Karnataka',
  temp: '29°C',
  humidity: '82%',
  condition: 'Partly Cloudy',
  forecast: 'Light rain expected in 2 days',
  blastRisk: 'High',
  advisory: 'Avoid foliar spray today. Blast risk elevated due to humidity.',
}

export const MOCK_SCHEMES = [
  {
    id: 's1',
    name: 'PM-KISAN',
    description: 'Direct income support of ₹6,000/year for small farmers.',
    eligibility: 'All landholding farmers with < 2 hectares',
    deadline: 'Rolling',
    badge: 'Central Scheme',
  },
  {
    id: 's2',
    name: 'PMFBY Crop Insurance',
    description: 'Premium-subsidized insurance against natural crop loss.',
    eligibility: 'All farmers growing notified crops',
    deadline: '31 July 2025',
    badge: 'Insurance',
  },
  {
    id: 's3',
    name: 'Drip Irrigation Subsidy',
    description: 'Up to 90% subsidy on drip and sprinkler irrigation systems.',
    eligibility: 'SC/ST and small/marginal farmers get higher subsidy',
    deadline: '30 September 2025',
    badge: 'State Scheme',
  },
]

export const MOCK_TRENDING_QUERIES = [
  'Paddy blast treatment',
  'Tomato price in Mandya',
  'PM-KISAN next installment',
  'Cotton bollworm control',
  'Urea dose for wheat',
  'Kharif season advisory',
]
