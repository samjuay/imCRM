export type FollowupType = {
  id: string;
  company_id: string;
  type_name: string;
  is_active: boolean;
  created_at: string;
};

export type CreateFollowupTypeInput = {
  type_name: string;
  is_active?: boolean;
};

export type UpdateFollowupTypeInput = Partial<CreateFollowupTypeInput>;