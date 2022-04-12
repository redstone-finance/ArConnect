// TODO: this module should be updated with real implementation

import Arweave from "arweave";
import { Contract } from "redstone-smartweave";

export interface Balance {
  balance: number;
  target: string;
  ticker: string;
}

interface BalanceInput {
  function: string;
  balance: {
    target: string;
  };
}

export interface ReportDetails {
  url: string;
  votesBalances: {
    fake: number;
    notFake: number;
  };
  canUserVote: boolean;
}

export interface ContractState {
  balances: Map<string, number>;
  canEvolve: boolean;
  evolve: string | null;
  name: string;
  owner: string;
  ticker: string;
  disputes: Map<string, Dispute>;
}

export interface Dispute {
  id: string;
  title: string;
  description: string;
  options: string[];
  votes: VoteOption[];
  expirationBlock: number;
  withdrawableAmounts: Map<string, number>;
  calculated: boolean;
}

export interface VoteOption {
  label: string;
  votes: Map<string, number>;
}

async function isPageAlreadyReported(
  url: string,
  contract: Contract<ContractState>
): Promise<boolean> {
  const reports = await getReports(contract);
  return reports.some((r) => r.key === url);
}

// It will send a SmartWeave transaction
async function reportPageAsFake(
  url: string | undefined,
  contract: Contract,
  expBlock: number,
  dsptTokensAmount?: number
): Promise<void> {
  await contract.writeInteraction({
    function: "createDispute",
    createDispute: {
      id: url,
      title: url,
      description: url,
      options: ["true", "false"],
      expirationBlocks: expBlock,
      ...(dsptTokensAmount
        ? {
            initialStakeAmount: {
              amount: dsptTokensAmount,
              optionIndex: 0
            }
          }
        : "")
    }
  });
}

// It will send a SmartWeave transaction
async function vote(
  url: string | undefined,
  contract: Contract,
  dsptTokensAmount: number,
  selectedOptionIndex: number
): Promise<void> {
  const result = await contract.writeInteraction({
    function: "vote",
    vote: {
      id: url,
      selectedOptionIndex: selectedOptionIndex,
      stakeAmount: dsptTokensAmount
    }
  });
}

async function withdrawRewards(
  contract: Contract,
  dsptId: string
): Promise<void> {
  await contract.writeInteraction({
    function: "withdrawReward",
    withdrawReward: {
      id: dsptId
    }
  });
}

async function getReports(
  contract: Contract<any>
): Promise<{ key: string; value: Dispute }[]> {
  const { state } = await contract.readState();
  const disputes = Array.from(state.disputes, ([key, value]) => ({
    key,
    value
  }));
  console.log("repors", disputes);
  return disputes;
}

async function getBalance(
  address: string | undefined,
  contract: Contract
): Promise<number> {
  if (address) {
    const result = await contract.viewState<BalanceInput, any>({
      function: "balance",
      balance: {
        target: address
      }
    });
    if (result.errorMessage) {
      return 0;
    }
    return result.result.balances.balance;
  } else {
    setToast({ type: "error", text: "Could not recognize address" });
    return 0;
  }
}

async function loadFakePages(result: any) {
  const disputes = new Map(Object.entries(result.disputes));

  const disputeArr = Array.from(disputes, ([key, value]) => ({ key, value }));

  const fakePages: string[] = [];
  disputeArr.forEach((d: any) => {
    if ((d.value.winningOption = "true")) {
      fakePages.push(d.key);
    }
  });
  return fakePages;
}

export default {
  reportPageAsFake,
  isPageAlreadyReported,
  getBalance,
  getReports,
  vote,
  withdrawRewards,
  loadFakePages
};
function setToast(arg0: {
  type: string;
  text: string;
}): number | PromiseLike<number> {
  throw new Error("Function not implemented.");
}
