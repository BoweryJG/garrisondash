# Garrison Dash - Immersive 3D Dashboard

An otherworldly cockpit dashboard with vintage-sci-fi gauges, built with Three.js and real-time Supabase integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Supabase:
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key

3. Run development server:
```bash
npm run dev
```

## Features

- 4 floating vintage-sci-fi gauges
- Touch-manipulable interface (drag, pinch, zoom)
- Real-time Supabase data integration
- Cinematic lighting and effects
- Mobile-first responsive design
- Physics-based needle animations

## Gauge Configuration

Each gauge can be connected to a Supabase table/field by updating the config in `src/scene.ts`:

```typescript
{
  label: 'Revenue',
  color: 0x4cc9ff,
  min: 0,
  max: 100000,
  supabaseTable: 'metrics',
  supabaseField: 'revenue'
}
```