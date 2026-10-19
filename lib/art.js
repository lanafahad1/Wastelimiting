// Generated food illustrations. Each recipe has an `art` spec (vessel, base,
// items) and is drawn as a soft, top-down still life in the CareBite palette.
// If a real photograph is listed in photos.js it is used instead.

import { PHOTOS, HERO_PHOTO } from './photos.js';

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const f = (n) => Math.round(n * 10) / 10;

const TABLE = { breakfast: '#FBE1E6', lunch: '#E8F3E8', dinner: '#FFF1F4', snack: '#EEF5EC' };

const BASES = {
  oats: { fill: '#EBDCC2', dots: '#D9C29A' }, 'tomato-sauce': { fill: '#E98D78', dots: '#D9705C' }, 'beans-brown': { fill: '#C49A73', dots: '#A87C55' },
  yogurt: { fill: '#FCFAF6', swirl: '#EFE6DA' }, 'tofu-scramble': { fill: '#F3DC93', dots: '#E5C66E' }, quinoa: { fill: '#F0E3C8', dots: '#DCC69C' },
  'soup-orange': { fill: '#F2B07E', swirl: '#E89A62' }, greens: { fill: '#B5D6A7', leaves: true }, 'rice-brown': { fill: '#DECAA6', dots: '#C8AE80' },
  noodles: { fill: '#F4E7C6', noodles: '#E5D2A4' }, herbs: { fill: '#BFDDAE', leaves: true }, chili: { fill: '#CF7C66', dots: '#B9634D' },
  curry: { fill: '#EBBB62', swirl: '#DDA344' }, 'rice-spiced': { fill: '#EFCD82', dots: '#DDB25F' }, pasta: { fill: '#EBD29E', noodles: '#D8B979' },
  couscous: { fill: '#F0DCAA', dots: '#DFC487' }, bulgur: { fill: '#E2C995', dots: '#CDAF74' }, chia: { fill: '#ECE5DE', dots: '#5B5452' },
  'smoothie-tan': { fill: '#EBD2B2' }, jareesh: { fill: '#EFE4CF', dots: '#D9C7A5' }, saleeg: { fill: '#F7F0E1', dots: '#E3D5B6' },
  'stew-red': { fill: '#D9896B', dots: '#C4704F' }, porridge: { fill: '#EADCC2', swirl: '#D7C29E' }, 'rice-yellow': { fill: '#F2D98E', dots: '#E2C063' },
  laban: { fill: '#FBFAF6' }, none: null,
};

// ---------------------------------------------------------------- items
const leaf = (x, y, s, r, c1 = '#7DB57C', c2 = '#5E9A60') => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M0 -9 C7 -6 7 6 0 9 C-7 6 -7 -6 0 -9Z" fill="${c1}"/><path d="M0 -8 L0 8" stroke="${c2}" stroke-width="1" fill="none"/></g>`;
const ITEMS = {
  blueberry: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(6 * s)}" fill="#6F80B6"/><circle cx="${f(x - 2 * s)}" cy="${f(y - 2 * s)}" r="${f(1.6 * s)}" fill="#A9B6DD"/>`,
  strawberry: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M0 11 C-10 4 -10 -6 -4 -8 C-2 -9 2 -9 4 -8 C10 -6 10 4 0 11Z" fill="#E8707F"/><path d="M-5 -8 L0 -12 L5 -8 L2 -7 L0 -10 L-2 -7Z" fill="#79B06F"/><circle cx="-3" cy="-2" r=".9" fill="#FBE3A0"/><circle cx="3" cy="0" r=".9" fill="#FBE3A0"/><circle cx="0" cy="4" r=".9" fill="#FBE3A0"/></g>`,
  raspberry: (x, y, s) => [[0, 0], [-3, -2], [3, -2], [-2, 3], [2, 3], [0, -4]].map(([dx, dy]) => `<circle cx="${f(x + dx * s)}" cy="${f(y + dy * s)}" r="${f(2.6 * s)}" fill="#E06C88"/>`).join(''),
  seed: (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(1.6 * s)}" ry="${f(1.1 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#4F4A48"/>`,
  sesame: (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(2.2 * s)}" ry="${f(1.2 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F7EED8" stroke="#E3D4B0" stroke-width=".5"/>`,
  mint: (x, y, s, r) => leaf(x, y, s, r, '#86C08A', '#5F9C66'),
  herb: (x, y, s, r) => leaf(x, y, s * 0.55, r, '#7FB97B', '#5D985C'),
  basil: (x, y, s, r) => leaf(x, y, s * 1.1, r, '#5FA65E', '#3F8443'),
  spinach: (x, y, s, r) => leaf(x, y, s * 1.3, r, '#6FA868', '#4E8A4E'),
  'egg-fried': (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-16 -4 C-14 -16 6 -18 14 -8 C20 0 12 14 0 14 C-12 15 -18 6 -16 -4Z" fill="#FFFDF8"/><circle cx="0" cy="0" r="7" fill="#F6C453"/><circle cx="-2" cy="-2" r="2" fill="#FBE29A"/></g>`,
  'egg-half': (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><ellipse rx="13" ry="10" fill="#FFFDF8" stroke="#EFE5D6"/><circle r="6" fill="#F6C453"/></g>`,
  'egg-muffin': (x, y, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><circle r="21" fill="#F7E6E9"/><circle r="17" fill="#F2D27A"/><circle cx="-6" cy="-4" r="3" fill="#6FA868"/><circle cx="5" cy="3" r="3" fill="#E7705F"/><circle cx="-2" cy="7" r="2.5" fill="#6FA868"/><circle cx="7" cy="-6" r="2" fill="#FFFDF8"/></g>`,
  'tomato-dice': (x, y, s, r) => `<rect x="${f(x - 4 * s)}" y="${f(y - 4 * s)}" width="${f(8 * s)}" height="${f(8 * s)}" rx="${f(2 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#E5735F"/>`,
  'tomato-cherry': (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(8 * s)}" fill="#E86A5C"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(5.2 * s)}" fill="#F29A86"/><circle cx="${f(x - 1.5 * s)}" cy="${f(y + 1 * s)}" r="${f(1 * s)}" fill="#FBE3A0"/><circle cx="${f(x + 2 * s)}" cy="${f(y - 1 * s)}" r="${f(1 * s)}" fill="#FBE3A0"/>`,
  'tomato-slice': (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(13 * s)}" fill="#E5675A"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(10 * s)}" fill="#F0907E"/><path d="M${f(x)} ${f(y - 10 * s)} L${f(x)} ${f(y + 10 * s)} M${f(x - 9 * s)} ${f(y - 5 * s)} L${f(x + 9 * s)} ${f(y + 5 * s)} M${f(x - 9 * s)} ${f(y + 5 * s)} L${f(x + 9 * s)} ${f(y - 5 * s)}" stroke="#E5675A" stroke-width="${f(1.4 * s)}"/>`,
  'pepper-red': (x, y, s, r) => `<path d="M${f(x - 8 * s)} ${f(y)} Q${f(x)} ${f(y - 9 * s)} ${f(x + 8 * s)} ${f(y)}" stroke="#E25F55" stroke-width="${f(3.4 * s)}" stroke-linecap="round" fill="none" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  'pepper-green': (x, y, s, r) => `<path d="M${f(x - 8 * s)} ${f(y)} Q${f(x)} ${f(y - 9 * s)} ${f(x + 8 * s)} ${f(y)}" stroke="#7DAF5B" stroke-width="${f(3.4 * s)}" stroke-linecap="round" fill="none" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  'pepper-strip': (x, y, s, r) => `<rect x="${f(x - 3 * s)}" y="${f(y - 20 * s)}" width="${f(7 * s)}" height="${f(40 * s)}" rx="${f(3.5 * s)}" fill="#E8665A" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  cucumber: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(9 * s)}" fill="#6FA36A"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(7.6 * s)}" fill="#D7EBC0"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(3 * s)}" fill="#BFDDA2"/>`,
  'cucumber-stick': (x, y, s, r) => `<g transform="rotate(${f(r)} ${f(x)} ${f(y)})"><rect x="${f(x - 4 * s)}" y="${f(y - 22 * s)}" width="${f(8 * s)}" height="${f(44 * s)}" rx="${f(3 * s)}" fill="#D7EBC0"/><rect x="${f(x + 2 * s)}" y="${f(y - 22 * s)}" width="${f(2.4 * s)}" height="${f(44 * s)}" rx="${f(1.2 * s)}" fill="#6FA36A"/></g>`,
  chickpea: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(5.4 * s)}" fill="#E9C68C"/><path d="M${f(x - 2 * s)} ${f(y - 4 * s)} Q${f(x + 1 * s)} ${f(y)} ${f(x - 1 * s)} ${f(y + 4 * s)}" stroke="#D2A866" stroke-width="${f(.9 * s)}" fill="none"/>`,
  'chickpea-roasted': (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(6 * s)}" fill="#D99850"/><path d="M${f(x - 2 * s)} ${f(y - 4 * s)} Q${f(x + 1 * s)} ${f(y)} ${f(x - 1 * s)} ${f(y + 4 * s)}" stroke="#B9783A" stroke-width="${f(1 * s)}" fill="none"/>`,
  'bean-black': (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5 * s)}" ry="${f(3.2 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#4D4659"/>`,
  'bean-red': (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5.4 * s)}" ry="${f(3.4 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#A9474A"/>`,
  'bean-white': (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5.4 * s)}" ry="${f(3.4 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F4ECDC" stroke="#DCCDB2" stroke-width=".8"/>`,
  edamame: (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5 * s)}" ry="${f(4 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#9FCB6E"/><ellipse cx="${f(x - 1 * s)}" cy="${f(y - 1 * s)}" rx="${f(1.5 * s)}" ry="${f(1 * s)}" fill="#C6E39F"/>`,
  feta: (x, y, s, r) => `<rect x="${f(x - 5 * s)}" y="${f(y - 5 * s)}" width="${f(10 * s)}" height="${f(10 * s)}" rx="${f(2 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#FFFEFB" stroke="#E9E1D3" stroke-width=".8"/>`,
  'onion-ring': (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(8 * s)}" fill="none" stroke="#B87CA8" stroke-width="${f(2.2 * s)}"/>`,
  avocado: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-18 4 C-10 -10 10 -10 18 4 C10 0 -10 0 -18 4Z" fill="#5E7F3E"/><path d="M-15 3 C-8 -7 8 -7 15 3 C8 0 -8 0 -15 3Z" fill="#B5D38A"/></g>`,
  'avocado-mash': (x, y, s) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(26 * s)}" ry="${f(20 * s)}" fill="#B8D58E"/><circle cx="${f(x - 6 * s)}" cy="${f(y - 4 * s)}" r="${f(2 * s)}" fill="#A2C574"/><circle cx="${f(x + 8 * s)}" cy="${f(y + 3 * s)}" r="${f(2 * s)}" fill="#A2C574"/>`,
  toast: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-36 -24 C-36 -40 -20 -42 -12 -36 C-6 -44 12 -44 18 -36 C30 -40 38 -30 36 -20 L36 32 C36 36 34 38 30 38 L-30 38 C-34 38 -36 36 -36 32Z" fill="#C98F4E"/><path d="M-31 -20 C-31 -33 -18 -34 -11 -29 C-6 -36 10 -36 15 -29 C26 -33 32 -26 31 -17 L31 29 C31 32 30 33 27 33 L-27 33 C-30 33 -31 32 -31 29Z" fill="#EAC48A"/></g>`,
  pita: (x, y, s, r) => `<path d="M${f(x)} ${f(y)} L${f(x + 34 * s)} ${f(y - 10 * s)} A36 36 0 0 1 ${f(x + 30 * s)} ${f(y + 22 * s)} Z" fill="#E8C690" stroke="#D3A869" stroke-width="1.2" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  'pita-chip': (x, y, s, r) => `<path d="M${f(x - 7 * s)} ${f(y + 6 * s)} L${f(x)} ${f(y - 8 * s)} L${f(x + 7 * s)} ${f(y + 6 * s)}Z" fill="#E6BF84" stroke="#D2A462" stroke-width=".8" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  chicken: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><rect x="-15" y="-7" width="30" height="14" rx="6" fill="#EBCDA4"/><path d="M-8 -6 L-12 6 M0 -6 L-4 6 M8 -6 L4 6" stroke="#C99560" stroke-width="2" stroke-linecap="round"/></g>`,
  'chicken-breast': (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-44 6 C-44 -18 -10 -26 22 -20 C44 -16 50 6 36 16 C18 28 -44 30 -44 6Z" fill="#E7C08F"/><path d="M-28 -12 L-36 14 M-12 -16 L-20 18 M4 -18 L-4 20 M20 -16 L12 18" stroke="#BF8A55" stroke-width="3" stroke-linecap="round"/></g>`,
  tuna: (x, y, s, r) => `<path d="M${f(x - 8 * s)} ${f(y)} C${f(x - 6 * s)} ${f(y - 7 * s)} ${f(x + 6 * s)} ${f(y - 7 * s)} ${f(x + 8 * s)} ${f(y)} C${f(x + 5 * s)} ${f(y + 6 * s)} ${f(x - 5 * s)} ${f(y + 6 * s)} ${f(x - 8 * s)} ${f(y)}Z" fill="#E4B9A3" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  salmon: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-48 -10 C-30 -26 30 -26 48 -12 C52 6 40 22 20 22 L-40 18 C-52 14 -54 0 -48 -10Z" fill="#F39C7F"/><path d="M-30 -16 C-26 -4 -28 8 -34 16 M-12 -19 C-8 -6 -10 8 -16 19 M6 -20 C10 -6 8 8 2 20 M24 -18 C28 -6 26 8 20 20" stroke="#FBD3C2" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M-48 -10 C-30 -26 30 -26 48 -12" stroke="#DA7F63" stroke-width="2" fill="none"/></g>`,
  'fish-white': (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-46 -8 C-28 -24 28 -24 46 -10 C50 8 38 22 18 22 L-38 18 C-50 14 -52 0 -46 -8Z" fill="#F7F0E6"/><path d="M-46 -8 C-28 -24 28 -24 46 -10" stroke="#E7C98E" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-20 -12 C-16 0 -18 10 -22 18 M4 -14 C8 -2 6 10 2 20" stroke="#EDE2D0" stroke-width="2" fill="none"/></g>`,
  'fish-red': (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-46 -8 C-28 -24 28 -24 46 -10 C50 8 38 22 18 22 L-38 18 C-50 14 -52 0 -46 -8Z" fill="#E58A6E"/><circle cx="-20" cy="0" r="2.5" fill="#7DB57C"/><circle cx="2" cy="6" r="2.5" fill="#7DB57C"/><circle cx="20" cy="-4" r="2.5" fill="#7DB57C"/><path d="M-46 -8 C-28 -24 28 -24 46 -10" stroke="#C96A50" stroke-width="3" fill="none"/></g>`,
  shrimp: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M10 -10 A12 12 0 1 1 -10 8" stroke="#F4A07F" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M6 -4 L12 -8 M2 4 L8 2 M-6 8 L-4 2" stroke="#FAD0BE" stroke-width="1.5"/></g>`,
  mango: (x, y, s, r) => `<rect x="${f(x - 6 * s)}" y="${f(y - 6 * s)}" width="${f(12 * s)}" height="${f(12 * s)}" rx="${f(3 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F7C35F"/><rect x="${f(x - 3 * s)}" y="${f(y - 4 * s)}" width="${f(4 * s)}" height="${f(3 * s)}" rx="${f(1 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#FBDB92"/>`,
  lemon: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-16 0 A16 16 0 0 1 16 0 Z" fill="#F2D64F"/><path d="M-13 0 A13 13 0 0 1 13 0 Z" fill="#FBEB9C"/><path d="M0 0 L0 -12 M0 0 L-8 -9 M0 0 L8 -9" stroke="#F2D64F" stroke-width="1.4"/></g>`,
  lime: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-16 0 A16 16 0 0 1 16 0 Z" fill="#8DBE57"/><path d="M-13 0 A13 13 0 0 1 13 0 Z" fill="#CBE69B"/><path d="M0 0 L0 -12 M0 0 L-8 -9 M0 0 L8 -9" stroke="#8DBE57" stroke-width="1.4"/></g>`,
  walnut: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-9 0 C-9 -8 -2 -9 0 -5 C2 -9 9 -8 9 0 C9 7 2 9 0 5 C-2 9 -9 7 -9 0Z" fill="#B88A5E"/><path d="M0 -5 L0 5 M-5 -3 C-3 0 -6 3 -4 5 M5 -3 C3 0 6 3 4 5" stroke="#946840" stroke-width="1" fill="none"/></g>`,
  almond: (x, y, s, r) => `<path d="M${f(x)} ${f(y - 7 * s)} C${f(x + 5 * s)} ${f(y - 3 * s)} ${f(x + 4 * s)} ${f(y + 6 * s)} ${f(x)} ${f(y + 7 * s)} C${f(x - 4 * s)} ${f(y + 6 * s)} ${f(x - 5 * s)} ${f(y - 3 * s)} ${f(x)} ${f(y - 7 * s)}Z" fill="#D6A574" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  peanut: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><ellipse cx="-3.5" rx="4.5" ry="3.8" fill="#D9AE77"/><ellipse cx="3.5" rx="4.5" ry="3.8" fill="#D9AE77"/></g>`,
  oat: (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(3.4 * s)}" ry="${f(2 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#E3CFA6"/>`,
  pomegranate: (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(3.2 * s)}" ry="${f(2.6 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#C9415F"/><circle cx="${f(x - 1 * s)}" cy="${f(y - 1 * s)}" r="${f(.8 * s)}" fill="#F08AA0"/>`,
  banana: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(9 * s)}" fill="#F7E7A6" stroke="#EBD07A" stroke-width="1.2"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(2 * s)}" fill="#E5CF86"/>`,
  'apple-slice': (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-22 6 C-14 -10 14 -10 22 6 C12 2 -12 2 -22 6Z" fill="#E36A6A"/><path d="M-19 5 C-12 -6 12 -6 19 5 C10 2 -10 2 -19 5Z" fill="#FBF0D8"/></g>`,
  'nut-butter': (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(26 * s)}" fill="#FFFFFF" stroke="#EDE5E5" stroke-width="2"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(20 * s)}" fill="#C99A68"/><path d="M${f(x - 10 * s)} ${f(y)} q${f(5 * s)} ${f(-8 * s)} ${f(12 * s)} ${f(-2 * s)}" stroke="#B5844F" stroke-width="2" fill="none"/>`,
  date: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><ellipse rx="20" ry="9" fill="#8C5B3C"/><ellipse cx="-4" cy="-3" rx="9" ry="2.4" fill="#A87451"/></g>`,
  popcorn: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(6 * s)}" fill="#FCF4DC"/><circle cx="${f(x + 5 * s)}" cy="${f(y - 2 * s)}" r="${f(4.5 * s)}" fill="#FFF9EA"/><circle cx="${f(x - 3 * s)}" cy="${f(y + 4 * s)}" r="${f(4 * s)}" fill="#F8EBC4"/>`,
  tofu: (x, y, s, r) => `<rect x="${f(x - 8 * s)}" y="${f(y - 8 * s)}" width="${f(16 * s)}" height="${f(16 * s)}" rx="${f(3 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F6EBD2" stroke="#E2C27F" stroke-width="2"/>`,
  broccoli: (x, y, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><rect x="-2.5" y="2" width="5" height="10" rx="2" fill="#A9CF8A"/><circle cx="-5" cy="-1" r="6" fill="#5FA05C"/><circle cx="5" cy="-1" r="6" fill="#5FA05C"/><circle cx="0" cy="-6" r="6.5" fill="#6FAE6A"/></g>`,
  'snow-pea': (x, y, s, r) => `<path d="M${f(x - 14 * s)} ${f(y)} C${f(x - 6 * s)} ${f(y - 7 * s)} ${f(x + 6 * s)} ${f(y - 7 * s)} ${f(x + 14 * s)} ${f(y)} C${f(x + 6 * s)} ${f(y + 4 * s)} ${f(x - 6 * s)} ${f(y + 4 * s)} ${f(x - 14 * s)} ${f(y)}Z" fill="#9CCB6E" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  carrot: (x, y, s, r) => `<rect x="${f(x - 9 * s)}" y="${f(y - 2 * s)}" width="${f(18 * s)}" height="${f(4 * s)}" rx="${f(2 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F2A35C"/>`,
  'carrot-stick': (x, y, s, r) => `<rect x="${f(x - 3.5 * s)}" y="${f(y - 24 * s)}" width="${f(7 * s)}" height="${f(48 * s)}" rx="${f(3.5 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F2A35C"/>`,
  'sweet-potato': (x, y, s, r) => `<rect x="${f(x - 6 * s)}" y="${f(y - 6 * s)}" width="${f(12 * s)}" height="${f(12 * s)}" rx="${f(3 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F0A35E" stroke="#D9853F" stroke-width="1"/>`,
  corn: (x, y, s, r) => `<rect x="${f(x - 3 * s)}" y="${f(y - 3 * s)}" width="${f(6 * s)}" height="${f(6 * s)}" rx="${f(1.6 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F6D66B"/>`,
  zucchini: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(9 * s)}" fill="#5F8F4C"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(7.4 * s)}" fill="#DDECBF"/>`,
  eggplant: (x, y, s, r) => `<rect x="${f(x - 7 * s)}" y="${f(y - 7 * s)}" width="${f(14 * s)}" height="${f(14 * s)}" rx="${f(3 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F3E3C6" stroke="#8E6496" stroke-width="${f(2.4 * s)}"/>`,
  mushroom: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-11 0 C-11 -9 11 -9 11 0 L4 0 L4 8 L-4 8 L-4 0Z" fill="#DCCBB8"/></g>`,
  'red-cabbage': (x, y, s, r) => `<path d="M${f(x - 10 * s)} ${f(y)} q${f(10 * s)} ${f(-6 * s)} ${f(20 * s)} 0" stroke="#A56BAB" stroke-width="${f(2.6 * s)}" fill="none" stroke-linecap="round" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  radish: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(8 * s)}" fill="#E47C9B"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(6.3 * s)}" fill="#FFF7F8"/>`,
  olive: (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(5.5 * s)}" ry="${f(4.2 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#56505F"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(1.6 * s)}" fill="#8A8295"/>`,
  asparagus: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><rect x="-2.6" y="-26" width="5.2" height="54" rx="2.6" fill="#86B86A"/><ellipse cx="0" cy="-27" rx="3.6" ry="6" fill="#5E9348"/><path d="M-3 -12 l-3 -3 M3 0 l3 -3 M-3 12 l-3 -3" stroke="#5E9348" stroke-width="1.4" stroke-linecap="round"/></g>`,
  'green-bean': (x, y, s, r) => `<rect x="${f(x - 2.4 * s)}" y="${f(y - 22 * s)}" width="${f(4.8 * s)}" height="${f(44 * s)}" rx="${f(2.4 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#6EA957"/>`,
  'quinoa-mound': (x, y, s) => { let o = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(40 * s)}" fill="#F0E3C8"/>`; const r = rng(hash(`${x}${y}`)); for (let i = 0; i < 40; i++) { const a = r() * 6.28; const d = Math.sqrt(r()) * 36 * s; o += `<circle cx="${f(x + Math.cos(a) * d)}" cy="${f(y + Math.sin(a) * d)}" r="1.4" fill="#D8C090"/>`; } return o; },
  'rice-side': (x, y, s) => { let o = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(34 * s)}" fill="#F7F1E4"/>`; const r = rng(hash(`r${x}${y}`)); for (let i = 0; i < 30; i++) { const a = r() * 6.28; const d = Math.sqrt(r()) * 30 * s; o += `<ellipse cx="${f(x + Math.cos(a) * d)}" cy="${f(y + Math.sin(a) * d)}" rx="2.4" ry="1.1" transform="rotate(${f(a * 57)} ${f(x + Math.cos(a) * d)} ${f(y + Math.sin(a) * d)})" fill="#E2D6BC"/>`; } return o; },
  'yogurt-dollop': (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(14 * s)}" fill="#FFFDF9"/><path d="M${f(x - 7 * s)} ${f(y)} a${f(7 * s)} ${f(7 * s)} 0 1 1 ${f(10 * s)} ${f(5 * s)}" stroke="#EEE6DA" stroke-width="2" fill="none"/>`,
  'hummus-bowl': (x, y, s) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><circle r="46" fill="#FFFFFF" stroke="#EDE5E5" stroke-width="3"/><circle r="38" fill="#EED7AE"/><path d="M-22 -4 C-16 -22 16 -22 22 -4 C26 12 6 22 -8 16" stroke="#DDBF8C" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-14 6 C-4 -2 8 0 14 8" stroke="#E6C35A" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="6" cy="-6" r="2" fill="#D9704F"/><circle cx="-6" cy="2" r="2" fill="#D9704F"/><circle cx="10" cy="10" r="2" fill="#D9704F"/></g>`,
  wrap: (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><circle r="30" fill="#E9CFA2"/><circle r="25" fill="#F7EBD3"/><path d="M-18 -6 C-8 -14 10 -12 16 0 C10 10 -6 14 -16 6" fill="#8CC08A"/><circle cx="-4" cy="-2" r="7" fill="#EBCDA4"/><circle cx="8" cy="4" r="5" fill="#E8705F"/><path d="M0 -25 A25 25 0 0 1 25 0" stroke="#D9B983" stroke-width="2" fill="none"/></g>`,
  'stuffed-pepper': (x, y, s, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)}) scale(${f(s)})"><path d="M-30 -16 C-30 -30 30 -30 30 -16 L28 18 C26 30 -26 30 -28 18Z" fill="#E25F55"/><path d="M-24 -14 C-24 -24 24 -24 24 -14 L22 14 C20 22 -20 22 -22 14Z" fill="#B57A5C"/><circle cx="-8" cy="-4" r="6" fill="#FBF3DA"/><circle cx="8" cy="4" r="7" fill="#FBF3DA"/><circle cx="0" cy="-10" r="3" fill="#7DB57C"/></g>`,
  drizzle: (x, y, s) => `<path d="M${f(x - 40 * s)} ${f(y)} C${f(x - 20 * s)} ${f(y - 22 * s)} ${f(x)} ${f(y + 18 * s)} ${f(x + 22 * s)} ${f(y - 6 * s)} S${f(x + 40 * s)} ${f(y + 8 * s)} ${f(x + 46 * s)} ${f(y - 4 * s)}" stroke="#E4C55C" stroke-width="${f(3 * s)}" fill="none" stroke-linecap="round" opacity=".85"/>`,
  zaatar: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.6 * s)}" fill="#7E8A4E"/>`,
  cumin: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.4 * s)}" fill="#A9733E"/>`,
  paprika: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 * s)}" fill="#C9553E"/>`,
  cinnamon: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 * s)}" fill="#A86A3C"/>`,
  chili: (x, y, s) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 * s)}" fill="#D2463D"/>`,
  parmesan: (x, y, s, r) => `<rect x="${f(x - 3 * s)}" y="${f(y - .8 * s)}" width="${f(6 * s)}" height="${f(1.6 * s)}" rx=".8" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#FBEFC2"/>`,
  'pumpkin-seed': (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(4.2 * s)}" ry="${f(2.2 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#7FA45A"/>`,
  'onion-fried': (x, y, s, r) => `<path d="M${f(x - 8 * s)} ${f(y)} Q${f(x)} ${f(y - 8 * s)} ${f(x + 8 * s)} ${f(y)}" stroke="#B9783A" stroke-width="${f(2.6 * s)}" stroke-linecap="round" fill="none" transform="rotate(${f(r)} ${f(x)} ${f(y)})"/>`,
  dough: (x, y, s, r) => `<rect x="${f(x - 7 * s)}" y="${f(y - 7 * s)}" width="${f(14 * s)}" height="${f(14 * s)}" rx="${f(2.5 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#F4E6C8" stroke="#E0C99B" stroke-width="1"/>`,
  raisin: (x, y, s, r) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(3.2 * s)}" ry="${f(2.4 * s)}" transform="rotate(${f(r)} ${f(x)} ${f(y)})" fill="#6E4A3A"/>`,
};
// items that are small enough to scatter densely
const DUST = new Set(['seed', 'sesame', 'zaatar', 'cumin', 'paprika', 'cinnamon', 'chili', 'parmesan', 'oat', 'pomegranate']);
const LARGE = { salmon: 46, 'fish-white': 46, 'fish-red': 46, 'chicken-breast': 46, toast: 40, 'quinoa-mound': 40, 'rice-side': 34, 'hummus-bowl': 46, wrap: 26, 'stuffed-pepper': 26, 'avocado-mash': 26, 'nut-butter': 26, pita: 30, asparagus: 28, 'egg-muffin': 21, drizzle: 40, lemon: 16, lime: 16, date: 20 };
const LONG = new Set(['asparagus', 'green-bean', 'carrot-stick', 'cucumber-stick', 'pepper-strip']);
const ANCHOR = { 'hummus-bowl': [0.42, 0.05], 'nut-butter': [0.38, 0.1] };

function parseItems(list) { return (list ?? []).map((s) => { const [type, n] = s.split('*'); return { type, n: Number(n ?? 1) }; }); }

/** Scatter points inside a circle so that discs of radius `rad` do not overlap already placed discs. */
function scatter(r, count, radius, rad, placed) {
  const pts = [];
  for (let tries = 0; pts.length < count && tries < count * 80; tries++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * radius;
    const p = [Math.cos(a) * d, Math.sin(a) * d, rad];
    if ([...placed, ...pts].every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) >= (q[2] + rad) * 0.92)) pts.push(p);
  }
  return pts;
}

function baseFill(base, cx, cy, R, r, clipId) {
  const b = BASES[base];
  if (!b) return '';
  let o = `<g clip-path="url(#${clipId})"><rect x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" fill="${b.fill}"/>`;
  if (b.dots) for (let i = 0; i < 120; i++) { const a = r() * 6.28; const d = Math.sqrt(r()) * R; o += `<circle cx="${f(cx + Math.cos(a) * d)}" cy="${f(cy + Math.sin(a) * d)}" r="${f(1 + r() * 1.3)}" fill="${b.dots}" opacity=".8"/>`; }
  if (b.swirl) o += `<path d="M${cx - R * .5} ${cy} a${R * .5} ${R * .5} 0 1 1 ${R * .7} ${R * .35} a${R * .3} ${R * .3} 0 1 1 ${-R * .45} ${-R * .3}" stroke="${b.swirl}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  if (b.noodles) for (let i = 0; i < 14; i++) { const y0 = cy - R + (i + .5) * (2 * R / 14); o += `<path d="M${cx - R} ${f(y0)} q${R / 4} ${f(-8 + r() * 4)} ${R / 2} 0 t${R / 2} 0 t${R / 2} 0 t${R / 2} 0" stroke="${b.noodles}" stroke-width="3.2" fill="none" opacity=".9"/>`; }
  if (b.leaves) for (let i = 0; i < 22; i++) { const a = r() * 6.28; const d = Math.sqrt(r()) * R * .95; o += leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.6 + r() * .8, r() * 360, r() > .5 ? '#9CC98E' : '#86BB7C', '#6EA067'); }
  return `${o}</g>`;
}

// Footprint radius used for spacing (long thin items are spaced closer than their length).
const FOOTPRINT = { 'avocado-mash': 0, asparagus: 7, 'green-bean': 6, 'carrot-stick': 9, 'cucumber-stick': 9, 'pepper-strip': 9, drizzle: 0, pita: 22, toast: 34, salmon: 30, 'fish-white': 30, 'fish-red': 30, 'chicken-breast': 30, 'quinoa-mound': 26, 'rice-side': 24, 'hummus-bowl': 40, wrap: 24, 'stuffed-pepper': 24 };

function drawItems(items, cx, cy, R, r, flat = false, k = 1) {
  let o = '';
  const placed = [];
  // big pieces first so smaller ones arrange around them, then draw in listed order
  const order = items.map((it, i) => ({ ...it, i })).sort((x, y) => (LARGE[y.type] ?? 9) - (LARGE[x.type] ?? 9));
  const out = [];
  const longRot = r() * 180;
  for (const { type, n, i } of order) {
    const fn = ITEMS[type];
    if (!fn) continue;
    const size = (LARGE[type] ?? 9) * k;
    const dust = DUST.has(type);
    const rad = dust ? 2 * k : (FOOTPRINT[type] ?? LARGE[type] ?? 8) * k * 0.95;
    const area = flat ? R : Math.max(8, R - Math.min(size, rad) * 0.8);
    const pts = ANCHOR[type] && !flat ? [[ANCHOR[type][0] * R, ANCHOR[type][1] * R, rad]] : scatter(r, n, area, rad, dust ? [] : placed);
    let svg = '';
    for (const p of pts) {
      if (!dust && rad > 0) placed.push(p);
      const rot = LONG.has(type) ? longRot + (r() - 0.5) * 24 : r() * 360;
      svg += fn(cx + p[0], cy + p[1], k * (dust ? 1 : 0.9 + r() * 0.25), rot);
    }
    out.push([i, svg]);
  }
  out.sort((x, y) => x[0] - y[0]);
  for (const [, svg] of out) o += svg;
  return o;
}

function vessel(kind, cx, cy, R, base, items, r, uid) {
  const clip = `c${uid}`;
  const shadow = `<ellipse cx="${cx + 6}" cy="${cy + 10}" rx="${R * 1.08}" ry="${R * 1.04}" fill="#B89CA2" opacity=".18"/>`;
  if (kind === 'jar' || kind === 'glass') {
    const w = R * 1.1; const h = R * 1.7; const top = cy - h / 2;
    const b = BASES[base] ?? { fill: '#F3E6D6' };
    const path = kind === 'jar' ? `M${cx - w / 2} ${top + 10} Q${cx - w / 2} ${top} ${cx - w / 2 + 10} ${top} L${cx + w / 2 - 10} ${top} Q${cx + w / 2} ${top} ${cx + w / 2} ${top + 10} L${cx + w / 2} ${top + h - 14} Q${cx + w / 2} ${top + h} ${cx + w / 2 - 14} ${top + h} L${cx - w / 2 + 14} ${top + h} Q${cx - w / 2} ${top + h} ${cx - w / 2} ${top + h - 14}Z`
      : `M${cx - w / 2} ${top} L${cx + w / 2} ${top} L${cx + w / 2 - 12} ${top + h} L${cx - w / 2 + 12} ${top + h}Z`;
    let o = `<ellipse cx="${cx + 4}" cy="${top + h + 4}" rx="${w * .6}" ry="10" fill="#B89CA2" opacity=".2"/><defs><clipPath id="${clip}"><path d="${path}"/></clipPath></defs>`;
    o += `<g clip-path="url(#${clip})"><rect x="${cx - w}" y="${top}" width="${w * 2}" height="${h}" fill="#FFFFFF"/>`;
    o += `<rect x="${cx - w}" y="${top + h * .28}" width="${w * 2}" height="${h}" fill="${b.fill}"/>`;
    if (b.dots) for (let i = 0; i < 70; i++) o += `<circle cx="${f(cx - w / 2 + r() * w)}" cy="${f(top + h * .3 + r() * h * .7)}" r="${f(1 + r())}" fill="${b.dots}"/>`;
    if (base === 'oats' || base === 'yogurt') o += `<rect x="${cx - w}" y="${top + h * .62}" width="${w * 2}" height="${h * .12}" fill="${base === 'yogurt' ? '#F6D3DA' : '#FCFAF6'}"/>`;
    o += `</g>`;
    o += drawItems(items, cx, top + h * .3, w * .36, r, true, Math.max(1, R / 70));
    o += `<path d="${path}" fill="none" stroke="#E7DADC" stroke-width="3"/><path d="M${cx - w / 2 + 8} ${top + 18} L${cx - w / 2 + 8} ${top + h - 24}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
    if (kind === 'jar') o += `<rect x="${cx - w / 2 - 4}" y="${top - 8}" width="${w + 8}" height="14" rx="6" fill="#F6C9D2"/>`;
    return o;
  }
  const round = ['bowl', 'plate', 'platter', 'pan'].includes(kind);
  let o = (round ? shadow : '') + `<defs><clipPath id="${clip}"><circle cx="${cx}" cy="${cy}" r="${R * .8}"/></clipPath><clipPath id="${clip}m"><circle cx="${cx}" cy="${cy}" r="${R * .56}"/></clipPath></defs>`;
  if (kind === 'bowl') {
    o += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#FFFFFF"/><circle cx="${cx}" cy="${cy}" r="${R * .9}" fill="#F8F3F2"/>`;
    o += baseFill(base, cx, cy, R * .8, r, clip);
    o += `<circle cx="${cx}" cy="${cy}" r="${R * .8}" fill="none" stroke="#EADFDD" stroke-width="2"/>`;
    o += drawItems(items, cx, cy, R * .72, r, false, R / 72);
  } else if (kind === 'plate' || kind === 'platter') {
    const rx = kind === 'platter' ? R * 1.18 : R; const ry = R;
    o += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFFFF"/><ellipse cx="${cx}" cy="${cy}" rx="${rx * .82}" ry="${ry * .82}" fill="none" stroke="#F1E8E6" stroke-width="2"/>`;
    o += baseFill(base, cx, cy, R * .56, r, `${clip}m`);
    o += drawItems(items, cx, cy, R * .74, r, false, R / 88);
  } else if (kind === 'pan') {
    o += `<rect x="${cx + R * .85}" y="${cy - 10}" width="${R * .75}" height="20" rx="10" fill="#A99A9C"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="#B3A4A6"/><circle cx="${cx}" cy="${cy}" r="${R * .88}" fill="#9F9092"/>`;
    o += baseFill(base, cx, cy, R * .8, r, clip);
    o += drawItems(items, cx, cy, R * .7, r, false, R / 72);
  } else if (kind === 'board') {
    o += `<rect x="${cx - R * 1.3 + 6}" y="${cy - R * .85 + 10}" width="${R * 2.6}" height="${R * 1.7}" rx="24" fill="#B89CA2" opacity=".18"/><rect x="${cx - R * 1.3}" y="${cy - R * .85}" width="${R * 2.6}" height="${R * 1.7}" rx="24" fill="#EBD8BF"/><rect x="${cx - R * 1.3 + 10}" y="${cy - R * .85 + 10}" width="${R * 2.6 - 20}" height="${R * 1.7 - 20}" rx="18" fill="none" stroke="#DDC3A3" stroke-width="2"/><circle cx="${cx + R * 1.15}" cy="${cy - R * .65}" r="6" fill="#DDC3A3"/>`;
    o += drawItems(items, cx, cy, R * .78, r, false, R / 66);
  } else if (kind === 'dish') {
    o += `<rect x="${cx - R * 1.25 + 6}" y="${cy - R * .9 + 10}" width="${R * 2.5}" height="${R * 1.8}" rx="26" fill="#B89CA2" opacity=".18"/><rect x="${cx - R * 1.25}" y="${cy - R * .9}" width="${R * 2.5}" height="${R * 1.8}" rx="26" fill="#FFFFFF"/><rect x="${cx - R * 1.1}" y="${cy - R * .76}" width="${R * 2.2}" height="${R * 1.52}" rx="18" fill="#F6E9E2"/>`;
    o += drawItems(items, cx, cy, R * .78, r, false, R / 80);
  }
  return o;
}

function decor(w, h, r, color) {
  // linen texture and a botanical sprig in one corner
  let o = '';
  for (let i = -h; i < w; i += 16) o += `<path d="M${i} 0 L${i + h} ${h}" stroke="#FFFFFF" stroke-width="1" opacity=".35"/>`;
  const corner = r() > .5;
  const sx = corner ? w - 34 : 34; const sy = corner ? 30 : h - 28;
  const dir = corner ? -1 : 1;
  o += `<path d="M${sx} ${sy} q${dir * 26} ${corner ? 24 : -24} ${dir * 58} ${corner ? 34 : -34}" stroke="#9DBF95" stroke-width="2" fill="none"/>`;
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 6;
    const x = sx + dir * 58 * t; const y = sy + (corner ? 34 : -34) * t;
    o += leaf(x + 5, y - 6, 1.1, (corner ? 30 : -30) + i * 8, '#B5D3AC', '#8DB385') + leaf(x - 4, y + 7, 1, (corner ? 150 : 210) - i * 8, '#C5DCBD', '#97B98F');
  }
  return `<g opacity="${color ? 1 : .9}">${o}</g>`;
}

const cache = new Map();

/** SVG illustration for a meal summary or record. */
export function mealArt(meal, { label = true } = {}) {
  const key = meal.id;
  if (!cache.has(key)) {
    const r = rng(hash(meal.id));
    const W = 400; const H = 300;
    const art = meal.art ?? { vessel: 'plate', base: 'none', items: [] };
    const bg = TABLE[meal.category] ?? '#FFF1F4';
    const R = art.vessel === 'board' || art.vessel === 'dish' ? 92 : art.vessel === 'jar' || art.vessel === 'glass' ? 120 : 112;
    const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><rect width="${W}" height="${H}" fill="${bg}"/>${decor(W, H, r, true)}${vessel(art.vessel, W / 2, H / 2 + 4, R, art.base, parseItems(art.items), r, hash(meal.id).toString(36))}</svg>`;
    cache.set(key, svg);
  }
  const photo = PHOTOS[meal.id];
  const alt = `${label ? 'Illustration' : 'Image'} of ${meal.name}`;
  if (photo) return `<img src="${photo}" alt="${alt.replace('Illustration', 'Photo')}" loading="lazy">`;
  const safe = alt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return cache.get(key).replace('<svg ', `<svg role="img" aria-label="${safe}" `);
}

/** Hero still life: several dishes on a pastel table. */
export function heroArt() {
  if (HERO_PHOTO) return `<img src="${HERO_PHOTO}" alt="A table of balanced, healthy meals">`;
  const r = rng(20261019);
  const W = 640; const H = 512;
  let o = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of balanced meals: a quinoa salad bowl, salmon with asparagus, a berry yogurt bowl and a green smoothie on a pastel table" preserveAspectRatio="xMidYMid slice">`;
  o += `<rect width="${W}" height="${H}" fill="#FBE1E6"/><path d="M0 330 C160 290 420 360 640 300 L640 512 L0 512Z" fill="#F7D3DB"/>`;
  for (let i = -H; i < W; i += 18) o += `<path d="M${i} 0 L${i + H} ${H}" stroke="#FFFFFF" stroke-width="1" opacity=".25"/>`;
  // napkin
  o += `<rect x="404" y="40" width="190" height="150" rx="18" transform="rotate(12 500 115)" fill="#E8F3E8"/><path d="M420 70 L585 104" stroke="#D6E8D5" stroke-width="3" transform="rotate(12 500 115)"/>`;
  o += vessel('bowl', 210, 240, 140, 'quinoa', parseItems(['chickpea*12', 'cucumber*6', 'tomato-cherry*6', 'feta*6', 'avocado*3', 'herb*12', 'onion-ring*3']), r, 'h1');
  o += vessel('plate', 470, 352, 118, 'none', parseItems(['salmon*1', 'asparagus*4', 'lemon*1', 'herb*6']), r, 'h2');
  o += vessel('bowl', 498, 126, 74, 'yogurt', parseItems(['blueberry*7', 'strawberry*3', 'raspberry*3', 'mint*2']), r, 'h3');
  o += vessel('glass', 92, 90, 58, 'smoothie-tan', parseItems(['mint*2']), r, 'h4');
  // botanical sprigs
  for (const [x, y, rot] of [[40, 470, -30], [610, 470, 210], [330, 30, 100]]) {
    o += `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 C30 -10 60 -10 96 0" stroke="#8DB385" stroke-width="2.5" fill="none"/>`;
    for (let i = 1; i < 6; i++) o += leaf(i * 16, -7, 1.5, -40, '#A9CCA0', '#7FA877') + leaf(i * 16 + 4, 7, 1.4, 220, '#BCD8B3', '#8DB385');
    o += '</g>';
  }
  return `${o}</svg>`;
}

/** Small decorative botanical used in empty states and panels. */
export function botanical(cls = 'botanical') {
  let o = `<svg class="${cls}" viewBox="0 0 160 120" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M20 110 C50 80 90 50 140 14" stroke="#8DB385" stroke-width="2.5" fill="none"/>`;
  for (let i = 1; i < 7; i++) {
    const x = 20 + i * 18; const y = 110 - i * 14;
    o += leaf(x - 6, y - 8, 1.6, -60 + i * 4, i % 2 ? '#B5D3AC' : '#C9E0C1', '#8DB385') + leaf(x + 8, y + 4, 1.5, 150 - i * 4, i % 2 ? '#F6C9D2' : '#FBE1E6', '#E5A7B5');
  }
  return `${o}<circle cx="140" cy="14" r="6" fill="#F6C9D2"/></svg>`;
}

/** Abstract botanical portrait used on team cards (no likeness implied). */
export function teamPortrait(initials, variant) {
  const pal = [['#FBE1E6', '#F6C9D2', '#7A3E50'], ['#E8F3E8', '#D6E8D5', '#526B59'], ['#FFF1F4', '#F6C9D2', '#7A3E50'], ['#E8F3E8', '#C9E0C1', '#3F5646']][variant % 4];
  const r = rng(hash(initials) + variant);
  let leaves = '';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * .4;
    leaves += leaf(58 + Math.cos(a) * 50, 58 + Math.sin(a) * 50, 1.7, (a * 180) / Math.PI + 90, i % 2 ? '#B5D3AC' : '#F2B9C6', i % 2 ? '#8DB385' : '#E39AAB');
  }
  return `<svg class="portrait" viewBox="0 0 116 116" role="img" aria-label="Decorative monogram ${initials}" xmlns="http://www.w3.org/2000/svg"><circle cx="58" cy="58" r="56" fill="${pal[0]}"/>${leaves}<circle cx="58" cy="58" r="36" fill="${pal[1]}"/><text x="58" y="66" text-anchor="middle" font-family="Poppins, system-ui, sans-serif" font-size="24" font-weight="600" fill="${pal[2]}">${initials}</text></svg>`;
}

export function logoMark() {
  // A pink heart-shaped apple with a bite taken out of its side and a sage leaf.
  return `<svg viewBox="0 0 40 40" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#FBE1E6"/><path d="M20 32 C10.5 27 8.5 18 12.5 12.5 C15.5 8.5 19.2 10 20 13 C20.8 10 24.5 8.5 27.5 12.5 C31.5 18 29.5 27 20 32Z" fill="#F2AFBF"/><circle cx="30.4" cy="18.2" r="3.3" fill="#FBE1E6"/><circle cx="29.4" cy="23.4" r="2.9" fill="#FBE1E6"/><path d="M20 13 C20 10.5 21 8.5 23 7" stroke="#526B59" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M22.2 8.8 C24.5 6.2 28 6.4 29.2 7.4 C27.6 10 24.6 10.6 22.2 8.8Z" fill="#7DA587"/><path d="M15 15.5 C14.2 17.2 14.3 19.2 15.2 20.8" stroke="#FFF1F4" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
}
