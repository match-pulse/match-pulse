/**
 * Encode one CSV cell.
 *
 * Quoting alone does not stop spreadsheet formula execution, so a value that
 * starts with a formula prefix is converted to text with a leading apostrophe.
 */
export function csvValue(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}
