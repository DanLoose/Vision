import { env } from '../../config/env.js';
import type { JiraPort } from '../../application/ports/index.js';

export const jiraClient: JiraPort = {
  async createIssue(input) {
    const auth = Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64');
    const response = await fetch(`${env.JIRA_BASE_URL}/rest/api/3/issue`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { project: { key: env.JIRA_PROJECT_KEY }, summary: input.title, description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: input.description }] }] }, issuetype: { name: input.issueType }, priority: { name: input.priority } } })
    });
    if (!response.ok) throw new Error(`Jira create failed: ${response.status} ${await response.text()}`);
    const json = (await response.json()) as { key: string };
    return { key: json.key, url: `${env.JIRA_BASE_URL}/browse/${json.key}` };
  }
};
