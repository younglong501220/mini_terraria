import { CraftingRecipe } from '../types/game';
import { createItem } from './items';

export const RECIPES: CraftingRecipe[] = [
  // --- By Hand ---
  {
    id: 'craft_torch',
    result: createItem('torch', 3),
    requiredStation: 'hand',
    ingredients: [
      { itemId: 'wood', name: '木材', count: 1 },
      { itemId: 'gel', name: '凝膠', count: 1 },
    ],
  },
  {
    id: 'craft_platform',
    result: createItem('platform', 2),
    requiredStation: 'hand',
    ingredients: [{ itemId: 'wood', name: '木材', count: 1 }],
  },
  {
    id: 'craft_wall_wood',
    result: createItem('wall_wood', 4),
    requiredStation: 'hand',
    ingredients: [{ itemId: 'wood', name: '木材', count: 1 }],
  },
  {
    id: 'craft_workbench',
    result: createItem('workbench', 1),
    requiredStation: 'hand',
    ingredients: [{ itemId: 'wood', name: '木材', count: 10 }],
  },
  {
    id: 'craft_sword_wood',
    result: createItem('sword_wood', 1),
    requiredStation: 'hand',
    ingredients: [{ itemId: 'wood', name: '木材', count: 7 }],
  },

  // --- Work Bench ---
  {
    id: 'craft_door',
    result: createItem('door', 1),
    requiredStation: 'workbench',
    ingredients: [{ itemId: 'wood', name: '木材', count: 6 }],
  },
  {
    id: 'craft_bow_wood',
    result: createItem('bow_wood', 1),
    requiredStation: 'workbench',
    ingredients: [{ itemId: 'wood', name: '木材', count: 10 }],
  },
  {
    id: 'craft_arrow',
    result: createItem('arrow', 10),
    requiredStation: 'workbench',
    ingredients: [
      { itemId: 'wood', name: '木材', count: 1 },
      { itemId: 'stone', name: '石塊', count: 1 },
    ],
  },
  {
    id: 'craft_furnace',
    result: createItem('furnace', 1),
    requiredStation: 'workbench',
    ingredients: [
      { itemId: 'stone', name: '石塊', count: 20 },
      { itemId: 'wood', name: '木材', count: 4 },
      { itemId: 'torch', name: '火把', count: 3 },
    ],
  },
  {
    id: 'craft_suspicious_eye',
    result: createItem('suspicious_eye', 1),
    requiredStation: 'workbench',
    ingredients: [
      { itemId: 'lens', name: '晶狀體', count: 4 },
      { itemId: 'gel', name: '凝膠', count: 5 },
    ],
  },
  {
    id: 'craft_healing_potion',
    result: createItem('healing_potion', 2),
    requiredStation: 'workbench',
    ingredients: [
      { itemId: 'gel', name: '凝膠', count: 2 },
      { itemId: 'wood', name: '木材', count: 1 },
    ],
  },
  {
    id: 'craft_sword_iron',
    result: createItem('sword_iron', 1),
    requiredStation: 'workbench',
    ingredients: [{ itemId: 'iron_bar', name: '鐵錠', count: 8 }],
  },
  {
    id: 'craft_pickaxe_iron',
    result: createItem('pickaxe_iron', 1),
    requiredStation: 'workbench',
    ingredients: [
      { itemId: 'iron_bar', name: '鐵錠', count: 10 },
      { itemId: 'wood', name: '木材', count: 3 },
    ],
  },

  // --- Furnace ---
  {
    id: 'smelt_copper',
    result: createItem('copper_bar', 1),
    requiredStation: 'furnace',
    ingredients: [{ itemId: 'copper_ore', name: '銅礦石', count: 3 }],
  },
  {
    id: 'smelt_iron',
    result: createItem('iron_bar', 1),
    requiredStation: 'furnace',
    ingredients: [{ itemId: 'iron_ore', name: '鐵礦石', count: 3 }],
  },
  {
    id: 'smelt_gold',
    result: createItem('gold_bar', 1),
    requiredStation: 'furnace',
    ingredients: [{ itemId: 'gold_ore', name: '金礦石', count: 4 }],
  },
];
