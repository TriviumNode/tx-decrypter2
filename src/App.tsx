import React, { FormEvent, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  Accordion,
  Button,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from 'react-bootstrap';
import { Tx } from 'secretjs';
import { toast } from 'react-toastify';
import ReactJson from 'react-json-view';
import {
  secretJs,
  MessageDetails,
  processMessages,
  getMainnetClient,
  mainnetWalletAddress,
  testnetJs,
  getPulsarClient,
  suggestPulsar,
} from './helpers';

function App() {
  const [txHash, setTxHash] = useState('');
  const [hashResult, setHashResult] = useState<Tx>();
  const [messageDetails, setMessageDetails] = useState<MessageDetails[]>([]);
  const [network, setNetwork] = useState('secret-4');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (testnet = false) => {
    try {
      if (!window.keplr) {
        toast.error('Keplr Wallet not found.');
        return;
      }

      setLoading(true);
      setHashResult(undefined);
      setMessageDetails([]);

      let client;

      if (testnet) {
        await suggestPulsar();
        await window.keplr.enable(process.env.REACT_APP_PULSAR_CHAIN_ID);
        if (!testnetJs) {
          await getPulsarClient();
        }
        client = testnetJs;
      } else {
        await window.keplr.enable(process.env.REACT_APP_CHAIN_ID);

        if (!secretJs) {
          await getMainnetClient();
        }
        client = secretJs;
      }

      const result = await client.query.getTx(txHash);
      if (result) setHashResult(result);
      else throw new Error('No Result Returned');

      const messages = await processMessages(result, client);
      setMessageDetails(messages);
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.toString());
      setLoading(false);
    }
  };

  const handleDecrypt = async (
    e:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (network === 'pulsar-2') handleLookup(true);
    else handleLookup(false);
  };

  return (
    <Container>
      <Row className="justify-content-end">
        <Col xs={'auto'} className="text-center">
          <h4>Select Network</h4>
          <Form.Select
            aria-label="Network Selector"
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
          >
            <option value={'secret-4'}>Mainnet secret-4</option>
            <option value={'pulsar-2'}>Testnet pulsar-2</option>
          </Form.Select>
        </Col>
      </Row>
      <Row>
        <Col xs={{ span: 12, offset: 0 }} md={{ span: 8, offset: 2 }}>
          <Form style={{ marginTop: '4rem' }}>
            <Form.Group className="mb-3" controlId="formBasicEmail">
              <Form.Label>Transaction Hash</Form.Label>
              <Form.Control
                placeholder="A1B2C3D4..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />
            </Form.Group>
            <Row className="justify-content-end">
              <Col xs="auto">
                <Button
                  variant="primary"
                  type="submit"
                  onClick={handleDecrypt}
                  disabled={loading}
                >
                  Decrypt {loading && <Spinner animation="border" size="sm" />}
                </Button>
              </Col>
              {/* <Col xs="auto">
                <h3>or</h3>
              </Col>
              <Col xs="auto">
                <Button variant="primary" type="submit">
                  View Recent TXs
                </Button>
              </Col> */}
            </Row>
          </Form>
        </Col>
      </Row>
      <Row className="mt-4 text-center">
        <Col xs={{ span: 12, offset: 0 }} md={{ span: 10, offset: 1 }}>
          <h5>
            Values will only be decrypted if you were the original sender and
            the encryption key matches Keplr's encryption key.
          </h5>
          <h5>
            Transactions sent with other wallets can not be decrypted by this
            tool.
          </h5>
        </Col>
      </Row>

      {!!hashResult?.code && <Row  className="mt-4">
        <h3>Transaction Error:</h3>
        <ReactJson src={hashResult?.jsonLog as object} name="Error Log" />
        </Row>}

      {!!messageDetails.length && (
        <Row className="mt-4">
          <h3>Contract Execution Messages</h3>
          <h6 className="mx-2">
            Non-contract messages are not shown in this section.
          </h6>
          <Accordion defaultActiveKey="0">
            {messageDetails.map((a, i) => {
              return (
                <Accordion.Item eventKey={i.toString()}>
                  <Accordion.Header>
                    Message #{i + 1}{' '}
                    {!!a.contract_info?.label && <>- {a.contract_info.label}</>}
                  </Accordion.Header>
                  <Accordion.Body>
                    <Row className="my-1 mx-4 d-inline-block">
                      <span style={{ fontWeight: '600' }}>
                        Contract Address:
                      </span>{' '}
                      {a.contract}
                    </Row>{' '}
                    <br />
                    {!!a.contract_info?.label && (
                      <>
                        <Row className="my-1 mx-4 d-inline-block">
                          <span style={{ fontWeight: '600' }}>
                            Contract Label:
                          </span>{' '}
                          {a.contract_info.label}
                        </Row>
                      </>
                    )}
                    {!ArrayBuffer.isView(a.msg) && (
                      <Row className="mt-4 mb-2 mx-3">
                        <ReactJson
                          src={a.msg}
                          collapsed={false}
                          name="Request Message"
                        />
                      </Row>
                    )}
                    {typeof a.data_response === 'object' &&
                      a.data_response !== null &&
                      !ArrayBuffer.isView(a.data_response) && (
                        <Row className="mt-4 mb-2 mx-3">
                          <ReactJson
                            src={a.data_response}
                            collapsed={true}
                            name="Response Data"
                          />
                        </Row>
                      )}
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </Row>
      )}

      {!!hashResult && (
        <Row className="mt-4">
          <h3>Full Transaction</h3>
          <ReactJson src={hashResult} />
        </Row>
      )}
    </Container>
  );
}

export default App;
