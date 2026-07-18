/**
 * Trailing label for the dossiers counter, naming the instructeur's services
 * (groupes instructeurs). Kept pure so it can be unit-tested on its own.
 */
export function serviceLabel(services: string[]): string {
  if (services.length === 1) {
    return `dossiers dans votre service : ${services[0]}`;
  }
  if (services.length > 1) {
    return `dossiers dans vos services : ${services.join(", ")}`;
  }
  return "dossiers dans votre service";
}
