export type Team = {
  id: string;
  company_id: string;
  team_name: string;
  team_leader_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreateTeamInput = {
  team_name: string;
  team_leader_id?: string | null;
  status?: string;
};