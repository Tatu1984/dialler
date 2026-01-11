'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  usersApi,
  campaignsApi,
  leadsApi,
  leadListsApi,
  queuesApi,
  teamsApi,
  skillsApi,
  dispositionsApi,
  dncApi,
  agentsApi,
  tenantsApi,
  scriptsApi,
} from '@/lib/api';

// Query Keys
export const queryKeys = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaigns', id] as const,
  leads: ['leads'] as const,
  lead: (id: string) => ['leads', id] as const,
  leadLists: ['leadLists'] as const,
  leadList: (id: string) => ['leadLists', id] as const,
  queues: ['queues'] as const,
  queue: (id: string) => ['queues', id] as const,
  queueStats: (id: string) => ['queues', id, 'stats'] as const,
  teams: ['teams'] as const,
  team: (id: string) => ['teams', id] as const,
  skills: ['skills'] as const,
  skill: (id: string) => ['skills', id] as const,
  dispositions: ['dispositions'] as const,
  disposition: (id: string) => ['dispositions', id] as const,
  dnc: ['dnc'] as const,
  dncCheck: (phone: string) => ['dnc', 'check', phone] as const,
  agents: ['agents'] as const,
  agent: (id: string) => ['agents', id] as const,
  agentState: (id: string) => ['agents', id, 'state'] as const,
  agentDashboard: ['agents', 'dashboard'] as const,
  tenant: ['tenant'] as const,
  tenantStats: ['tenant', 'stats'] as const,
  scripts: ['scripts'] as const,
  script: (id: string) => ['scripts', id] as const,
};

// ============ USERS ============
export function useUsers(params?: Parameters<typeof usersApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.users, params],
    queryFn: async () => {
      const response = await usersApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch users');
      }
      return response.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: async () => {
      const response = await usersApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch user');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof usersApi.create>[0]) => {
      const response = await usersApi.create(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create user');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof usersApi.update>[1] }) => {
      const response = await usersApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update user');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await usersApi.delete(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete user');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.removeQueries({ queryKey: queryKeys.user(id) });
    },
  });
}

// ============ CAMPAIGNS ============
export function useCampaigns(params?: Parameters<typeof campaignsApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.campaigns, params],
    queryFn: async () => {
      const response = await campaignsApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch campaigns');
      }
      return response.data;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: queryKeys.campaign(id),
    queryFn: async () => {
      const response = await campaignsApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch campaign');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof campaignsApi.create>[0]) => {
      const response = await campaignsApi.create(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create campaign');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof campaignsApi.update>[1] }) => {
      const response = await campaignsApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update campaign');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaign(id) });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await campaignsApi.delete(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete campaign');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
      queryClient.removeQueries({ queryKey: queryKeys.campaign(id) });
    },
  });
}

export function useStartCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await campaignsApi.start(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to start campaign');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaign(id) });
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await campaignsApi.pause(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to pause campaign');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaign(id) });
    },
  });
}

export function useStopCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await campaignsApi.stop(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to stop campaign');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaign(id) });
    },
  });
}

// ============ LEADS ============
export function useLeads(params?: Parameters<typeof leadsApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.leads, params],
    queryFn: async () => {
      const response = await leadsApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch leads');
      }
      return response.data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.lead(id),
    queryFn: async () => {
      const response = await leadsApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch lead');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof leadsApi.create>[0]) => {
      const response = await leadsApi.create(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create lead');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadLists });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof leadsApi.update>[1] }) => {
      const response = await leadsApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update lead');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      queryClient.invalidateQueries({ queryKey: queryKeys.lead(id) });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await leadsApi.delete(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete lead');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadLists });
      queryClient.removeQueries({ queryKey: queryKeys.lead(id) });
    },
  });
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, leads }: { listId: string; leads: Parameters<typeof leadsApi.import>[1] }) => {
      const response = await leadsApi.import(listId, leads);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to import leads');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadLists });
    },
  });
}

// ============ LEAD LISTS ============
export function useLeadLists(params?: Parameters<typeof leadListsApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.leadLists, params],
    queryFn: async () => {
      const response = await leadListsApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch lead lists');
      }
      return response.data;
    },
  });
}

export function useLeadList(id: string) {
  return useQuery({
    queryKey: queryKeys.leadList(id),
    queryFn: async () => {
      const response = await leadListsApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch lead list');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateLeadList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof leadListsApi.create>[0]) => {
      const response = await leadListsApi.create(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create lead list');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadLists });
    },
  });
}

export function useUpdateLeadList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof leadListsApi.update>[1] }) => {
      const response = await leadListsApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update lead list');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadLists });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadList(id) });
    },
  });
}

export function useDeleteLeadList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await leadListsApi.delete(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete lead list');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadLists });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      queryClient.removeQueries({ queryKey: queryKeys.leadList(id) });
    },
  });
}

// ============ QUEUES ============
export function useQueues(params?: Parameters<typeof queuesApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.queues, params],
    queryFn: async () => {
      const response = await queuesApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch queues');
      }
      return response.data;
    },
  });
}

export function useQueue(id: string) {
  return useQuery({
    queryKey: queryKeys.queue(id),
    queryFn: async () => {
      const response = await queuesApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch queue');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useQueueStats(id: string) {
  return useQuery({
    queryKey: queryKeys.queueStats(id),
    queryFn: async () => {
      const response = await queuesApi.getStats(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch queue stats');
      }
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 5000, // Real-time stats
  });
}

export function useCreateQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof queuesApi.create>[0]) => {
      const response = await queuesApi.create(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create queue');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queues });
    },
  });
}

export function useUpdateQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof queuesApi.update>[1] }) => {
      const response = await queuesApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update queue');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.queues });
      queryClient.invalidateQueries({ queryKey: queryKeys.queue(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.queueStats(id) });
    },
  });
}

// ============ TEAMS ============
export function useTeams(params?: Parameters<typeof teamsApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.teams, params],
    queryFn: async () => {
      const response = await teamsApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch teams');
      }
      return response.data;
    },
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: queryKeys.team(id),
    queryFn: async () => {
      const response = await teamsApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch team');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof teamsApi.create>[0]) => {
      const response = await teamsApi.create(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create team');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof teamsApi.update>[1] }) => {
      const response = await teamsApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update team');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
      queryClient.invalidateQueries({ queryKey: queryKeys.team(id) });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await teamsApi.delete(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete team');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
      queryClient.removeQueries({ queryKey: queryKeys.team(id) });
    },
  });
}

export function useAddTeamMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userIds }: { id: string; userIds: string[] }) => {
      const response = await teamsApi.addMembers(id, userIds);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to add team members');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
      queryClient.invalidateQueries({ queryKey: queryKeys.team(id) });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const response = await teamsApi.removeMember(teamId, userId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to remove team member');
      }
      return response.data;
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams });
      queryClient.invalidateQueries({ queryKey: queryKeys.team(teamId) });
    },
  });
}

// ============ SKILLS ============
export function useSkills(params?: Parameters<typeof skillsApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.skills, params],
    queryFn: async () => {
      const response = await skillsApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch skills');
      }
      return response.data;
    },
  });
}

export function useSkill(id: string) {
  return useQuery({
    queryKey: queryKeys.skill(id),
    queryFn: async () => {
      const response = await skillsApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch skill');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof skillsApi.create>[0]) => {
      const response = await skillsApi.create(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create skill');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills });
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof skillsApi.update>[1] }) => {
      const response = await skillsApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update skill');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills });
      queryClient.invalidateQueries({ queryKey: queryKeys.skill(id) });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await skillsApi.delete(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete skill');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills });
      queryClient.removeQueries({ queryKey: queryKeys.skill(id) });
    },
  });
}

// ============ DISPOSITIONS ============
export function useDispositions(params?: Parameters<typeof dispositionsApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.dispositions, params],
    queryFn: async () => {
      const response = await dispositionsApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch dispositions');
      }
      return response.data;
    },
  });
}

export function useDisposition(id: string) {
  return useQuery({
    queryKey: queryKeys.disposition(id),
    queryFn: async () => {
      const response = await dispositionsApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch disposition');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateDisposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof dispositionsApi.create>[0]) => {
      const response = await dispositionsApi.create(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create disposition');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dispositions });
    },
  });
}

export function useUpdateDisposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof dispositionsApi.update>[1] }) => {
      const response = await dispositionsApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update disposition');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dispositions });
      queryClient.invalidateQueries({ queryKey: queryKeys.disposition(id) });
    },
  });
}

export function useDeleteDisposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await dispositionsApi.delete(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete disposition');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dispositions });
      queryClient.removeQueries({ queryKey: queryKeys.disposition(id) });
    },
  });
}

export function useReorderDispositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orders: Parameters<typeof dispositionsApi.reorder>[0]) => {
      const response = await dispositionsApi.reorder(orders);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to reorder dispositions');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dispositions });
    },
  });
}

// ============ DNC ============
export function useDncList(params?: Parameters<typeof dncApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.dnc, params],
    queryFn: async () => {
      const response = await dncApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch DNC list');
      }
      return response.data;
    },
  });
}

export function useCheckDnc(phoneNumber: string) {
  return useQuery({
    queryKey: queryKeys.dncCheck(phoneNumber),
    queryFn: async () => {
      const response = await dncApi.check(phoneNumber);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to check DNC');
      }
      return response.data;
    },
    enabled: !!phoneNumber,
  });
}

export function useAddDnc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof dncApi.add>[0]) => {
      const response = await dncApi.add(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to add to DNC');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dnc });
    },
  });
}

export function useBulkAddDnc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof dncApi.bulkAdd>[0]) => {
      const response = await dncApi.bulkAdd(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to bulk add to DNC');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dnc });
    },
  });
}

export function useRemoveDnc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await dncApi.remove(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to remove from DNC');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dnc });
    },
  });
}

export function useCleanupDnc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await dncApi.cleanup();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to cleanup DNC');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dnc });
    },
  });
}

// ============ AGENTS ============
export function useAgents(params?: Parameters<typeof agentsApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.agents, params],
    queryFn: async () => {
      const response = await agentsApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch agents');
      }
      return response.data;
    },
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: queryKeys.agent(id),
    queryFn: async () => {
      const response = await agentsApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch agent');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useAgentState(id: string) {
  return useQuery({
    queryKey: queryKeys.agentState(id),
    queryFn: async () => {
      const response = await agentsApi.getState(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch agent state');
      }
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 3000, // Real-time state
  });
}

export function useUpdateAgentState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, state, reason }: { id: string; state: string; reason?: string }) => {
      const response = await agentsApi.updateState(id, state, reason);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update agent state');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents });
      queryClient.invalidateQueries({ queryKey: queryKeys.agent(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentState(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentDashboard });
    },
  });
}

export function useAgentDashboard() {
  return useQuery({
    queryKey: queryKeys.agentDashboard,
    queryFn: async () => {
      const response = await agentsApi.dashboard();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch agent dashboard');
      }
      return response.data;
    },
    refetchInterval: 5000, // Real-time dashboard
  });
}

// ============ TENANT ============
export function useTenant() {
  return useQuery({
    queryKey: queryKeys.tenant,
    queryFn: async () => {
      const response = await tenantsApi.getCurrent();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch tenant');
      }
      return response.data;
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof tenantsApi.update>[0]) => {
      const response = await tenantsApi.update(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update tenant');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenant });
    },
  });
}

export function useTenantStats() {
  return useQuery({
    queryKey: queryKeys.tenantStats,
    queryFn: async () => {
      const response = await tenantsApi.getStats();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch tenant stats');
      }
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ============ SCRIPTS ============
export function useScripts(params?: Parameters<typeof scriptsApi.list>[0]) {
  return useQuery({
    queryKey: [...queryKeys.scripts, params],
    queryFn: async () => {
      const response = await scriptsApi.list(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch scripts');
      }
      return response.data;
    },
  });
}

export function useScript(id: string) {
  return useQuery({
    queryKey: queryKeys.script(id),
    queryFn: async () => {
      const response = await scriptsApi.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch script');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateScript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof scriptsApi.create>[0]) => {
      const response = await scriptsApi.create(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create script');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts });
    },
  });
}

export function useUpdateScript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof scriptsApi.update>[1] }) => {
      const response = await scriptsApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update script');
      }
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts });
      queryClient.invalidateQueries({ queryKey: queryKeys.script(id) });
    },
  });
}

export function useDeleteScript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await scriptsApi.delete(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete script');
      }
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts });
      queryClient.removeQueries({ queryKey: queryKeys.script(id) });
    },
  });
}
