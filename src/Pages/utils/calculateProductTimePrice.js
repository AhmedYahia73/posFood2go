/**
 * Computes the final pre-tax price for a product_time item.
 * All time values are in MINUTES.
 *
 * extra_time = false  →  proportional: (effective / unit_time) * price
 * extra_time = true   →  first unit_time is charged at full price,
 *                         then each extra_unit_time block beyond that
 *                         is charged at extra_time_price
 *
 * @param {object} item           - Cart item with product_time fields
 * @param {number} elapsedMinutes - Total elapsed time in minutes
 * @returns {number} Total price before tax/discount
 */
export function calculateProductTimePrice(item, elapsedMinutes) {
  const unitTime   = Number(item.unit_time   || 1);
  const minTime    = Number(item.min_time    || 0);
  const extraTime  = Boolean(item.extra_time);
  const extraUnit  = Number(item.extra_unit_time  || 1);
  const extraPrice = Number(item.extra_time_price || 0);
  const basePrice  = Number(item.price_after_discount || item.price || 0);

  // Apply minimum billable time
  const effective = Math.max(elapsedMinutes, minTime);

  let total;

  if (!extraTime) {
    // ── No overtime pricing ──────────────────────────────────────────────────
    // Proportional: pay for exactly the fraction of unit_time used
    total = (effective / unitTime) * basePrice;

  } else {
    // ── With overtime pricing ────────────────────────────────────────────────
    if (effective <= unitTime) {
      // Proportional for the first unit time (e.g. 65 / 90 * 90 = 65)
      total = (effective / unitTime) * basePrice;
    } else {
      const wholeUnits  = Math.floor(effective / unitTime);
      const firstPrice  = wholeUnits * basePrice;
      const remaining   = effective - wholeUnits * unitTime;
      const extraBlocks = remaining > 0 ? Math.ceil(remaining / extraUnit) : 0;
      const secondPrice = extraBlocks * extraPrice;
      total = firstPrice + secondPrice;
    }
  }

  return total;
}

/**
 * Calculate elapsed minutes from a start timestamp (epoch ms)
 * @param {number} startMs - Start time in milliseconds
 * @param {number} [endMs] - End time in ms (defaults to now)
 * @returns {number} Elapsed minutes (floor)
 */
export function elapsedMinutes(startMs, endMs = Date.now()) {
  return Math.floor((endMs - startMs) / 60_000);
}

/**
 * Format minutes as "Xh Ym" or just "Ym" display
 * @param {number} minutes
 * @returns {string}
 */
export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
