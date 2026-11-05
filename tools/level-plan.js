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
 *   kind 'twins': pairs of twin lines that slide together; the board takes
 *                 more moves with the twins than without, and the usual way
 *                 of clearing it no longer works (m = number of pairs)
 *   kind 'twinsclear', 'twinsmirror', 'twinsmix': twins with see-through
 *                 lines, fixed reflectors, or both
 *   kind 'twinsturn', 'twinsgates', 'twinsall': twins with turning reflectors,
 *                 with gates, or with everything; turning / the gates are
 *                 proven still needed with the twins
 *
 * Group 6 (twin eels) has `phases`: its first 10 levels are twins alone,
 * then the other mechanics join in (see tools/build-levels.js).
 *   kind 'rotclear', 'gatesclear', 'combo': the same with see-through lines
 *                 (and, for 'combo', turnable reflectors and gates together),
 *                 each mechanic proven needed (see tools/makers.js)
 *
 * In Groups 4 and 5 the early levels teach the group's own mechanic; see-
 * through lines join in more and more towards the end, and the last levels
 * of Group 5 combine every mechanic.
 *
 * Every level fills the whole board, with lines of 3 squares or more.
 * `pool` is how many candidates per slot the bank should hold to choose from.
 */
'use strict';

const s = (n, m = 0) => [n, 'solid', m];
const c = (n, m = 0) => [n, 'clear', m];
const r = (n, m) => [n, 'rotate', m]; // rotating reflectors: m reflectors
const g = (n, m) => [n, 'gates', m]; // gates and plates: m colours
const rc = (n, m) => [n, 'rotclear', m]; // rotating reflectors + see-through lines: m reflectors
const gc = (n, m) => [n, 'gatesclear', m]; // gates + see-through lines: m colours
const all = (n, m) => [n, 'combo', m]; // see-through lines, turnable reflectors and gates: m reflectors
const tw = (n, m) => [n, 'twins', m]; // twin eels: m pairs
const twc = (n, m) => [n, 'twinsclear', m]; // twins with see-through lines
const twm = (n, m) => [n, 'twinsmirror', m]; // twins with fixed reflectors
const twx = (n, m) => [n, 'twinsmix', m]; // twins with see-through lines and reflectors
const twr = (n, m) => [n, 'twinsturn', m]; // twins with turning reflectors
const twg = (n, m) => [n, 'twinsgates', m]; // twins with gates and plates
const twa = (n, m) => [n, 'twinsall', m]; // twins with see-through lines, turning reflectors and gates
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
            r(7, 3), r(8, 3), r(8, 3), rc(8, 3), r(8, 4), rc(9, 3), r(9, 4), rc(9, 4), r(9, 5), rc(9, 4),
            rc(10, 4), r(10, 5), rc(10, 4), rc(10, 5), rc(10, 5),
          ],
        },
        {
          name: 'Gates and plates',
          slots: [
            g(5, 1), g(5, 1), g(5, 1), g(6, 1), g(6, 1), g(6, 1), g(6, 2), g(7, 1), g(7, 2), g(7, 2),
            gc(7, 1), g(8, 2), gc(8, 2), g(8, 2), gc(9, 2), gc(9, 2), g(9, 3), gc(10, 2), gc(10, 3),
            all(8, 2), all(9, 2), all(9, 3), all(10, 3), all(10, 3), all(10, 4),
          ],
        },
        {
          name: 'Twin eels',
          phases: [10, 15],
          slots: [
            tw(5, 1), tw(5, 1), tw(6, 1), tw(6, 1), tw(6, 2), tw(7, 1), tw(7, 2), tw(7, 2), tw(8, 2), tw(8, 2),
            twc(6, 1), twr(6, 1), twg(6, 1), twm(7, 1), twc(7, 2), twr(8, 2), twg(8, 2), twx(8, 2), twm(9, 2), twc(9, 2),
            twr(9, 2), twg(9, 2), twa(8, 1), twx(10, 2), twa(10, 2),
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
        // 25 per group: two of each size, then five more on the biggest boards.
        { name: 'Solid lines', slots: [...twice(range(11, 20)), 18, 19, 19, 20, 20].map((n) => s(n)) },
        { name: 'See-through lines', slots: [...twice(range(11, 20)), 18, 19, 19, 20, 20].map((n) => c(n)) },
        {
          name: 'Reflectors',
          // Alternating solid and see-through, 3 to 6 reflectors.
          slots: [...range(11, 20).flatMap((n) => {
            const m = 3 + Math.floor((n - 11) / 3);
            return [s(n, m), c(n, Math.min(m, 5))];
          }), s(19, 6), c(19, 5), s(20, 6), c(20, 5), s(20, 6)],
        },
        {
          name: 'Turning reflectors',
          slots: range(11, 20).flatMap((n) => {
            const m = 4 + Math.floor((n - 11) / 4);
            return n <= 13 ? [r(n, m), r(n, m)] : n <= 18 ? [r(n, m), rc(n, m)] : [rc(n, m), rc(n, m)];
          }).concat([rc(18, 5), rc(19, 6), rc(19, 6), rc(20, 6), rc(20, 6)]),
        },
        {
          name: 'Gates and plates',
          slots: range(11, 20).flatMap((n) => {
            const c = n <= 14 ? 2 : 3;
            return n <= 13 ? [g(n, c), g(n, c)] : n <= 16 ? [g(n, c), gc(n, c)] : n <= 18 ? [gc(n, c), all(n, 4)] : [all(n, 5), all(n, 5)];
          }).concat([gc(18, 3), all(18, 4), all(19, 5), all(20, 5), all(20, 5)]),
        },
        {
          name: 'Twin eels',
          phases: [10, 15],
          slots: [
            tw(11, 2), tw(12, 2), tw(12, 2), tw(13, 2), tw(14, 2), tw(15, 2), tw(16, 3), tw(17, 3), tw(18, 3), tw(20, 3),
            // Turning reflectors and gates join in on the smaller boards (bigger
            // ones are too slow to search with twins).
            twc(11, 2), twg(11, 2), twr(11, 2), twg(12, 2), twr(12, 2), twc(13, 2), twm(14, 3), twc(14, 2), twm(16, 3), twm(18, 3),
            twr(12, 3), twg(12, 3), twm(19, 3), twm(20, 3), twm(20, 4),
          ],
        },
      ],
    },
    {
      name: 'Hard',
      minSize: 21,
      maxSize: 30,
      pool: 2,
      groups: [
        // 25 per group: two of each size, then five more on the biggest boards.
        { name: 'Solid lines', slots: [...twice(range(21, 30)), 28, 29, 29, 30, 30].map((n) => s(n)) },
        { name: 'See-through lines', slots: [...twice(range(21, 30)), 28, 29, 29, 30, 30].map((n) => c(n)) },
        {
          name: 'Reflectors',
          // Alternating solid and see-through, 5 to 9 reflectors.
          slots: [...range(21, 30).flatMap((n) => {
            const m = 5 + Math.floor((n - 21) / 2);
            return [s(n, m), c(n, Math.min(m, 6))];
          }), s(29, 9), c(29, 6), s(30, 9), c(30, 6), s(30, 9)],
        },
        {
          name: 'Turning reflectors',
          slots: range(21, 30).flatMap((n) => {
            const m = 6 + Math.floor((n - 21) / 4);
            return n <= 23 ? [r(n, m), rc(n, m)] : [rc(n, m), rc(n, m)];
          }).concat([rc(28, 7), rc(29, 8), rc(29, 8), rc(30, 8), rc(30, 8)]),
        },
        {
          name: 'Gates and plates',
          slots: range(21, 30).flatMap((n) => (n <= 23 ? [g(n, 3), gc(n, 3)] : n <= 26 ? [gc(n, 3), gc(n, 3)] : [all(n, 6 + Math.floor((n - 27) / 2)), all(n, 7)]))
            .concat([all(28, 7), all(29, 7), all(29, 7), all(30, 7), all(30, 7)]),
        },
        {
          name: 'Twin eels',
          phases: [10, 15],
          // Reflectors join twins on boards up to 27x27 (bigger ones are too
          // slow to search with both).
          slots: [
            tw(21, 3), tw(22, 3), tw(23, 3), tw(24, 3), tw(25, 3), tw(26, 3), tw(27, 4), tw(28, 4), tw(29, 4), tw(30, 4),
            twm(21, 3), twm(22, 3), twm(23, 3), twm(24, 3), twm(24, 3), twm(25, 3), twm(25, 4), twm(26, 4), twm(26, 4), twm(27, 4),
            twm(25, 4), twm(26, 4), twm(27, 4), twm(27, 4), twm(27, 4),
          ],
        },
      ],
    },
  ],
};
