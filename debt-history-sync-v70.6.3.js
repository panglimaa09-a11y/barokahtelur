/*
 * Barokah Telur Preview
 *
 * Intentionally disabled in V70.7 preview.
 * Debt/receivable history is rendered by barokah-bugfix-v70.7.js.
 * Keeping a second renderer active caused the same table to be replaced
 * by two independent renderers, which made the columns jump while clicking.
 *
 * Do not add another debt-history renderer here.
 */
(function(){
  'use strict';
  window.BarokahDebtHistoryLegacyDisabled = true;
})();
