interface Addon {
  name: string;
  version: string;
  enabled: boolean;
  path: string;
  routes?: any;
  middleware?: any[];
  initialize?: () => Promise<void>;
}

export default Addon; 