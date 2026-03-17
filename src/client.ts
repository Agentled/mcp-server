/**
 * AgentledClient — HTTP client wrapping the /api/external/* routes.
 *
 * Reads AGENTLED_API_KEY and AGENTLED_URL from environment variables.
 */

export class AgentledClient {
    private baseUrl: string;
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.AGENTLED_API_KEY || '';
        this.baseUrl = (process.env.AGENTLED_URL || 'http://localhost:3000').replace(/\/$/, '');

        if (!this.apiKey) {
            throw new Error(
                'AGENTLED_API_KEY is not set. Generate one in Workspace Settings > Developer.'
            );
        }
    }

    private async request(path: string, options: RequestInit = {}): Promise<any> {
        const url = `${this.baseUrl}/api/external${path}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return data;
    }

    // --- Workflows ---

    async listWorkflows(params?: { status?: string; limit?: number }) {
        const query = new URLSearchParams();
        if (params?.status) query.set('status', params.status);
        if (params?.limit) query.set('limit', String(params.limit));
        const qs = query.toString();
        return this.request(`/workflows${qs ? `?${qs}` : ''}`);
    }

    async getWorkflow(id: string) {
        return this.request(`/workflows/${id}`);
    }

    async createWorkflow(pipeline: Record<string, any>, locale?: string) {
        return this.request('/workflows', {
            method: 'POST',
            body: JSON.stringify({ pipeline, locale }),
        });
    }

    async updateWorkflow(id: string, updates: Record<string, any>, locale?: string) {
        return this.request(`/workflows/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ updates, locale }),
        });
    }

    async deleteWorkflow(id: string) {
        return this.request(`/workflows/${id}`, { method: 'DELETE' });
    }

    async validateWorkflow(id: string, pipeline?: Record<string, any>) {
        return this.request(`/workflows/${id}/validate`, {
            method: 'POST',
            body: JSON.stringify({ pipeline }),
        });
    }

    async publishWorkflow(id: string, status: string) {
        return this.request(`/workflows/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    async listSnapshots(workflowId: string) {
        return this.request(`/workflows/${workflowId}/snapshots`);
    }

    async restoreSnapshot(workflowId: string, snapshotId: string) {
        return this.request(`/workflows/${workflowId}/snapshots`, {
            method: 'POST',
            body: JSON.stringify({ snapshotId }),
        });
    }

    // --- Draft Lifecycle ---

    async getDraft(workflowId: string) {
        return this.request(`/workflows/${workflowId}/draft`);
    }

    async promoteDraft(workflowId: string) {
        return this.request(`/workflows/${workflowId}/draft`, {
            method: 'POST',
        });
    }

    async discardDraft(workflowId: string) {
        return this.request(`/workflows/${workflowId}/draft`, {
            method: 'DELETE',
        });
    }

    // --- Executions ---

    async startWorkflow(id: string, input?: Record<string, any>, metadata?: Record<string, any>) {
        return this.request(`/workflows/${id}/start`, {
            method: 'POST',
            body: JSON.stringify({ input, metadata }),
        });
    }

    async listExecutions(workflowId: string, params?: {
        status?: string;
        limit?: number;
        nextToken?: string;
        direction?: 'asc' | 'desc';
    }) {
        const query = new URLSearchParams();
        if (params?.status) query.set('status', params.status);
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.nextToken) query.set('nextToken', params.nextToken);
        if (params?.direction) query.set('direction', params.direction);
        const qs = query.toString();
        return this.request(`/workflows/${workflowId}/executions${qs ? `?${qs}` : ''}`);
    }

    async getExecution(workflowId: string, executionId: string) {
        return this.request(`/workflows/${workflowId}/executions/${executionId}`);
    }

    async listTimelines(workflowId: string, executionId: string, params?: {
        limit?: number;
        nextToken?: string;
        direction?: 'asc' | 'desc';
    }) {
        const query = new URLSearchParams();
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.nextToken) query.set('nextToken', params.nextToken);
        if (params?.direction) query.set('direction', params.direction);
        const qs = query.toString();
        return this.request(`/workflows/${workflowId}/executions/${executionId}/timelines${qs ? `?${qs}` : ''}`);
    }

    async getTimeline(workflowId: string, executionId: string, timelineId: string) {
        return this.request(`/workflows/${workflowId}/executions/${executionId}/timelines/${timelineId}`);
    }

    async stopExecution(workflowId: string, executionId: string) {
        return this.request(`/workflows/${workflowId}/executions/${executionId}/stop`, {
            method: 'POST',
        });
    }

    async retryExecution(
        workflowId: string,
        executionId: string,
        options?: { timelineId?: string; forceWithoutCache?: boolean }
    ) {
        return this.request(`/workflows/${workflowId}/executions/${executionId}/retry`, {
            method: 'POST',
            body: JSON.stringify({
                timelineId: options?.timelineId,
                forceWithoutCache: options?.forceWithoutCache,
            }),
        });
    }

    // --- Apps ---

    async listApps() {
        return this.request('/apps');
    }

    async getAppActions(appId: string) {
        return this.request(`/apps/${appId}/actions`);
    }

    // --- Step Testing ---

    async testAppAction(appId: string, actionId: string, input?: Record<string, any>, bypassCache?: boolean) {
        return this.request('/step/test', {
            method: 'POST',
            body: JSON.stringify({ appId, actionId, input, bypassCache }),
        });
    }

    async testAiAction(
        template: string,
        variables?: Record<string, any>,
        responseStructure?: Record<string, any>,
        options?: { responseType?: string; systemPrompt?: string }
    ) {
        return this.request('/step/test-ai', {
            method: 'POST',
            body: JSON.stringify({
                template,
                variables,
                responseStructure,
                responseType: options?.responseType,
                systemPrompt: options?.systemPrompt,
            }),
        });
    }

    // --- Workflow Export/Import ---

    async exportWorkflow(id: string) {
        return this.request(`/workflows/${id}/export`);
    }

    async importWorkflow(exportData: Record<string, any>, locale?: string) {
        return this.request('/workflows/import', {
            method: 'POST',
            body: JSON.stringify({ export: exportData, locale }),
        });
    }

    // --- Workspace ---

    async getWorkspace() {
        return this.request('/workspace');
    }

    // --- Knowledge ---

    async listKnowledgeLists() {
        return this.request('/knowledge/lists');
    }

    async getKnowledgeRows(listKey: string, limit?: number) {
        const query = new URLSearchParams({ listKey });
        if (limit) query.set('limit', String(limit));
        return this.request(`/knowledge/rows?${query}`);
    }

    async getKnowledgeText(key: string) {
        const query = new URLSearchParams({ key });
        return this.request(`/knowledge/text?${query}`);
    }

    // --- Knowledge Graph ---

    async queryKgEdges(entityName?: string, relationshipType?: string, limit?: number) {
        const query = new URLSearchParams();
        if (entityName) query.set('entityName', entityName);
        if (relationshipType) query.set('relationshipType', relationshipType);
        if (limit) query.set('limit', String(limit));
        const qs = query.toString();
        return this.request(`/knowledge/graph/edges${qs ? `?${qs}` : ''}`);
    }

    async getScoringHistory(entityName?: string, limit?: number) {
        const query = new URLSearchParams();
        if (entityName) query.set('entityName', entityName);
        if (limit) query.set('limit', String(limit));
        const qs = query.toString();
        return this.request(`/knowledge/graph/scoring${qs ? `?${qs}` : ''}`);
    }

    // --- n8n Import ---

    async previewN8nImport(
        n8nJson: string | Record<string, any>,
        options?: Record<string, any>,
        workflow?: { name?: string; goal?: string; description?: string; pathname?: string }
    ) {
        return this.request('/workflows/import/n8n/preview', {
            method: 'POST',
            body: JSON.stringify({ n8nJson, options, workflow }),
        });
    }

    async importN8nWorkflow(
        n8nJson: string | Record<string, any>,
        workflow?: { name?: string; goal?: string; description?: string; pathname?: string },
        options?: Record<string, any>,
        locale?: string
    ) {
        return this.request('/workflows/import/n8n/create', {
            method: 'POST',
            body: JSON.stringify({ n8nJson, workflow, options, locale }),
        });
    }
}
