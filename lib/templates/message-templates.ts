export const MESSAGE_TEMPLATES: Record<string, string> = {
  default: `
You are {{representative}} representing {{organization}}. Craft a {{tone}} message via {{channel}} ({{medium}}).
Audience: {{audience}}. Criticality: {{criticalityLevel}}.
Include components: {{components}}.
Context: {{reference}}

Goal: {{goal}}
  `.trim()
};

