/*
 * What each level group contains, slot by slot. tools/build-levels.js fills
 * each slot from the level bank (levels-bank/), easiest first within each
 * kind of slot, and writes levels-data.js.
 *
 * Each slot: [board size, kind, reflectors]
 *   kind 'solid': solid lines only, cleared by sliding lines straight out
 *   kind 'clear': has see-through sections and needs at least one partial slide
 *
 * Every level fills the whole board, with lines of 3 squares or more.
 */
'use strict';

const s = (n, m = 0) => [n, 'solid', m];
const c = (n, m = 0) => [n, 'clear', m];

module.exports = {
  unlockAfter: 10,
  maxSize: 10,
  groups: [
    {
      name: 'Solid lines',
      slots: [
        s(4), s(4), s(5), s(5), s(5), s(6), s(6), s(6), s(6), s(7), s(7), s(7), s(7),
        s(8), s(8), s(8), s(8), s(9), s(9), s(9), s(9), s(10), s(10), s(10), s(10),
      ],
    },
    {
      name: 'See-through lines',
      slots: [
        c(5), c(5), c(5), c(6), c(6), c(6), c(6), c(7), c(7), c(7), c(7), c(8), c(8),
        c(8), c(8), c(9), c(9), c(9), c(9), c(10), c(10), c(10), c(10), c(10), c(10),
      ],
    },
    {
      name: 'Reflectors',
      slots: [
        s(5, 1), s(5, 1), s(6, 2), c(6, 1), s(6, 2), s(7, 2), c(7, 2), s(7, 3), c(7, 2), s(8, 3),
        c(8, 3), s(8, 4), c(8, 3), s(9, 4), c(8, 3), s(9, 5), c(9, 3), s(9, 5), c(9, 3), s(10, 6),
        c(10, 4), s(10, 6), c(10, 4), s(10, 6), c(10, 4),
      ],
    },
  ],
};
