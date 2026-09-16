/** PostgreSQL timestamp(0) rounds half-seconds away from its 2000-01-01 epoch. */
export function phaseEventTimestamp(value: Date | string): Date {
  const epoch = Date.UTC(2000, 0, 1);
  const offset = new Date(value).getTime() - epoch;
  return new Date(epoch + Math.sign(offset) * Math.round(Math.abs(offset) / 1000) * 1000);
}
