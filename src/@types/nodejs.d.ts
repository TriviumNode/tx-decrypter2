declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_LCD_URL: string;
    REACT_APP_CHAIN_ID: string;
    REACT_APP_PULSAR_LCD_URL: string;
    REACT_APP_PULSAR_CHAIN_ID: string;
  }
}
