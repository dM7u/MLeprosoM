import 'server-only';
import {createSupabaseAdminClient} from './supabase';
import {readTeamFixtures} from './read-fixtures.mjs';

export type StoredFixture = {
  id: string;
  kickoff_at: string | null;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  source_status: string;
};

export async function fixtureView() {
  const provider=process.env.FOOTBALL_PROVIDER;
  const externalTeamId=process.env.FOOTBALL_TEAM_ID;
  const ttlMs=Number(process.env.FIXTURES_STALE_AFTER_SECONDS)*1000;
  if(!provider || !externalTeamId || !Number.isFinite(ttlMs) || ttlMs<=0) {
    return {status:'empty',label:'Sin datos',data:[] as StoredFixture[],updatedAt:null as string|null};
  }
  try {
    const result=await readTeamFixtures(createSupabaseAdminClient(),{provider,externalTeamId,ttlMs,now:Date.now()});
    return {...result,data:(result.data??[]) as StoredFixture[]};
  } catch {
    return {status:'error',label:'Sin datos',data:[] as StoredFixture[],updatedAt:null as string|null};
  }
}
