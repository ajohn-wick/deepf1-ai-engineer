export type WebExperience = {
    title: string;
    subtitle: string;
    welcomeMessage: string;
}

export type CognitoAuthConfig = {
    userPoolId: string;
    identityPoolId: string;
}
export type AnonymousAuthConfig = {
    roleArn: string;
}

export type UIConfig = {
    floatingWindow: boolean;
    logoUrl?: string;
    containerId?: string;
    webExperience?: WebExperience;
}

export type BedrockAgentConfig = {
    agentId: string;
    agentAliasId: string;
}

export type BedrockConfig = {
    region: string;
    modelId?: string;
    agent?: BedrockAgentConfig;
}
export type AuthConfig = {
    region: string;
    cognito: CognitoAuthConfig
}
export type Config = {
    auth: AuthConfig;
    bedrock: BedrockConfig;
    ui: UIConfig;
    context?: string;
}