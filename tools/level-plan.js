/*
 * What each difficulty setting and level group contains, slot by slot.
 * tools/build-levels.js fills each slot from the level bank (levels-bank/),
 * rates every level on the difficulty scale (tools/difficulty.js), orders
 * each group from easiest to hardest, and writes levels-data.js.
 *
 * Each slot: [board size, kind, reflectors]
 *   kind 'solid': solid lines only, cleared by sliding lines straight out
 *   kind 'clear': has see-through sections and needs at least one partial slide
 *   kind 'rotate': reflectors you can turn; can't be solved without turning
 *                  some, and needs more turns as reflectors are added
 *   kind 'gates': coloured gates opened by matching plates; can't be solved
 *                 with the gates shut
 *
 * Every level fills the whole board, with lines of 3 squares or more.
 * `pool` is how many candidates per slot the bank should hold to choose from.
 */
'use strict';

const s = (n, m = 0) => [n, 'solid', m];
const c = (n, m = 0) => [n, 'clear', m];
const r = (n, m) => [n, 'rotate', m]; // rotating reflectors: m reflectors
const g = (n, m) => [n, 'gates', m]; // gates and plates: m colours
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const twice = (sizes) => sizes.flatMap((n) => [n, n]);

module.exports = {
  unlockAfter: 10,
  tiers: [
    {
      name: 'Easy',
      minSize: 4,
      maxSize: 10,
      pool: 3,
      groups: [
        {
          name: 'Solid lines',
          slots: [4, 4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10].map((n) => s(n)),
        },
        {
          name: 'See-through lines',
          slots: [5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10].map((n) => c(n)),
        },
        {
          name: 'Reflectors',
          slots: [
            s(5, 1), s(5, 1), s(6, 2), c(6, 1), s(6, 2), s(7, 2), c(7, 2), s(7, 3), c(7, 2), s(8, 3),
            c(8, 3), s(8, 4), c(8, 3), s(9, 4), c(8, 3), s(9, 5), c(9, 3), s(9, 5), c(9, 3), s(10, 6),
            c(10, 4), s(10, 6), c(10, 4), s(10, 6), c(10, 4),
          ],
        },
        {
          name: 'Turning reflectors',
          slots: [
            r(5, 1), r(5, 1), r(5, 1), r(6, 2), r(6, 2), r(6, 2), r(6, 2), r(7, 2), r(7, 3), r(7, 3),
            r(7, 3), r(8, 3), r(8, 3), r(8, 4), r(8, 4), r(9, 4), r(9, 4), r(9, 4), r(9, 5), r(9, 5),
            r(10, 5), r(10, 5), r(10, 6), r(10, 6), r(10, 6),
          ],
        },
        {
          name: 'Gates and plates',
          slots: [
            g(5, 1), g(5, 1), g(5, 1), g(6, 1), g(6, 1), g(6, 1), g(6, 2), g(7, 1), g(7, 2), g(7, 2),
            g(7, 2), g(8, 2), g(8, 2), g(8, 2), g(8, 2), g(9, 2), g(9, 2), g(9, 2), g(9, 3), g(9, 3),
            g(10, 3), g(10, 3), g(10, 3), g(10, 3), g(10, 3),
          ],
        },
      ],
    },
    {
      name: 'Medium',
      minSize: 11,
      maxSize: 20,
      pool: 2,
      groups: [
        { name: 'Solid lines', slots: twice(range(11, 20)).map((n) => s(n)) },
        { name: 'See-through lines', slots: twice(range(11, 20)).map((n) => c(n)) },
        {
          name: 'Reflectors',
          // Alternating solid and see-through, 3 to 6 reflectors.
          slots: range(11, 20).flatMap((n) => {
            const m = 3 + Math.floor((n - 11) / 3);
            return [s(n, m), c(n, Math.min(m, 5))];
          }),
        },
        { name: 'Turning reflectors', slots: twice(range(11, 20)).map((n) => r(n, 4 + Math.floor((n - 11) / 4))) },
        { name: 'Gates and plates', slots: twice(range(11, 20)).map((n) => g(n, n <= 14 ? 2 : 3)) },
      ],
    },
  ],
};
