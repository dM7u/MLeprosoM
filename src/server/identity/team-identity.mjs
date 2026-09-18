import 'server-only';

const nonempty = value => typeof value === 'string' && value.trim() === value && value.length > 0;

// Tuple encoding avoids delimiter collisions; IDs stay opaque and case-sensitive.
export function sourceIdentity(provider, externalId) {
  if (!nonempty(provider) || !nonempty(externalId)) throw new Error('INVALID_SOURCE_IDENTITY');
  return JSON.stringify([provider, externalId]);
}

/** Reviewed mappings only. Never infer identity from a name or match date. */
export function createTeamResolver(registry) {
  if (registry?.version !== 1 || !Array.isArray(registry.teams)) throw new Error('INVALID_IDENTITY_REGISTRY');
  const bySource = new Map();
  const canonicalIds = new Set();
  for (const team of registry.teams) {
    if (!nonempty(team.canonicalId) || canonicalIds.has(team.canonicalId) ||
        !Array.isArray(team.references) || !team.references.length ||
        !Array.isArray(team.evidence) || !team.evidence.length ||
        !team.evidence.every(nonempty) || !Number.isFinite(Date.parse(team.reviewedAt))) {
      throw new Error('INVALID_IDENTITY_REGISTRY');
    }
    canonicalIds.add(team.canonicalId);
    for (const ref of team.references) {
      const key = sourceIdentity(ref.provider, ref.externalId);
      if (bySource.has(key)) throw new Error('DUPLICATE_SOURCE_IDENTITY');
      bySource.set(key, team.canonicalId);
    }
  }
  return (provider, externalId) => {
    const sourceKey = sourceIdentity(provider, externalId);
    const canonicalId = bySource.get(sourceKey) ?? null;
    return {canonicalId, sourceKey, status: canonicalId === null ? 'unresolved' : 'verified'};
  };
}
