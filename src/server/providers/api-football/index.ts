import "server-only";

/** Reserva del adaptador. No declara capacidades ni realiza requests. */
export const apiFootballProvider = {
  id: "api-football",
  coverage: "unverified",
  status: "not-implemented",
} as const;
