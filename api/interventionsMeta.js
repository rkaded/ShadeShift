/**
 * Lightweight copy of intervention metadata for the API layer.
 * Keeps the API independent of the React/browser src/ tree.
 */
export const INTERVENTIONS_META = {
  tree:         { label: 'Tree',           emoji: '🌳', cooling: 1.8, cost: 800   },
  shade:        { label: 'Shade Structure', emoji: '⛱️', cooling: 1.2, cost: 2000  },
  greenRoof:    { label: 'Green Roof',      emoji: '🏢', cooling: 0.8, cost: 15000 },
  coolPavement: { label: 'Cool Pavement',   emoji: '🛤️', cooling: 0.5, cost: 50    },
  water:        { label: 'Water Feature',   emoji: '⛲', cooling: 2.1, cost: 50000 },
};
