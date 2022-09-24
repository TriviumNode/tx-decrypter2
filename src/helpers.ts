import { ContractInfo, fromUtf8, SecretNetworkClient, Tx } from 'secretjs';
import { MsgExecuteContractResponse } from 'secretjs/dist/protobuf_stuff/secret/compute/v1beta1/msg';
import textEncoding from 'text-encoding';

export let secretJs: SecretNetworkClient;
export let testnetJs: SecretNetworkClient;
export let mainnetWalletAddress: string;
export let pulsarWalletAddress: string;

export const TextDecoder = textEncoding.TextDecoder;

export interface MessageDetails {
  contract: string;
  msg: any;
  contract_info: ContractInfo;
  sent_funds: any;
  data_response?: any;
}

export const getMainnetClient = async () => {
  if (!window.keplr) {
    throw new Error('Keplr Wallet not found.');
  }

  const mainnetSigner = window.keplr.getOfflineSignerOnlyAmino(
    process.env.REACT_APP_CHAIN_ID
  );
  const [{ address: mainnetAddress }] = await mainnetSigner.getAccounts();

  const secretjs = await SecretNetworkClient.create({
    grpcWebUrl: process.env.REACT_APP_GRPC_URL,
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

  const testnetjs = await SecretNetworkClient.create({
    grpcWebUrl: process.env.REACT_APP_PULSAR_GRPC_URL,
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

export const processMessages = async (result: Tx) => {
  const messages: MessageDetails[] = [];

  for (let i = 0; i < result.tx.body.messages.length; i++) {
    const message = result.tx.body.messages[i];

    if (message.typeUrl !== '/secret.compute.v1beta1.MsgExecuteContract')
      continue;

    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    //@ts-ignore
    const messageLog = result.jsonLog[i].events.find(
      (a) => (a.type = 'message')
    )?.attributes;
    const contractAddress = messageLog?.find(
      (a) => a.key === 'contract_address'
    )?.value;

    if (!contractAddress) throw new Error('Something went wrong');

    const info = await secretJs.query.compute.contractInfo(contractAddress);

    let dstring;
    if (result.data[i]?.length)
      dstring = fromUtf8(
        MsgExecuteContractResponse.decode(result.data[i]).data
      );

    messages.push({
      contract: contractAddress,
      msg: message.value.msg,
      contract_info: info.ContractInfo,
      sent_funds: message.value.sentFunds,
      data_response: dstring && JSON.parse(dstring),
    });

    //const castring = MsgExecuteContractResponse.decode(message.value.sender);
    //console.log(castring);
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
