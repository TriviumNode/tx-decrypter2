import { fromUtf8, SecretNetworkClient } from 'secretjs';
import textEncoding from 'text-encoding';
import { MsgExecuteContractResponse } from 'secretjs/dist/protobuf/secret/compute/v1beta1/msg';
import { ContractInfo } from 'secretjs/dist/protobuf/secret/compute/v1beta1/types';

export let secretJs: SecretNetworkClient;
export let testnetJs: SecretNetworkClient;
export let mainnetWalletAddress: string;
export let pulsarWalletAddress: string;

export const TextDecoder = textEncoding.TextDecoder;

export interface MessageDetails {
  contract?: string;
  msg: any;
  contract_info?: ContractInfo;
  sent_funds: any;
  data_response?: any;
  isDecrypted: boolean;
}

export const getMainnetClient = async () => {
  if (!window.keplr) {
    throw new Error('Keplr Wallet not found.');
  }

  const mainnetSigner = window.keplr.getOfflineSignerOnlyAmino(
    process.env.REACT_APP_CHAIN_ID
  );
  const [{ address: mainnetAddress }] = await mainnetSigner.getAccounts();

  const secretjs = new SecretNetworkClient({
    url: process.env.REACT_APP_LCD_URL,
    chainId: process.env.REACT_APP_CHAIN_ID,
    wallet: mainnetSigner,
    walletAddress: mainnetAddress,
    encryptionUtils: window.keplr.getEnigmaUtils(
      process.env.REACT_APP_CHAIN_ID
    ),
  });

  secretJs = secretjs;
  mainnetWalletAddress = mainnetAddress;
};

export const getPulsarClient = async () => {
  if (!window.keplr) {
    throw new Error('Keplr Wallet not found.');
  }

  const pulsarSigner = window.keplr.getOfflineSignerOnlyAmino(
    process.env.REACT_APP_CHAIN_ID
  );
  const [{ address: pulsarAddress }] = await pulsarSigner.getAccounts();

  const testnetjs = new SecretNetworkClient({
    url: process.env.REACT_APP_PULSAR_LCD_URL,
    chainId: process.env.REACT_APP_PULSAR_CHAIN_ID,
    wallet: pulsarSigner,
    walletAddress: pulsarAddress,
    encryptionUtils: window.keplr.getEnigmaUtils(
      process.env.REACT_APP_PULSAR_CHAIN_ID
    ),
  });

  testnetJs = testnetjs;
  pulsarWalletAddress = pulsarAddress;
};

export const processMessages = async (
  result: any,
  client: SecretNetworkClient
) => {
  const messages: MessageDetails[] = [];
  for (let i = 0; i < result.tx.body.messages.length; i++) {
    const message = result.tx.body.messages[i];

    if (message.typeUrl !== '/secret.compute.v1beta1.MsgExecuteContract')
      continue;

    const newMsg = message.value.msg;
    const keys = Object.keys(newMsg);
    console.log(newMsg[keys[0]]);
    if (Object.keys(newMsg[keys[0]]).includes('msg')) {
      console.log();
      try {
        const decoded = atob(newMsg[keys[0]].msg);
        newMsg[keys[0]].decoded_msg = decoded;

        const decodedJson = JSON.parse(decoded);
        newMsg[keys[0]].decoded_msg = decodedJson;
      } catch (error) {
        console.error(error);
      }
    }

    const isDecrypted =
      typeof message.value.msg === 'object' &&
      message.value.msg !== null &&
      !ArrayBuffer.isView(message.value.msg);

    if (result.code) {
      messages.push({
        msg: message.value.msg,
        sent_funds: message.value.sentFunds,
        isDecrypted
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
      //@ts-ignore
      const messageLog = result.jsonLog[i].events.find(
        (a: any) => (a.type = 'message')
      )?.attributes;
      const contractAddress = messageLog?.find(
        (a: any) => a.key === 'contract_address'
      )?.value;

      if (!contractAddress)
        throw new Error('Couldnt get contract address jsonLogs');

      const info = await client.query.compute.contractInfo(contractAddress);

      let dstring;
      if (result.data[i]?.length && isDecrypted)
        dstring = fromUtf8(
          MsgExecuteContractResponse.decode(result.data[i]).data
        );

      messages.push({
        contract: contractAddress,
        msg: message.value.msg,
        contract_info: info.ContractInfo as unknown as ContractInfo,
        sent_funds: message.value.sentFunds,
        data_response: dstring && JSON.parse(dstring),
        isDecrypted,
      });
    }
  }

  return messages;
};

export const suggestPulsar = async () => {
  if (!window.keplr) throw new Error('Keplr not Found');

  window.keplr.experimentalSuggestChain({
    chainId: 'pulsar-2',
    chainName: 'Secret Pulsar',
    rpc: 'https://rpc.pulsar.scrttestnet.com',
    rest: 'https://api.pulsar.scrttestnet.com',
    bip44: {
      coinType: 529,
    },
    coinType: 529,
    stakeCurrency: {
      coinDenom: 'SCRT',
      coinMinimalDenom: 'uscrt',
      coinDecimals: 6,
    },
    bech32Config: {
      bech32PrefixAccAddr: 'secret',
      bech32PrefixAccPub: 'secretpub',
      bech32PrefixValAddr: 'secretvaloper',
      bech32PrefixValPub: 'secretvaloperpub',
      bech32PrefixConsAddr: 'secretvalcons',
      bech32PrefixConsPub: 'secretvalconspub',
    },
    currencies: [
      {
        coinDenom: 'SCRT',
        coinMinimalDenom: 'uscrt',
        coinDecimals: 6,
      },
    ],
    feeCurrencies: [
      {
        coinDenom: 'SCRT',
        coinMinimalDenom: 'uscrt',
        coinDecimals: 6,
      },
    ],
    //@ts-expect-error
    gasPriceStep: {
      low: 0.1,
      average: 0.25,
      high: 0.4,
    },
    features: ['secretwasm', 'ibc-transfer', 'ibc-go'],
  });
};
