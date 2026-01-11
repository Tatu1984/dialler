import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as argon2 from 'argon2';
import {
  tenants,
  users,
  agentProfiles,
  campaigns,
  queues,
  skills,
  teams,
  teamMembers,
  dispositions,
  leadLists,
  leads,
  leadHistory,
  calls,
  agentStates,
  callbackSchedules,
  callerIds,
  dialingRules,
  dncLists,
  transcriptions,
  agentAssistEvents,
  knowledgeArticles,
  leadScorePredictions,
  ivrFlows,
  audioFiles,
  scripts,
} from './schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://root@localhost:26257/nexusdialer?sslmode=disable';

async function seed() {
  console.log('🌱 Seeding database with comprehensive test data...\n');

  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  // ============================================
  // 1. TENANT
  // ============================================
  console.log('Creating tenant...');
  const [tenant] = await db.insert(tenants).values({
    name: 'NexusDialer Demo',
    slug: 'nexus-demo',
    settings: {
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      defaultLanguage: 'en',
      features: {
        aiEnabled: true,
        omnichannelEnabled: true,
        recordingEnabled: true,
      },
    },
    subscriptionTier: 'enterprise',
    maxAgents: 500,
    status: 'active',
  }).returning();

  console.log('  ✓ Created tenant:', tenant.name);

  // ============================================
  // 2. USERS (admin, supervisors, agents)
  // ============================================
  console.log('\nCreating users...');
  const adminPassword = await argon2.hash('admin123');
  const supervisorPassword = await argon2.hash('super123');
  const agentPassword = await argon2.hash('agent123');

  const [adminUser] = await db.insert(users).values({
    tenantId: tenant.id,
    email: 'admin@nexus.com',
    passwordHash: adminPassword,
    firstName: 'Alex',
    lastName: 'Admin',
    role: 'admin',
    status: 'active',
  }).returning();

  const [supervisor1] = await db.insert(users).values({
    tenantId: tenant.id,
    email: 'supervisor@nexus.com',
    passwordHash: supervisorPassword,
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'supervisor',
    status: 'active',
  }).returning();

  const [supervisor2] = await db.insert(users).values({
    tenantId: tenant.id,
    email: 'mike.supervisor@nexus.com',
    passwordHash: supervisorPassword,
    firstName: 'Mike',
    lastName: 'Davis',
    role: 'supervisor',
    status: 'active',
  }).returning();

  // Create multiple agents
  const agentData = [
    { email: 'agent@nexus.com', firstName: 'Andy', lastName: 'Agent', agentNumber: 'AGT001', extension: '2001' },
    { email: 'emily.w@nexus.com', firstName: 'Emily', lastName: 'Williams', agentNumber: 'AGT002', extension: '2002' },
    { email: 'james.t@nexus.com', firstName: 'James', lastName: 'Taylor', agentNumber: 'AGT003', extension: '2003' },
    { email: 'lisa.m@nexus.com', firstName: 'Lisa', lastName: 'Martinez', agentNumber: 'AGT004', extension: '2004' },
    { email: 'robert.c@nexus.com', firstName: 'Robert', lastName: 'Chen', agentNumber: 'AGT005', extension: '2005' },
    { email: 'amanda.k@nexus.com', firstName: 'Amanda', lastName: 'Kim', agentNumber: 'AGT006', extension: '2006' },
    { email: 'david.p@nexus.com', firstName: 'David', lastName: 'Patel', agentNumber: 'AGT007', extension: '2007' },
    { email: 'jennifer.l@nexus.com', firstName: 'Jennifer', lastName: 'Lee', agentNumber: 'AGT008', extension: '2008' },
  ];

  const agentUsers: typeof users.$inferSelect[] = [];
  for (const agent of agentData) {
    const [user] = await db.insert(users).values({
      tenantId: tenant.id,
      email: agent.email,
      passwordHash: agentPassword,
      firstName: agent.firstName,
      lastName: agent.lastName,
      role: 'agent',
      status: 'active',
    }).returning();
    agentUsers.push(user);
  }

  console.log('  ✓ Created 1 admin, 2 supervisors, 8 agents');

  // ============================================
  // 3. SKILLS
  // ============================================
  console.log('\nCreating skills...');
  const skillsData = [
    { name: 'Sales', description: 'Sales and lead conversion' },
    { name: 'Support', description: 'Customer support' },
    { name: 'Billing', description: 'Billing inquiries' },
    { name: 'Technical', description: 'Technical support' },
    { name: 'Spanish', description: 'Spanish language support' },
    { name: 'French', description: 'French language support' },
    { name: 'Enterprise', description: 'Enterprise account handling' },
    { name: 'Retention', description: 'Customer retention specialist' },
  ];

  const createdSkills = await db.insert(skills).values(
    skillsData.map(s => ({ tenantId: tenant.id, ...s }))
  ).returning();

  console.log('  ✓ Created', createdSkills.length, 'skills');

  // ============================================
  // 4. AGENT PROFILES
  // ============================================
  console.log('\nCreating agent profiles...');

  // Supervisor profiles
  await db.insert(agentProfiles).values([
    {
      userId: supervisor1.id,
      tenantId: tenant.id,
      agentNumber: 'SUP001',
      extension: '1001',
      skills: ['sales', 'support', 'enterprise'],
      maxConcurrentChats: 5,
      webrtcEnabled: true,
    },
    {
      userId: supervisor2.id,
      tenantId: tenant.id,
      agentNumber: 'SUP002',
      extension: '1002',
      skills: ['support', 'technical'],
      maxConcurrentChats: 5,
      webrtcEnabled: true,
    },
  ]);

  // Agent profiles
  for (let i = 0; i < agentUsers.length; i++) {
    const skillSets = [
      ['sales'],
      ['sales', 'spanish'],
      ['support', 'technical'],
      ['support', 'billing'],
      ['sales', 'enterprise'],
      ['support', 'retention'],
      ['technical', 'french'],
      ['sales', 'support'],
    ];

    await db.insert(agentProfiles).values({
      userId: agentUsers[i].id,
      tenantId: tenant.id,
      agentNumber: agentData[i].agentNumber,
      extension: agentData[i].extension,
      skills: skillSets[i],
      maxConcurrentChats: 3,
      webrtcEnabled: true,
    });
  }

  console.log('  ✓ Created 10 agent profiles');

  // ============================================
  // 5. TEAMS
  // ============================================
  console.log('\nCreating teams...');
  const [salesTeam] = await db.insert(teams).values({
    tenantId: tenant.id,
    name: 'Sales Team A',
    managerId: supervisor1.id,
    settings: { targetCalls: 100, targetConversions: 20 },
  }).returning();

  const [supportTeam] = await db.insert(teams).values({
    tenantId: tenant.id,
    name: 'Support Team',
    managerId: supervisor2.id,
    settings: { targetCalls: 80, avgHandleTime: 300 },
  }).returning();

  const [enterpriseTeam] = await db.insert(teams).values({
    tenantId: tenant.id,
    name: 'Enterprise Team',
    managerId: supervisor1.id,
    settings: { targetCalls: 50, priorityAccounts: true },
  }).returning();

  console.log('  ✓ Created 3 teams');

  // ============================================
  // 6. TEAM MEMBERS
  // ============================================
  console.log('\nAssigning team members...');
  await db.insert(teamMembers).values([
    // Sales Team A
    { teamId: salesTeam.id, userId: agentUsers[0].id },
    { teamId: salesTeam.id, userId: agentUsers[1].id },
    { teamId: salesTeam.id, userId: agentUsers[4].id },
    // Support Team
    { teamId: supportTeam.id, userId: agentUsers[2].id },
    { teamId: supportTeam.id, userId: agentUsers[3].id },
    { teamId: supportTeam.id, userId: agentUsers[5].id },
    // Enterprise Team
    { teamId: enterpriseTeam.id, userId: agentUsers[6].id },
    { teamId: enterpriseTeam.id, userId: agentUsers[7].id },
  ]);

  console.log('  ✓ Assigned agents to teams');

  // ============================================
  // 7. CALLER IDs
  // ============================================
  console.log('\nCreating caller IDs...');
  const [callerId1] = await db.insert(callerIds).values({
    tenantId: tenant.id,
    phoneNumber: '+18005551234',
    name: 'Main Sales Line',
    description: 'Primary outbound caller ID for sales',
    isVerified: true,
    status: 'active',
  }).returning();

  const [callerId2] = await db.insert(callerIds).values({
    tenantId: tenant.id,
    phoneNumber: '+18005555678',
    name: 'Support Line',
    description: 'Customer support caller ID',
    isVerified: true,
    status: 'active',
  }).returning();

  await db.insert(callerIds).values({
    tenantId: tenant.id,
    phoneNumber: '+18005559999',
    name: 'Enterprise Line',
    description: 'Enterprise accounts caller ID',
    isVerified: true,
    status: 'active',
  });

  console.log('  ✓ Created 3 caller IDs');

  // ============================================
  // 8. QUEUES
  // ============================================
  console.log('\nCreating queues...');
  const [salesQueue] = await db.insert(queues).values({
    tenantId: tenant.id,
    name: 'Sales Inbound',
    strategy: 'longest_idle',
    ringTimeout: 30,
    maxWaitTime: 600,
    settings: {
      musicOnHold: null,
      announcePosition: true,
      announceWaitTime: true,
      announceInterval: 60,
      wrapUpTime: 30,
      serviceLevelTarget: 20,
      serviceLevelThreshold: 80,
    },
  }).returning();

  const [supportQueue] = await db.insert(queues).values({
    tenantId: tenant.id,
    name: 'Customer Support',
    strategy: 'skills_based',
    ringTimeout: 25,
    maxWaitTime: 900,
    settings: {
      musicOnHold: null,
      announcePosition: true,
      announceWaitTime: true,
      announceInterval: 45,
      wrapUpTime: 45,
      serviceLevelTarget: 30,
      serviceLevelThreshold: 85,
    },
  }).returning();

  const [vipQueue] = await db.insert(queues).values({
    tenantId: tenant.id,
    name: 'VIP Support',
    strategy: 'round_robin',
    ringTimeout: 15,
    maxWaitTime: 300,
    settings: {
      musicOnHold: null,
      announcePosition: true,
      announceWaitTime: true,
      announceInterval: 30,
      wrapUpTime: 60,
      serviceLevelTarget: 10,
      serviceLevelThreshold: 95,
    },
  }).returning();

  const [technicalQueue] = await db.insert(queues).values({
    tenantId: tenant.id,
    name: 'Technical Support',
    strategy: 'skills_based',
    ringTimeout: 30,
    maxWaitTime: 1200,
    settings: {
      musicOnHold: null,
      announcePosition: true,
      announceWaitTime: true,
      announceInterval: 60,
      wrapUpTime: 90,
      serviceLevelTarget: 45,
      serviceLevelThreshold: 75,
    },
  }).returning();

  console.log('  ✓ Created 4 queues');

  // ============================================
  // 9. CAMPAIGNS
  // ============================================
  console.log('\nCreating campaigns...');
  const [summerSalesCampaign] = await db.insert(campaigns).values({
    tenantId: tenant.id,
    name: 'Summer Sales Outbound',
    type: 'outbound',
    dialMode: 'progressive',
    status: 'active',
    callerIdId: callerId1.id,
    settings: {
      dialRatio: 1.5,
      ringTimeout: 30,
      maxAttempts: 5,
      retryInterval: 3600,
      amdEnabled: true,
      amdAction: 'hangup',
      wrapUpTime: 30,
      priorityWeight: 50,
    },
    schedule: {
      enabled: true,
      timezone: 'America/New_York',
      hours: {
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '17:00' },
      },
    },
  }).returning();

  const [customerServiceCampaign] = await db.insert(campaigns).values({
    tenantId: tenant.id,
    name: 'Customer Service',
    type: 'inbound',
    status: 'active',
    callerIdId: callerId2.id,
    settings: {
      dialRatio: 1.0,
      ringTimeout: 30,
      maxAttempts: 1,
      retryInterval: 0,
      amdEnabled: false,
      amdAction: 'hangup',
      wrapUpTime: 45,
      priorityWeight: 100,
    },
  }).returning();

  const [winbackCampaign] = await db.insert(campaigns).values({
    tenantId: tenant.id,
    name: 'Customer Winback Q1',
    type: 'outbound',
    dialMode: 'preview',
    status: 'active',
    callerIdId: callerId1.id,
    settings: {
      dialRatio: 1.0,
      ringTimeout: 45,
      maxAttempts: 3,
      retryInterval: 7200,
      amdEnabled: true,
      amdAction: 'voicemail',
      wrapUpTime: 60,
      priorityWeight: 75,
    },
  }).returning();

  const [surveysCampaign] = await db.insert(campaigns).values({
    tenantId: tenant.id,
    name: 'Customer Satisfaction Survey',
    type: 'outbound',
    dialMode: 'predictive',
    status: 'paused',
    callerIdId: callerId2.id,
    settings: {
      dialRatio: 2.0,
      ringTimeout: 25,
      maxAttempts: 2,
      retryInterval: 86400,
      amdEnabled: true,
      amdAction: 'hangup',
      wrapUpTime: 15,
      priorityWeight: 25,
    },
  }).returning();

  console.log('  ✓ Created 4 campaigns');

  // ============================================
  // 10. DIALING RULES
  // ============================================
  console.log('\nCreating dialing rules...');
  await db.insert(dialingRules).values([
    {
      tenantId: tenant.id,
      campaignId: summerSalesCampaign.id,
      name: 'Timezone Restriction',
      ruleType: 'timezone',
      conditions: { checkLocalTime: true },
      actions: { allowedHours: { start: '09:00', end: '21:00' } },
      priority: 1,
      isActive: true,
    },
    {
      tenantId: tenant.id,
      campaignId: summerSalesCampaign.id,
      name: 'Max Daily Attempts',
      ruleType: 'attempt_limit',
      conditions: { maxAttemptsPerDay: 3 },
      actions: { skipIfExceeded: true },
      priority: 2,
      isActive: true,
    },
    {
      tenantId: tenant.id,
      campaignId: winbackCampaign.id,
      name: 'No Answer Recycle',
      ruleType: 'recycle',
      conditions: { disposition: 'NA' },
      actions: { recycleAfter: 24, maxRecycles: 3 },
      priority: 1,
      isActive: true,
    },
  ]);

  console.log('  ✓ Created 3 dialing rules');

  // ============================================
  // 11. DISPOSITIONS
  // ============================================
  console.log('\nCreating dispositions...');
  const createdDispositions = await db.insert(dispositions).values([
    { tenantId: tenant.id, code: 'SALE', name: 'Sale Made', isPositive: 1, requiresCallback: 0, nextAction: 'none', sortOrder: 1 },
    { tenantId: tenant.id, code: 'CB', name: 'Callback Scheduled', isPositive: 0, requiresCallback: 1, nextAction: 'callback', sortOrder: 2 },
    { tenantId: tenant.id, code: 'NI', name: 'Not Interested', isPositive: 0, requiresCallback: 0, nextAction: 'dnc', sortOrder: 3 },
    { tenantId: tenant.id, code: 'NA', name: 'No Answer', isPositive: 0, requiresCallback: 0, nextAction: 'retry', sortOrder: 4 },
    { tenantId: tenant.id, code: 'BUSY', name: 'Busy', isPositive: 0, requiresCallback: 0, nextAction: 'retry', sortOrder: 5 },
    { tenantId: tenant.id, code: 'VM', name: 'Voicemail', isPositive: 0, requiresCallback: 0, nextAction: 'retry', sortOrder: 6 },
    { tenantId: tenant.id, code: 'DNC', name: 'Do Not Call', isPositive: 0, requiresCallback: 0, nextAction: 'dnc', sortOrder: 7 },
    { tenantId: tenant.id, code: 'QUALIFIED', name: 'Qualified Lead', isPositive: 1, requiresCallback: 1, nextAction: 'callback', sortOrder: 8 },
    { tenantId: tenant.id, code: 'WRONG', name: 'Wrong Number', isPositive: 0, requiresCallback: 0, nextAction: 'remove', sortOrder: 9 },
    { tenantId: tenant.id, code: 'TRANSFER', name: 'Transferred', isPositive: 1, requiresCallback: 0, nextAction: 'none', sortOrder: 10 },
  ]).returning();

  console.log('  ✓ Created', createdDispositions.length, 'dispositions');

  // ============================================
  // 12. DNC LISTS
  // ============================================
  console.log('\nCreating DNC entries...');
  await db.insert(dncLists).values([
    { tenantId: tenant.id, phoneNumber: '+15559990001', source: 'customer_request', reason: 'Customer requested no calls' },
    { tenantId: tenant.id, phoneNumber: '+15559990002', source: 'manual', reason: 'Legal compliance' },
    { tenantId: tenant.id, phoneNumber: '+15559990003', source: 'import', reason: 'Federal DNC list' },
    { tenantId: tenant.id, phoneNumber: '+15559990004', source: 'api', reason: 'Automated scrub' },
    { tenantId: tenant.id, phoneNumber: '+15559990005', source: 'customer_request', reason: 'Opted out via SMS' },
  ]);

  console.log('  ✓ Created 5 DNC entries');

  // ============================================
  // 13. LEAD LISTS
  // ============================================
  console.log('\nCreating lead lists...');
  const [salesLeadList] = await db.insert(leadLists).values({
    tenantId: tenant.id,
    campaignId: summerSalesCampaign.id,
    name: 'Q1 Sales Leads',
    description: 'Sales leads for Q1 campaign',
    status: 'active',
    totalLeads: 25,
  }).returning();

  const [supportLeadList] = await db.insert(leadLists).values({
    tenantId: tenant.id,
    name: 'Customer Follow-ups',
    description: 'Customers to follow up with',
    status: 'active',
    totalLeads: 15,
  }).returning();

  const [winbackLeadList] = await db.insert(leadLists).values({
    tenantId: tenant.id,
    campaignId: winbackCampaign.id,
    name: 'Churned Customers Q4',
    description: 'Customers who cancelled in Q4',
    status: 'active',
    totalLeads: 20,
  }).returning();

  const [enterpriseLeadList] = await db.insert(leadLists).values({
    tenantId: tenant.id,
    name: 'Enterprise Prospects',
    description: 'High-value enterprise leads',
    status: 'active',
    totalLeads: 10,
  }).returning();

  console.log('  ✓ Created 4 lead lists');

  // ============================================
  // 14. LEADS
  // ============================================
  console.log('\nCreating leads...');

  // Sales leads with various statuses
  const salesLeads = [
    { firstName: 'John', lastName: 'Smith', phoneNumber: '+15551234001', email: 'john.smith@techcorp.com', company: 'TechCorp Solutions', status: 'new', priority: 80, score: '85.50' },
    { firstName: 'Jane', lastName: 'Doe', phoneNumber: '+15551234002', email: 'jane.doe@innovate.io', company: 'Innovate Inc', status: 'new', priority: 75, score: '72.25' },
    { firstName: 'Robert', lastName: 'Johnson', phoneNumber: '+15551234003', email: 'robert.j@globalcorp.com', company: 'Global Corp', status: 'contacted', priority: 90, score: '91.00' },
    { firstName: 'Emily', lastName: 'Williams', phoneNumber: '+15551234004', email: 'emily.w@startup.co', company: 'StartUp Co', status: 'qualified', priority: 95, score: '88.75' },
    { firstName: 'Michael', lastName: 'Brown', phoneNumber: '+15551234005', email: 'michael.b@enterprise.com', company: 'Enterprise Ltd', status: 'converted', priority: 50, score: '95.00' },
    { firstName: 'Sarah', lastName: 'Davis', phoneNumber: '+15551234006', email: 'sarah.d@solutions.net', company: 'Solutions Network', status: 'new', priority: 70, score: '68.50' },
    { firstName: 'David', lastName: 'Miller', phoneNumber: '+15551234007', email: 'david.m@consulting.com', company: 'Consulting Group', status: 'contacted', priority: 85, score: '79.25' },
    { firstName: 'Lisa', lastName: 'Wilson', phoneNumber: '+15551234008', email: 'lisa.w@fintech.io', company: 'FinTech Solutions', status: 'qualified', priority: 92, score: '87.00' },
    { firstName: 'James', lastName: 'Taylor', phoneNumber: '+15551234009', email: 'james.t@healthcare.org', company: 'Healthcare Plus', status: 'not_interested', priority: 40, score: '45.50' },
    { firstName: 'Amanda', lastName: 'Anderson', phoneNumber: '+15551234010', email: 'amanda.a@retail.com', company: 'Retail Giants', status: 'new', priority: 65, score: '71.25' },
  ];

  const createdSalesLeads = await db.insert(leads).values(
    salesLeads.map((lead, idx) => ({
      tenantId: tenant.id,
      listId: salesLeadList.id,
      phoneNumber: lead.phoneNumber,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company,
      status: lead.status,
      priority: lead.priority,
      leadScore: lead.score,
      attemptCount: idx < 5 ? idx : 0,
      timezone: 'America/New_York',
      customFields: { industry: 'Technology', size: idx % 3 === 0 ? 'Enterprise' : 'SMB' },
    }))
  ).returning();

  // Support follow-up leads
  const supportLeads = [
    { firstName: 'Chris', lastName: 'Martin', phoneNumber: '+15551235001', email: 'chris.m@acme.com', company: 'Acme Corp', status: 'contacted' },
    { firstName: 'Rachel', lastName: 'White', phoneNumber: '+15551235002', email: 'rachel.w@bigco.com', company: 'BigCo Industries', status: 'new' },
    { firstName: 'Kevin', lastName: 'Harris', phoneNumber: '+15551235003', email: 'kevin.h@startup.io', company: 'StartUp.io', status: 'qualified' },
    { firstName: 'Nicole', lastName: 'Clark', phoneNumber: '+15551235004', email: 'nicole.c@media.net', company: 'Media Network', status: 'contacted' },
    { firstName: 'Brian', lastName: 'Lewis', phoneNumber: '+15551235005', email: 'brian.l@software.com', company: 'Software Inc', status: 'new' },
  ];

  await db.insert(leads).values(
    supportLeads.map((lead) => ({
      tenantId: tenant.id,
      listId: supportLeadList.id,
      phoneNumber: lead.phoneNumber,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company,
      status: lead.status,
      priority: 75,
      attemptCount: 1,
      customFields: { ticketNumber: `TKT-${Math.floor(Math.random() * 10000)}` },
    }))
  );

  // Winback leads
  const winbackLeads = [
    { firstName: 'Thomas', lastName: 'Moore', phoneNumber: '+15551236001', email: 'thomas.m@former.com', company: 'Former Client LLC' },
    { firstName: 'Patricia', lastName: 'Jackson', phoneNumber: '+15551236002', email: 'patricia.j@oldcustomer.com', company: 'Old Customer Inc' },
    { firstName: 'Daniel', lastName: 'Thompson', phoneNumber: '+15551236003', email: 'daniel.t@lapsed.net', company: 'Lapsed Co' },
  ];

  await db.insert(leads).values(
    winbackLeads.map((lead) => ({
      tenantId: tenant.id,
      listId: winbackLeadList.id,
      phoneNumber: lead.phoneNumber,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company,
      status: 'new',
      priority: 85,
      attemptCount: 0,
      customFields: { previousPlan: 'Enterprise', cancelReason: 'Budget constraints' },
    }))
  );

  // Enterprise leads
  const enterpriseLeads = [
    { firstName: 'William', lastName: 'Garcia', phoneNumber: '+15551237001', email: 'william.g@fortune500.com', company: 'Fortune 500 Corp', score: '95.00' },
    { firstName: 'Elizabeth', lastName: 'Martinez', phoneNumber: '+15551237002', email: 'elizabeth.m@megacorp.com', company: 'MegaCorp International', score: '92.50' },
  ];

  await db.insert(leads).values(
    enterpriseLeads.map((lead) => ({
      tenantId: tenant.id,
      listId: enterpriseLeadList.id,
      phoneNumber: lead.phoneNumber,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company,
      status: 'qualified',
      priority: 100,
      leadScore: lead.score,
      attemptCount: 2,
      customFields: { dealSize: '$500,000+', decisionMaker: true },
    }))
  );

  console.log('  ✓ Created 20 leads across 4 lists');

  // ============================================
  // 15. CALLS (Historical Call Records)
  // ============================================
  console.log('\nCreating call records...');
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const callRecords = [
    // Today's calls
    {
      leadId: createdSalesLeads[0].id,
      agentId: agentUsers[0].id,
      queueId: salesQueue.id,
      campaignId: summerSalesCampaign.id,
      direction: 'outbound',
      status: 'completed',
      dispositionId: createdDispositions[0].id, // SALE
      phoneNumber: '+15551234001',
      callerId: '+18005551234',
      startTime: twoHoursAgo,
      answerTime: new Date(twoHoursAgo.getTime() + 15000),
      endTime: new Date(twoHoursAgo.getTime() + 480000),
      ringDuration: 15,
      talkDuration: 465,
      holdDuration: 30,
      wrapDuration: 45,
      recordingUrl: 'https://recordings.nexusdialer.com/call-001.mp3',
      aiSummary: 'Customer expressed strong interest in the premium package. Discussed pricing and implementation timeline. Closed the sale successfully.',
      sentimentScore: '0.85',
    },
    {
      leadId: createdSalesLeads[1].id,
      agentId: agentUsers[1].id,
      queueId: salesQueue.id,
      campaignId: summerSalesCampaign.id,
      direction: 'outbound',
      status: 'completed',
      dispositionId: createdDispositions[1].id, // CB
      phoneNumber: '+15551234002',
      callerId: '+18005551234',
      startTime: oneHourAgo,
      answerTime: new Date(oneHourAgo.getTime() + 20000),
      endTime: new Date(oneHourAgo.getTime() + 300000),
      ringDuration: 20,
      talkDuration: 280,
      holdDuration: 0,
      wrapDuration: 30,
      recordingUrl: 'https://recordings.nexusdialer.com/call-002.mp3',
      aiSummary: 'Customer interested but needs to discuss with team. Scheduled callback for next week.',
      sentimentScore: '0.65',
    },
    {
      leadId: createdSalesLeads[2].id,
      agentId: agentUsers[0].id,
      queueId: salesQueue.id,
      campaignId: summerSalesCampaign.id,
      direction: 'outbound',
      status: 'completed',
      dispositionId: createdDispositions[3].id, // NA
      phoneNumber: '+15551234003',
      callerId: '+18005551234',
      startTime: new Date(now.getTime() - 30 * 60 * 1000),
      answerTime: null,
      endTime: new Date(now.getTime() - 30 * 60 * 1000 + 30000),
      ringDuration: 30,
      talkDuration: 0,
      holdDuration: 0,
      wrapDuration: 15,
      recordingUrl: null,
      aiSummary: null,
      sentimentScore: null,
    },
    // Yesterday's calls
    {
      leadId: createdSalesLeads[3].id,
      agentId: agentUsers[2].id,
      queueId: supportQueue.id,
      campaignId: customerServiceCampaign.id,
      direction: 'inbound',
      status: 'completed',
      dispositionId: createdDispositions[7].id, // QUALIFIED
      phoneNumber: '+15551234004',
      callerId: '+15551234004',
      startTime: yesterday,
      answerTime: new Date(yesterday.getTime() + 10000),
      endTime: new Date(yesterday.getTime() + 600000),
      ringDuration: 10,
      talkDuration: 590,
      holdDuration: 120,
      wrapDuration: 60,
      recordingUrl: 'https://recordings.nexusdialer.com/call-003.mp3',
      aiSummary: 'Customer called about upgrading their plan. Provided detailed information about enterprise features. Very interested in proceeding.',
      sentimentScore: '0.90',
    },
    {
      leadId: createdSalesLeads[4].id,
      agentId: agentUsers[3].id,
      queueId: supportQueue.id,
      campaignId: customerServiceCampaign.id,
      direction: 'inbound',
      status: 'completed',
      dispositionId: createdDispositions[9].id, // TRANSFER
      phoneNumber: '+15551234005',
      callerId: '+15551234005',
      startTime: new Date(yesterday.getTime() + 3600000),
      answerTime: new Date(yesterday.getTime() + 3600000 + 8000),
      endTime: new Date(yesterday.getTime() + 3600000 + 180000),
      ringDuration: 8,
      talkDuration: 172,
      holdDuration: 45,
      wrapDuration: 20,
      recordingUrl: 'https://recordings.nexusdialer.com/call-004.mp3',
      aiSummary: 'Customer had a technical issue that required specialist attention. Transferred to technical support team.',
      sentimentScore: '0.55',
    },
  ];

  const createdCalls = await db.insert(calls).values(
    callRecords.map(call => ({
      tenantId: tenant.id,
      ...call,
      metadata: {},
    }))
  ).returning();

  // Add more historical calls for reporting
  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(Math.random() * 7) + 1;
    const startTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);
    const answered = Math.random() > 0.3;
    const talkDuration = answered ? Math.floor(Math.random() * 600) + 60 : 0;

    await db.insert(calls).values({
      tenantId: tenant.id,
      leadId: createdSalesLeads[Math.floor(Math.random() * createdSalesLeads.length)].id,
      agentId: agentUsers[Math.floor(Math.random() * agentUsers.length)].id,
      queueId: Math.random() > 0.5 ? salesQueue.id : supportQueue.id,
      campaignId: Math.random() > 0.5 ? summerSalesCampaign.id : customerServiceCampaign.id,
      direction: Math.random() > 0.6 ? 'outbound' : 'inbound',
      status: 'completed',
      dispositionId: createdDispositions[Math.floor(Math.random() * createdDispositions.length)].id,
      phoneNumber: `+1555123400${i}`,
      callerId: '+18005551234',
      startTime,
      answerTime: answered ? new Date(startTime.getTime() + 15000) : null,
      endTime: new Date(startTime.getTime() + (answered ? talkDuration * 1000 + 15000 : 30000)),
      ringDuration: answered ? 15 : 30,
      talkDuration,
      holdDuration: answered ? Math.floor(Math.random() * 60) : 0,
      wrapDuration: Math.floor(Math.random() * 45) + 15,
      recordingUrl: answered ? `https://recordings.nexusdialer.com/call-hist-${i}.mp3` : null,
      aiSummary: answered ? 'Historical call record for reporting purposes.' : null,
      sentimentScore: answered ? (Math.random() * 0.5 + 0.5).toFixed(2) : null,
      metadata: {},
    });
  }

  console.log('  ✓ Created 20 call records');

  // ============================================
  // 16. AGENT STATES
  // ============================================
  console.log('\nCreating agent state history...');
  const stateTypes = ['available', 'on_call', 'wrap_up', 'break', 'lunch', 'training', 'offline'];

  for (const agent of agentUsers.slice(0, 4)) {
    // Create state history for each agent
    let currentTime = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago (start of shift)

    for (let i = 0; i < 10; i++) {
      const state = stateTypes[Math.floor(Math.random() * stateTypes.length)];
      const duration = Math.floor(Math.random() * 1800) + 300; // 5-35 minutes
      const endTime = new Date(currentTime.getTime() + duration * 1000);

      await db.insert(agentStates).values({
        tenantId: tenant.id,
        agentId: agent.id,
        state,
        reason: state === 'break' ? 'Short break' : state === 'lunch' ? 'Lunch break' : null,
        startedAt: currentTime,
        endedAt: endTime,
        duration,
        callId: state === 'on_call' && createdCalls.length > 0 ? createdCalls[Math.floor(Math.random() * createdCalls.length)].id : null,
      });

      currentTime = endTime;
    }

    // Current state (no end time)
    await db.insert(agentStates).values({
      tenantId: tenant.id,
      agentId: agent.id,
      state: 'available',
      reason: null,
      startedAt: currentTime,
      endedAt: null,
      duration: null,
      callId: null,
    });
  }

  console.log('  ✓ Created agent state history');

  // ============================================
  // 17. CALLBACK SCHEDULES
  // ============================================
  console.log('\nCreating callback schedules...');
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(callbackSchedules).values([
    {
      tenantId: tenant.id,
      leadId: createdSalesLeads[1].id,
      callId: createdCalls[1].id,
      agentId: agentUsers[1].id,
      scheduledAt: tomorrow,
      callbackType: 'agent_specific',
      notes: 'Customer requested callback after team discussion. Interested in premium package.',
      status: 'pending',
    },
    {
      tenantId: tenant.id,
      leadId: createdSalesLeads[3].id,
      callId: createdCalls[3].id,
      agentId: null, // Any agent
      scheduledAt: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
      callbackType: 'any',
      notes: 'Follow up on enterprise upgrade discussion.',
      status: 'pending',
    },
    {
      tenantId: tenant.id,
      leadId: createdSalesLeads[5].id,
      callId: null,
      agentId: agentUsers[0].id,
      scheduledAt: nextWeek,
      callbackType: 'agent_specific',
      notes: 'Customer out of office until next week.',
      status: 'pending',
    },
    {
      tenantId: tenant.id,
      leadId: createdSalesLeads[6].id,
      callId: null,
      agentId: null,
      scheduledAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago (overdue)
      callbackType: 'any',
      notes: 'Missed callback - needs immediate attention.',
      status: 'pending',
    },
  ]);

  console.log('  ✓ Created 4 callback schedules');

  // ============================================
  // 18. LEAD HISTORY
  // ============================================
  console.log('\nCreating lead history...');
  for (const lead of createdSalesLeads.slice(0, 5)) {
    await db.insert(leadHistory).values([
      {
        tenantId: tenant.id,
        leadId: lead.id,
        eventType: 'created',
        previousValue: null,
        newValue: { status: 'new' },
        metadata: { source: 'import' },
        createdBy: adminUser.id,
        createdAt: twoDaysAgo,
      },
      {
        tenantId: tenant.id,
        leadId: lead.id,
        eventType: 'status_change',
        previousValue: { status: 'new' },
        newValue: { status: lead.status },
        metadata: { reason: 'Call attempt made' },
        createdBy: agentUsers[0].id,
        createdAt: yesterday,
      },
    ]);
  }

  console.log('  ✓ Created lead history entries');

  // ============================================
  // 19. TRANSCRIPTIONS
  // ============================================
  console.log('\nCreating transcriptions...');
  for (const call of createdCalls.slice(0, 3)) {
    if (call.talkDuration && call.talkDuration > 0) {
      await db.insert(transcriptions).values({
        tenantId: tenant.id,
        callId: call.id,
        content: `Agent: Hello, thank you for calling NexusDialer. How can I help you today?\n\nCustomer: Hi, I'm interested in learning more about your enterprise plan.\n\nAgent: I'd be happy to help you with that. Let me tell you about our enterprise features...\n\nCustomer: That sounds great. What's the pricing like?\n\nAgent: For enterprise accounts, we offer customized pricing based on your specific needs...`,
        speakers: [
          { id: 'agent', name: 'Agent', segments: 3 },
          { id: 'customer', name: 'Customer', segments: 2 },
        ],
        keywords: ['enterprise', 'pricing', 'features', 'plan'],
        sentiment: {
          overall: 0.75,
          segments: [
            { start: 0, end: 30, score: 0.7 },
            { start: 30, end: 60, score: 0.8 },
            { start: 60, end: 90, score: 0.75 },
          ],
        },
        language: 'en',
        confidence: '0.95',
        processingTime: 2500,
      });
    }
  }

  console.log('  ✓ Created transcriptions');

  // ============================================
  // 20. AGENT ASSIST EVENTS
  // ============================================
  console.log('\nCreating agent assist events...');
  for (const call of createdCalls.slice(0, 2)) {
    await db.insert(agentAssistEvents).values([
      {
        tenantId: tenant.id,
        callId: call.id,
        agentId: call.agentId!,
        eventType: 'suggestion',
        content: {
          type: 'response_suggestion',
          text: 'Consider mentioning our 30-day free trial for enterprise customers.',
          confidence: 0.85,
        },
        shownAt: new Date(call.startTime!.getTime() + 60000),
        accepted: 1,
        feedback: 'helpful',
      },
      {
        tenantId: tenant.id,
        callId: call.id,
        agentId: call.agentId!,
        eventType: 'knowledge_surface',
        content: {
          type: 'article',
          articleId: 'kb-001',
          title: 'Enterprise Pricing Guide',
          relevanceScore: 0.92,
        },
        shownAt: new Date(call.startTime!.getTime() + 120000),
        accepted: 1,
        feedback: null,
      },
      {
        tenantId: tenant.id,
        callId: call.id,
        agentId: call.agentId!,
        eventType: 'alert',
        content: {
          type: 'sentiment_drop',
          message: 'Customer sentiment has decreased. Consider addressing concerns.',
          severity: 'warning',
        },
        shownAt: new Date(call.startTime!.getTime() + 180000),
        accepted: null,
        feedback: null,
      },
    ]);
  }

  console.log('  ✓ Created agent assist events');

  // ============================================
  // 21. KNOWLEDGE ARTICLES
  // ============================================
  console.log('\nCreating knowledge articles...');
  await db.insert(knowledgeArticles).values([
    {
      tenantId: tenant.id,
      title: 'Enterprise Pricing Guide',
      content: `# Enterprise Pricing Overview\n\nOur enterprise plans are designed for organizations with 100+ agents.\n\n## Pricing Tiers\n\n- **Standard Enterprise**: $99/agent/month\n- **Premium Enterprise**: $149/agent/month\n- **Custom Enterprise**: Contact sales\n\n## Included Features\n\n- Unlimited calls\n- Advanced analytics\n- Priority support\n- Custom integrations\n- Dedicated account manager`,
      category: 'Pricing',
      tags: ['enterprise', 'pricing', 'plans'],
      status: 'published',
      viewCount: 156,
      helpfulCount: 42,
      createdBy: adminUser.id,
    },
    {
      tenantId: tenant.id,
      title: 'Handling Price Objections',
      content: `# Overcoming Price Objections\n\n## Common Objections\n\n1. "It's too expensive"\n   - Focus on ROI and value\n   - Highlight cost savings from automation\n\n2. "We can't afford it right now"\n   - Offer flexible payment terms\n   - Discuss implementation timeline\n\n3. "Competitor X is cheaper"\n   - Emphasize unique features\n   - Discuss total cost of ownership`,
      category: 'Sales',
      tags: ['objections', 'sales', 'techniques'],
      status: 'published',
      viewCount: 234,
      helpfulCount: 89,
      createdBy: supervisor1.id,
    },
    {
      tenantId: tenant.id,
      title: 'Technical Troubleshooting Guide',
      content: `# Common Technical Issues\n\n## WebRTC Connection Issues\n\n1. Check browser permissions\n2. Verify firewall settings\n3. Test microphone/speaker\n\n## Call Quality Problems\n\n1. Check network bandwidth\n2. Close other applications\n3. Use wired connection if possible`,
      category: 'Technical',
      tags: ['troubleshooting', 'technical', 'webrtc'],
      status: 'published',
      viewCount: 312,
      helpfulCount: 127,
      createdBy: adminUser.id,
    },
    {
      tenantId: tenant.id,
      title: 'Customer Retention Strategies',
      content: `# Retention Best Practices\n\n## Key Strategies\n\n1. Proactive outreach\n2. Regular check-ins\n3. Address issues quickly\n4. Offer loyalty discounts\n\n## Warning Signs\n\n- Decreased usage\n- Support ticket volume increase\n- Missed payments`,
      category: 'Retention',
      tags: ['retention', 'customers', 'churn'],
      status: 'published',
      viewCount: 89,
      helpfulCount: 34,
      createdBy: supervisor2.id,
    },
  ]);

  console.log('  ✓ Created 4 knowledge articles');

  // ============================================
  // 22. LEAD SCORE PREDICTIONS
  // ============================================
  console.log('\nCreating lead score predictions...');
  for (const lead of createdSalesLeads) {
    await db.insert(leadScorePredictions).values({
      tenantId: tenant.id,
      leadId: lead.id,
      score: lead.leadScore || '50.00',
      factors: [
        { factor: 'company_size', weight: 0.25, value: 'enterprise' },
        { factor: 'engagement_level', weight: 0.30, value: 'high' },
        { factor: 'industry_match', weight: 0.20, value: 'technology' },
        { factor: 'recency', weight: 0.25, value: 'recent_contact' },
      ],
      predictedOutcome: parseFloat(lead.leadScore || '50') > 70 ? 'likely_convert' : 'needs_nurturing',
      confidence: '0.85',
      modelVersion: 'v2.1.0',
      calculatedAt: now,
    });
  }

  console.log('  ✓ Created lead score predictions');

  // ============================================
  // 23. IVR FLOWS
  // ============================================
  console.log('\nCreating IVR flows...');
  await db.insert(ivrFlows).values([
    {
      tenantId: tenant.id,
      name: 'Main Menu IVR',
      description: 'Primary inbound call menu',
      nodes: [
        {
          id: 'start',
          type: 'play',
          data: { message: 'Welcome to NexusDialer. Your call is important to us.' },
          next: 'menu',
        },
        {
          id: 'menu',
          type: 'menu',
          data: {
            prompt: 'Press 1 for Sales, 2 for Support, 3 for Billing, or 0 to speak with an operator.',
            options: [
              { digit: '1', next: 'sales_queue' },
              { digit: '2', next: 'support_queue' },
              { digit: '3', next: 'billing_queue' },
              { digit: '0', next: 'operator' },
            ],
          },
          next: 'invalid',
        },
        { id: 'sales_queue', type: 'queue', data: { queueId: salesQueue.id }, next: null },
        { id: 'support_queue', type: 'queue', data: { queueId: supportQueue.id }, next: null },
        { id: 'billing_queue', type: 'queue', data: { queueId: supportQueue.id }, next: null },
        { id: 'operator', type: 'queue', data: { queueId: vipQueue.id }, next: null },
        { id: 'invalid', type: 'play', data: { message: 'Invalid selection.' }, next: 'menu' },
      ],
      status: 'published',
      version: '1.0',
      createdBy: adminUser.id,
      publishedAt: yesterday,
    },
    {
      tenantId: tenant.id,
      name: 'After Hours IVR',
      description: 'After hours message and voicemail',
      nodes: [
        {
          id: 'start',
          type: 'play',
          data: { message: 'Thank you for calling NexusDialer. Our office is currently closed.' },
          next: 'hours',
        },
        {
          id: 'hours',
          type: 'play',
          data: { message: 'Our business hours are Monday through Friday, 9 AM to 6 PM Eastern Time.' },
          next: 'voicemail',
        },
        {
          id: 'voicemail',
          type: 'voicemail',
          data: { maxDuration: 120, email: 'support@nexusdialer.com' },
          next: null,
        },
      ],
      status: 'published',
      version: '1.0',
      createdBy: adminUser.id,
      publishedAt: twoDaysAgo,
    },
  ]);

  console.log('  ✓ Created 2 IVR flows');

  // ============================================
  // 24. AUDIO FILES
  // ============================================
  console.log('\nCreating audio files...');
  await db.insert(audioFiles).values([
    {
      tenantId: tenant.id,
      name: 'Welcome Message',
      description: 'Main greeting for inbound calls',
      type: 'prompt',
      fileUrl: 'https://storage.nexusdialer.com/audio/welcome.mp3',
      fileSize: '245KB',
      duration: '00:15',
      format: 'mp3',
      createdBy: adminUser.id,
    },
    {
      tenantId: tenant.id,
      name: 'Hold Music - Jazz',
      description: 'Relaxing jazz music for hold',
      type: 'hold_music',
      fileUrl: 'https://storage.nexusdialer.com/audio/hold-jazz.mp3',
      fileSize: '3.2MB',
      duration: '03:45',
      format: 'mp3',
      createdBy: adminUser.id,
    },
    {
      tenantId: tenant.id,
      name: 'Voicemail Greeting',
      description: 'Default voicemail greeting',
      type: 'voicemail_greeting',
      fileUrl: 'https://storage.nexusdialer.com/audio/voicemail.mp3',
      fileSize: '180KB',
      duration: '00:12',
      format: 'mp3',
      createdBy: adminUser.id,
    },
  ]);

  console.log('  ✓ Created 3 audio files');

  // ============================================
  // 25. SCRIPTS
  // ============================================
  console.log('\nCreating call scripts...');
  await db.insert(scripts).values([
    {
      tenantId: tenant.id,
      name: 'Sales Outbound Script',
      description: 'Standard script for outbound sales calls',
      content: {
        sections: [
          {
            id: 'intro',
            type: 'greeting',
            title: 'Introduction',
            text: 'Hi, this is {{agent_name}} calling from NexusDialer. Am I speaking with {{customer_name}}?',
            responses: [
              { label: 'Yes', next: 'purpose' },
              { label: 'No, wrong person', next: 'wrong_person' },
              { label: 'Not interested', next: 'objection_ni' },
            ],
          },
          {
            id: 'purpose',
            type: 'pitch',
            title: 'Purpose of Call',
            text: 'Great! I\'m reaching out because we noticed {{company_name}} might benefit from our contact center solution. Do you have a few minutes to hear about how we can help improve your customer communications?',
            responses: [
              { label: 'Yes, tell me more', next: 'benefits' },
              { label: 'Not a good time', next: 'callback' },
              { label: 'Not interested', next: 'objection_ni' },
            ],
          },
          {
            id: 'benefits',
            type: 'pitch',
            title: 'Key Benefits',
            text: 'Our platform helps businesses like yours:\n\n• Increase agent productivity by 40%\n• Reduce average handle time\n• Improve customer satisfaction scores\n• Get real-time AI assistance\n\nWould any of these be particularly valuable for your team?',
            responses: [
              { label: 'Interested in demo', next: 'close' },
              { label: 'Need more info', next: 'details' },
              { label: 'Too expensive', next: 'objection_price' },
            ],
          },
          {
            id: 'close',
            type: 'close',
            title: 'Schedule Demo',
            text: 'Excellent! I\'d love to show you a personalized demo. What day works best for you - would Tuesday or Thursday be better?',
            responses: [
              { label: 'Scheduled', next: 'end_positive' },
              { label: 'Need to check', next: 'callback' },
            ],
          },
          {
            id: 'objection_price',
            type: 'objection',
            title: 'Price Objection Handler',
            text: 'I understand budget is important. Our customers typically see ROI within 3 months through increased efficiency. Would it help if I shared some case studies showing the cost savings?',
            responses: [
              { label: 'Yes, send info', next: 'close' },
              { label: 'Still not interested', next: 'end_neutral' },
            ],
          },
          {
            id: 'objection_ni',
            type: 'objection',
            title: 'Not Interested Handler',
            text: 'I appreciate your honesty. Just curious - is it the timing, or is there something specific about contact center solutions that doesn\'t fit your needs?',
            responses: [
              { label: 'Bad timing', next: 'callback' },
              { label: 'Not a fit', next: 'end_dnc' },
            ],
          },
          {
            id: 'callback',
            type: 'close',
            title: 'Schedule Callback',
            text: 'No problem at all. When would be a better time for me to call back?',
            responses: [
              { label: 'Time provided', next: 'end_callback' },
              { label: 'Don\'t call back', next: 'end_dnc' },
            ],
          },
          {
            id: 'end_positive',
            type: 'closing',
            title: 'Positive Closing',
            text: 'Perfect! You\'ll receive a calendar invite shortly. Thank you for your time, {{customer_name}}. Have a great day!',
            responses: [],
          },
          {
            id: 'end_callback',
            type: 'closing',
            title: 'Callback Closing',
            text: 'I\'ve scheduled a callback for {{callback_time}}. Thank you for your time!',
            responses: [],
          },
          {
            id: 'end_neutral',
            type: 'closing',
            title: 'Neutral Closing',
            text: 'I understand. If anything changes, feel free to reach out. Have a great day!',
            responses: [],
          },
          {
            id: 'end_dnc',
            type: 'closing',
            title: 'DNC Closing',
            text: 'I\'ve made a note and we won\'t call again. Thank you for your time.',
            responses: [],
          },
        ],
        objectionHandlers: [
          { objection: 'Too expensive', response: 'Focus on ROI - most customers see payback in 3 months' },
          { objection: 'Happy with current solution', response: 'Ask what they like about it, then highlight our unique AI features' },
          { objection: 'Need to think about it', response: 'Offer to send case studies and schedule a follow-up' },
          { objection: 'Not the decision maker', response: 'Ask for the right contact and offer to include them in a demo' },
        ],
        quickResponses: [
          { category: 'Acknowledgment', text: 'I completely understand.' },
          { category: 'Acknowledgment', text: 'That\'s a great question.' },
          { category: 'Value', text: 'Our customers typically see a 40% improvement in productivity.' },
          { category: 'Value', text: 'We offer a 30-day free trial with no commitment.' },
          { category: 'Next Steps', text: 'Let me get that information to you right away.' },
          { category: 'Next Steps', text: 'I can have our specialist reach out to discuss that in detail.' },
        ],
      },
      status: 'published',
      version: '2.1',
      createdBy: supervisor1.id,
    },
    {
      tenantId: tenant.id,
      name: 'Customer Support Script',
      description: 'Script for inbound support calls',
      content: {
        sections: [
          {
            id: 'intro',
            type: 'greeting',
            title: 'Greeting',
            text: 'Thank you for calling NexusDialer support. My name is {{agent_name}}. How can I help you today?',
            responses: [
              { label: 'Technical issue', next: 'tech_triage' },
              { label: 'Billing question', next: 'billing' },
              { label: 'Account changes', next: 'account' },
              { label: 'General inquiry', next: 'general' },
            ],
          },
          {
            id: 'tech_triage',
            type: 'qualifier',
            title: 'Technical Triage',
            text: 'I\'m sorry to hear you\'re experiencing issues. Can you describe what\'s happening? Is it related to call quality, login issues, or something else?',
            responses: [
              { label: 'Call quality', next: 'call_quality' },
              { label: 'Login issues', next: 'login_help' },
              { label: 'Other', next: 'escalate' },
            ],
          },
          {
            id: 'resolution',
            type: 'closing',
            title: 'Resolution',
            text: 'Is there anything else I can help you with today?',
            responses: [
              { label: 'No, all set', next: 'end_positive' },
              { label: 'Yes, another issue', next: 'intro' },
            ],
          },
          {
            id: 'end_positive',
            type: 'closing',
            title: 'Closing',
            text: 'Thank you for calling NexusDialer support. Have a great day!',
            responses: [],
          },
        ],
      },
      status: 'published',
      version: '1.5',
      createdBy: supervisor2.id,
    },
  ]);

  console.log('  ✓ Created 2 call scripts');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n========================================');
  console.log('🎉 Seeding complete!');
  console.log('========================================\n');
  console.log('Summary:');
  console.log('  • 1 Tenant');
  console.log('  • 11 Users (1 admin, 2 supervisors, 8 agents)');
  console.log('  • 10 Agent Profiles');
  console.log('  • 8 Skills');
  console.log('  • 3 Teams with member assignments');
  console.log('  • 3 Caller IDs');
  console.log('  • 4 Queues');
  console.log('  • 4 Campaigns');
  console.log('  • 3 Dialing Rules');
  console.log('  • 10 Dispositions');
  console.log('  • 5 DNC Entries');
  console.log('  • 4 Lead Lists');
  console.log('  • 20 Leads');
  console.log('  • 20 Call Records');
  console.log('  • Agent State History');
  console.log('  • 4 Callback Schedules');
  console.log('  • Lead History Entries');
  console.log('  • Transcriptions');
  console.log('  • Agent Assist Events');
  console.log('  • 4 Knowledge Articles');
  console.log('  • Lead Score Predictions');
  console.log('  • 2 IVR Flows');
  console.log('  • 3 Audio Files');
  console.log('  • 2 Call Scripts');
  console.log('\nTest Credentials:');
  console.log('  Admin:      admin@nexus.com / admin123');
  console.log('  Supervisor: supervisor@nexus.com / super123');
  console.log('  Agent:      agent@nexus.com / agent123');
  console.log('');

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
