import { formatISO } from "date-fns";

/**
 * This function returns the date stripped of the time part and the timezone.
 *
 * This function exists to solve a problem when transmitting a Date in JSON.
 *
 * When a date is retrieved from a Date input, the time is set to 00:00 by default (browser local time)
 *
 * On a JSON.stringify call, the date is transmitted as ISO8601, but with timezones and GMT+00
 * (it might be the previous day at 11pm, for example)
 *
 */

export default function toJSONPerserveDate(this: Date) {
  return formatISO(this, { representation: "date" });
}
