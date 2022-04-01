// TODO: this module should be updated with real implementation

export interface ReportDetails {
  url: string;
  votesBalances: {
    fake: number;
    notFake: number;
  };
  canUserVote: boolean;
}

async function isPageAlreadyReported(url: string): Promise<boolean> {
  const reports = await getReports();
  return reports.some((r) => r.url === url);
}

// It will send a SmartWeave transaction
async function reportPageAsFake(url: string): Promise<void> {
  await sleep(2000);
}

async function getReports(address?: string): Promise<ReportDetails[]> {
  await sleep(500);
  return [
    {
      url: "https://fake.com",
      votesBalances: {
        fake: 9997,
        notFake: 123
      },
      canUserVote: true
    },
    {
      url: "https://example.com",
      votesBalances: {
        fake: 997,
        notFake: 123
      },
      canUserVote: true
    },
    {
      url: "https://hehe.com",
      votesBalances: {
        fake: 997,
        notFake: 123
      },
      canUserVote: true
    },
    {
      url: "https://redddstone.finance",
      votesBalances: {
        fake: 1097,
        notFake: 230
      },
      canUserVote: true
    }
  ];
}

async function getBalance(address: string): Promise<number> {
  await sleep(500);
  if (address.endsWith("dw")) {
    return 999;
  } else {
    return 10000;
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadFakePages() {
  await sleep(500);
  return ["https://fake.com", "https://example.com"];
}

export default {
  reportPageAsFake,
  isPageAlreadyReported,
  loadFakePages,
  getBalance,
  getReports
};
