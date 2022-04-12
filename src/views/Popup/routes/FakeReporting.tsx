import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../stores/reducers";
import { Button, Input, useInput, useToasts, useTheme } from "@geist-ui/react";
import { JWKInterface } from "arweave/node/lib/wallet";
import { VerifiedIcon } from "@primer/octicons-react";
import { arToFiat } from "../../../utils/currency";
import Arweave from "arweave";
import axios from "axios";
import WalletManager from "../../../components/WalletManager";
import styles from "../../../styles/views/Popup/send.module.sass";
import fakeNews, { ContractState } from "../../../background/fake_news";
import { getActiveTab } from "../../../utils/background";
import { Contract, SmartWeave } from "redstone-smartweave";

export interface FakeReporting {
  arweave: Arweave;
  smartweave: SmartWeave;
  fakeContractTxId: string;
  contract: Contract;
  addressKey: JWKInterface;
}
export default function FakeReporting({
  arweave,
  smartweave,
  fakeContractTxId,
  addressKey
}: FakeReporting) {
  const targetInput = useInput(""),
    dsptTokenSymbol = "TRUTH",
    dsptTokensAmount = useInput(""),
    expirationBlock = useInput(""),
    dsptStakeAmount = useInput(""),
    [currentTab, setCurrentTab] = useState<any>(null),
    [waitingForConfirmation, setWaitingForConfirmation] = useState(false),
    messageInput = useInput(""),
    arweaveConfig = useSelector((state: RootState) => state.arweave),
    // arweave = new Arweave(arweaveConfig),
    [fee, setFee] = useState("0"),
    profile = useSelector((state: RootState) => state.profile),
    wallets = useSelector((state: RootState) => state.wallets),
    currentWallet = wallets.find(({ address }) => address === profile),
    [tabUrl, setTabUrl] = useState<string | undefined>("https://google.com"),
    [dsptBalance, setDsptBalance] = useState(0),
    [submitted, setSubmitted] = useState(false),
    [loading, setLoading] = useState(false),
    [, setToast] = useToasts(),
    [arPriceFiat, setArPriceFiat] = useState(1),
    [verified, setVerified] = useState<{
      verified: boolean;
      icon: string;
      percentage: number;
    }>(),
    contract: Contract<ContractState> = smartweave
      .contract<ContractState>(fakeContractTxId)
      .connect(addressKey),
    [contractDisputes, setContractDisputes] = useState<any>([]),
    [pageAlreadyReported, setPageAlreadyReported] = useState<boolean>(false),
    [currentBlockHeight, setCurrentBlockHeight] = useState<number>(0);
  let { currency, feeMultiplier } = useSelector(
    (state: RootState) => state.settings
  );

  useEffect(() => {
    fetchContractDisputes();
    loadBlockHeight();
    loadDsptBalance();
    loadActiveTab();
    // eslint-disable-next-line
  }, [profile]);

  useEffect(() => {
    calculateFee();
    // eslint-disable-next-line
  }, [targetInput.state, messageInput.state, profile]);

  useEffect(() => {
    calculateArPriceInCurrency();
    // eslint-disable-next-line
  }, [currency]);

  useEffect(() => {
    setPageAlreadyReported(contractDisputes.some((r: any) => r.key === tabUrl));
  }, [tabUrl, contractDisputes]);

  async function calculateArPriceInCurrency() {
    setArPriceFiat(await arToFiat(1, currency));
  }

  async function loadActiveTab() {
    const currentTab = await getActiveTab();
    setCurrentTab(currentTab);
    const shortUrl = currentTab.url
      ? currentTab.url.split("?")[0]
      : currentTab.url;
    setTabUrl(shortUrl);
  }

  async function loadBlockHeight() {
    const info = await arweave.network.getInfo();
    const currentHeight = info.height;
    setCurrentBlockHeight(currentHeight);
  }

  async function fetchContractDisputes() {
    const result: any = await contract.readState();
    const disputes = new Map(Object.entries(result.state.disputes));

    setContractDisputes(
      Array.from(disputes, ([key, value]) => ({ key, value }))
    );

    const res: any = (
      await axios.get(
        "https://cache.redstone.tools/testnet/cache/state/EVOOm6UheQRmlz4Nr5nH2IXIWn4aBPoLsR2Tm7lF0kg"
      )
    ).data;

    console.log("state2", res.state);
    const fakeUrls = await fakeNews.loadFakePages(res.state);
    console.log("fakeUrls", fakeUrls);
  }

  async function loadDsptBalance() {
    try {
      const loadedDsptBalance = await fakeNews.getBalance(
        currentWallet?.address,
        contract
      );
      setDsptBalance(loadedDsptBalance);
    } catch {}
  }

  async function buttonClickedInFakeReportSection(
    dsptTokensAmount: number,
    expirationBlock: number
  ) {
    if (waitingForConfirmation) {
      if (dsptBalance < dsptTokensAmount) {
        setToast({
          type: "error",
          text: "You need to mint some tokens first!"
        });
        return;
      }
      if (!expirationBlock) {
        setToast({
          type: "error",
          text: "You need to type in expiration block"
        });
        return;
      }
      await fakeNews.reportPageAsFake(
        tabUrl,
        contract,
        expirationBlock,
        dsptTokensAmount
      );
      await arweave.api.get("mine");

      await fetchContractDisputes();
      setWaitingForConfirmation(false);
    } else {
      setWaitingForConfirmation(true);
    }
  }

  async function buttonClickedInVoteSection(
    disputeIdx: number,
    dsptStakeAmount: number,
    selectedOptionIndex: number
  ) {
    let voted: boolean = false;
    contractDisputes[disputeIdx].value.votes.forEach((v: any) => {
      if (Object.keys(v.votes).includes(profile)) {
        setToast({
          type: "error",
          text: "You've already voted for this dispute!"
        });
        voted = true;
        return;
      }
    });
    if (voted) {
      return;
    }
    if (!dsptStakeAmount || !expirationBlock) {
      setToast({
        type: "error",
        text: "You need to enter all required values"
      });
      return;
    }

    if (dsptBalance < dsptStakeAmount) {
      setToast({ type: "error", text: "You need to mint some tokens first!" });
      return;
    }
    const url = contractDisputes[disputeIdx].key;
    await fakeNews.vote(url, contract, dsptStakeAmount, selectedOptionIndex);
    await fetchContractDisputes();
  }

  async function buttonClickedInWithdrawRewardsSection(disputeIdx: number) {
    let voted: number = 0;
    contractDisputes[disputeIdx].value.votes.forEach((v: any) => {
      if (Object.keys(v.votes).includes(profile)) {
        voted++;
        return;
      }
    });
    if (!voted) {
      setToast({
        type: "error",
        text: "You are not authorized to withdraw reward."
      });
      return;
    }

    if (
      contractDisputes[disputeIdx].value.calculated &&
      !contractDisputes[disputeIdx].value.withdrawableAmounts.hasOwnProperty(
        profile
      )
    ) {
      setToast({
        type: "error",
        text: "You've lost the dispute."
      });
      return;
    }
    if (
      contractDisputes[disputeIdx].value.withdrawableAmounts.hasOwnProperty(
        profile
      ) &&
      contractDisputes[disputeIdx].value.withdrawableAmounts[profile] == 0
    ) {
      setToast({
        type: "error",
        text: "You've already withdrawn your reward."
      });
      return;
    }
    const disputeId = contractDisputes[disputeIdx].key;
    await fakeNews.withdrawRewards(contract, disputeId);
    await fetchContractDisputes();
    setToast({
      type: "success",
      text: `Your reward is: ${contractDisputes[disputeIdx].value.withdrawableAmounts[profile]}`
    });
  }

  async function calculateFee() {
    try {
      const messageSize = new TextEncoder().encode(messageInput.state).length,
        { data } = await axios.get(
          `https://arweave.net/price/${messageSize}/${targetInput.state}`
        );
      if (
        feeMultiplier < 1 ||
        feeMultiplier === undefined ||
        feeMultiplier === null
      )
        feeMultiplier = 1;
      setFee(
        arweave.ar.winstonToAr(
          (parseFloat(data as string) * feeMultiplier).toFixed(0)
        )
      );
    } catch {}
  }

  const subSectionStyles = {
    borderBottom: "1px solid #ddd",
    marginBottom: "10px"
  };

  const getVotesSum = (votes: object): number => {
    const sum = Object.values(votes).reduce((a, c) => a + c, 0);
    return sum;
  };
  return (
    <>
      <WalletManager />
      <div className={styles.View}>
        <div
          className={
            verified && verified.verified
              ? styles.Amount + " " + styles.Target
              : ""
          }
        >
          {/* Balance for disputes */}
          <div
            className="dspt-balance"
            style={{ textAlign: "center", ...subSectionStyles }}
          >
            <h2 style={{ marginBottom: "0px" }}>
              {dsptBalance} {dsptTokenSymbol}
              <span
                style={{
                  position: "relative",
                  left: "5px",
                  bottom: "8px"
                }}
              >
                <VerifiedIcon size={26} />
              </span>
            </h2>
            <div
              style={{
                textAlign: "center",
                color: "#777",
                marginBottom: "20px",
                fontSize: "14px"
              }}
            >
              Balance for fake reports
            </div>
          </div>

          {/* Report page as fake */}
          {pageAlreadyReported && (
            <div
              style={{
                fontSize: "14px",
                marginBottom: "10px",
                textAlign: "center",
                color: "grey"
              }}
            >
              Page already reported, please join in the dispute below.
              <br />
              <div
                style={{
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  fontWeight: "bold"
                }}
              >
                {tabUrl}
              </div>
            </div>
          )}
          {!pageAlreadyReported && (
            <div
              className="report-page-as-fake"
              style={{ ...subSectionStyles, color: "gray" }}
            >
              <div
                style={{
                  fontSize: "14px",
                  marginBottom: "10px",
                  textAlign: "center"
                }}
              >
                Do you want to report this page as fake?
                <br />
                <div
                  style={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                    fontWeight: "bold"
                  }}
                >
                  {tabUrl}
                </div>
              </div>
              {waitingForConfirmation && (
                <>
                  {" "}
                  <div style={{ marginBottom: "10px" }}>
                    <Input
                      {...dsptTokensAmount.bindings}
                      placeholder={`Initial stake amount`}
                      labelRight={dsptTokenSymbol}
                      htmlType="number"
                      min="0"
                    />
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <Input
                      {...expirationBlock.bindings}
                      placeholder={`Expiration blocks`}
                      htmlType="number"
                      min="0"
                    />
                  </div>
                </>
              )}

              <Button
                style={{ width: "100%", marginBottom: "10px" }}
                type="success"
                onClick={() =>
                  buttonClickedInFakeReportSection(
                    parseInt(dsptTokensAmount.state),
                    parseInt(expirationBlock.state)
                  )
                }
                loading={loading}
              >
                {waitingForConfirmation ? "Confirm fake report" : "Report fake"}
              </Button>
            </div>
          )}

          {/* Reports list */}
          <div className="fake-reports-list" style={{ ...subSectionStyles }}>
            <h4 style={{ textAlign: "center" }}>Fake reports</h4>
            {contractDisputes &&
              contractDisputes.map((dispute: any, disputeIdx: number) => (
                <div
                  style={{
                    padding: "10px",
                    borderRadius: "5px",
                    marginBottom: "10px",
                    color: "gray",
                    fontSize: "14px",
                    border: "1px solid #a99eec"
                  }}
                >
                  <div
                    style={{
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                      fontWeight: "bold"
                    }}
                  >
                    {dispute.key}
                  </div>
                  {dispute.value.votes.map((v: any, idx: any) => (
                    <div>
                      <hr />

                      <div style={{ display: "flex" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "10px",
                            marginRight: "0.5rem"
                          }}
                        >
                          <span style={{ textTransform: "uppercase" }}>
                            {v.label}
                          </span>
                          :{" "}
                          <strong style={{ marginLeft: "0.25rem" }}>
                            {getVotesSum(v.votes)}
                          </strong>
                          <br />
                        </div>
                        {
                          <>
                            <div style={{ marginBottom: "10px" }}>
                              <Input
                                {...dsptStakeAmount.bindings}
                                placeholder={`Amount`}
                                labelRight={dsptTokenSymbol}
                                htmlType="number"
                                min="0"
                              />
                            </div>
                          </>
                        }
                        <Button
                          style={{
                            minWidth: "auto",
                            lineHeight: "inherit",
                            height: "calc(2.5 * 14px)",
                            marginBottom: "10px",
                            marginLeft: "0.5rem"
                          }}
                          type="success"
                          disabled={
                            dispute.value.expirationBlock -
                              currentBlockHeight <=
                            0
                          }
                          onClick={() =>
                            buttonClickedInVoteSection(
                              disputeIdx,
                              parseInt(dsptStakeAmount.state),
                              idx
                            )
                          }
                          loading={loading}
                        >
                          Vote
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ alignItems: "center", display: "flex" }}>
                      <span>Blocks till withdraw: </span>
                      <strong style={{ marginLeft: "0.25rem" }}>
                        {dispute.value.expirationBlock - currentBlockHeight < 0
                          ? 0
                          : dispute.value.expirationBlock - currentBlockHeight}
                      </strong>
                    </div>

                    {
                      <Button
                        style={{ minWidth: "auto", marginBottom: "10px" }}
                        type="success"
                        disabled={
                          dispute.value.expirationBlock - currentBlockHeight > 0
                        }
                        onClick={() =>
                          buttonClickedInWithdrawRewardsSection(disputeIdx)
                        }
                        loading={loading}
                      >
                        Withdraw
                      </Button>
                    }
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
