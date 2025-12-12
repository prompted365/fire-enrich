export type EnvironmentStatus = {
  FIRECRAWL_API_KEY: boolean;
  OPENAI_API_KEY: boolean;
};

export const getEnvironmentStatus = async (): Promise<EnvironmentStatus | null> => {
  try {
    const response = await fetch('/api/check-env');
    if (!response.ok) {
      throw new Error('Failed to check environment');
    }

    const data = await response.json();
    return data.environmentStatus as EnvironmentStatus;
  } catch (error) {
    console.error('Error checking environment:', error);
    return null;
  }
};
