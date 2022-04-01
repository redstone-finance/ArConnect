import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../stores/reducers";
import {
  Button,
  Input,
  Spacer,
  useInput,
  useToasts,
  Tooltip,
  Progress,
  useTheme
} from "@geist-ui/react";
import { goTo } from "react-chrome-extension-router";
import { JWKInterface } from "arweave/node/lib/wallet";
import { QuestionIcon, VerifiedIcon } from "@primer/octicons-react";
import { arToFiat, getSymbol } from "../../../utils/currency";
import { Threshold, getVerification } from "arverify";
import { AnimatePresence, motion } from "framer-motion";
import { checkPassword } from "../../../utils/auth";
import manifest from "../../../../public/manifest.json";
import Home from "./Home";
import Arweave from "arweave";
import axios from "axios";
import WalletManager from "../../../components/WalletManager";
import styles from "../../../styles/views/Popup/send.module.sass";
import fakeNews, { ReportDetails } from "../../../background/fake_news";
import { getActiveTab } from "../../../utils/background";

export default function FakeReporting() {
  const targetInput = useInput(""),
    dsptTokenSymbol = "TRUTH",
    dsptTokensAmount = useInput(""),
    [fakeReports, setFakeReports] = useState<ReportDetails[]>([]),
    [currentTab, setCurrentTab] = useState<any>(null),
    [waitingForConfirmation, setWaitingForConfirmation] = useState(false),
    messageInput = useInput(""),
    arweaveConfig = useSelector((state: RootState) => state.arweave),
    arweave = new Arweave(arweaveConfig),
    [fee, setFee] = useState("0"),
    profile = useSelector((state: RootState) => state.profile),
    currentWallet = useSelector((state: RootState) => state.wallets).find(
      ({ address }) => address === profile
    )?.keyfile,
    [tabUrl, setTabUrl] = useState<string | undefined>("https://google.com"),
    [pageAlreadyReported, setPageAlreadyReported] = useState(false),
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
    { arVerifyTreshold } = useSelector((state: RootState) => state.settings),
    geistTheme = useTheme(),
    passwordInput = useInput("");
  let { currency, feeMultiplier } = useSelector(
    (state: RootState) => state.settings
  );

  useEffect(() => {
    loadDsptBalance();
    loadFakeReports();
    loadActiveTab();
    // eslint-disable-next-line
  }, [profile]);

  useEffect(() => {
    calculateFee();
    // checkVerification();
    // eslint-disable-next-line
  }, [targetInput.state, messageInput.state, profile]);

  useEffect(() => {
    calculateArPriceInCurrency();
    // eslint-disable-next-line
  }, [currency]);

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

  // async function loadBalance() {
  //   try {
  //     const arBalance = arweave.ar.winstonToAr(
  //       await arweave.wallets.getBalance(profile)
  //     );

  //     setBalance(arBalance);
  //   } catch {}
  // }

  async function loadDsptBalance() {
    try {
      const loadedDsptBalance = await fakeNews.getBalance(profile);
      setDsptBalance(loadedDsptBalance);
    } catch {}
  }

  async function loadFakeReports() {
    const loadedFakeReports = await fakeNews.getReports(profile);
    setFakeReports(loadedFakeReports);
  }

  async function buttonClickedInFakeReportSection() {
    if (waitingForConfirmation) {
      // Confirmation received
      // TODO: send transaction
    } else {
      setWaitingForConfirmation(true);
    }
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
          {!pageAlreadyReported && (
            <div
              className="report-page-as-fake"
              style={{ ...subSectionStyles, color: "gray" }}
            >
              <div style={{ fontSize: "14px", marginBottom: "10px" }}>
                Do you want to report this page as fake?
                <br />
                URL: <strong>{tabUrl}</strong>
              </div>
              {waitingForConfirmation && (
                <div style={{ marginBottom: "10px" }}>
                  <Input
                    {...dsptTokensAmount.bindings}
                    placeholder={`Initial stake amount`}
                    labelRight={dsptTokenSymbol}
                    htmlType="number"
                    min="0"
                  />
                </div>
              )}
              <Button
                style={{ width: "100%", marginBottom: "10px" }}
                type="success"
                onClick={buttonClickedInFakeReportSection}
                loading={loading}
              >
                {waitingForConfirmation ? "Confirm fake report" : "Report fake"}
              </Button>
            </div>
          )}

          {/* Reports list */}
          <div className="fake-reports-list" style={{ ...subSectionStyles }}>
            <h4>Fake reports</h4>
            {fakeReports.map((report) => (
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
                URL: <strong>{report.url}</strong>
                <br />
                Votes (fake): <strong>{report.votesBalances.fake}</strong>
                <br />
                Votes (not fake):{" "}
                <strong>{report.votesBalances.notFake}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
