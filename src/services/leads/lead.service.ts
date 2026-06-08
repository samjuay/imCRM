import {
  leadFollowupRepository,
  leadNoteRepository,
  leadRepository,
  leadSiteVisitRepository,
} from "@/repositories/leads";
import type {
  CreateLeadFollowupInput,
  CreateLeadInput,
  CreateLeadNoteInput,
  CreateLeadSiteVisitInput,
  LeadFilters,
  UpdateLeadFollowupInput,
  UpdateLeadInput,
  UpdateLeadSiteVisitInput,
} from "@/types/lead";

const DEFAULT_PAGE_SIZE = 25;

export const leadService = {
  async list(
    companyId: string,
    filters: LeadFilters = {},
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ) {
    return leadRepository.list(companyId, filters, page, pageSize);
  },

  async getById(companyId: string, id: string) {
    return leadRepository.getById(companyId, id);
  },

  async checkDuplicatePhone(
    companyId: string,
    phone: string,
    excludeId?: string,
  ) {
    return leadRepository.phoneExists(companyId, phone, excludeId);
  },

  async create(companyId: string, input: CreateLeadInput) {
    return leadRepository.create(companyId, input);
  },

  async update(companyId: string, id: string, input: UpdateLeadInput) {
    return leadRepository.update(companyId, id, input);
  },

  async delete(companyId: string, id: string) {
    return leadRepository.delete(companyId, id);
  },

  async listNotes(companyId: string, leadId: string) {
    return leadNoteRepository.listByLead(companyId, leadId);
  },

  async addNote(companyId: string, input: CreateLeadNoteInput) {
    return leadNoteRepository.create(companyId, input);
  },

  async listFollowups(companyId: string, leadId: string) {
    return leadFollowupRepository.listByLead(companyId, leadId);
  },

  async addFollowup(companyId: string, input: CreateLeadFollowupInput) {
    return leadFollowupRepository.create(companyId, input);
  },

  async listSiteVisits(companyId: string, leadId: string) {
    return leadSiteVisitRepository.listByLead(companyId, leadId);
  },

  async addSiteVisit(companyId: string, input: CreateLeadSiteVisitInput) {
    return leadSiteVisitRepository.create(companyId, input);
  },

  async updateSiteVisit(
    companyId: string,
    id: string,
    input: UpdateLeadSiteVisitInput,
  ) {
    return leadSiteVisitRepository.update(companyId, id, input);
  },

  async updateFollowup(
    companyId: string,
    id: string,
    input: UpdateLeadFollowupInput,
  ) {
    return leadFollowupRepository.update(companyId, id, input);
  },
};