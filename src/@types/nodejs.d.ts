declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_GRPC_URL: string;
    REACT_APP_CHAIN_ID: string;
    REACT_APP_PULSAR_GRPC_URL: string;
    REACT_APP_PULSAR_CHAIN_ID: string;
  }
}
