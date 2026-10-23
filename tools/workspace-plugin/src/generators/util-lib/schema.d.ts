export interface UtilLibGeneratorSchema {
  platform: 'web' | 'api' | 'shared';
  domain: string;
  name?: string;
}
