interface ReportDetails {
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

async function getReports(address?: string): Promise<ReportDetails[]> {
  await sleep(500);
  return [
    {
      url: "fake.com",
      votesBalances: {
        fake: 9997,
        notFake: 123
      },
      canUserVote: true
    },
    {
      url: "example.com",
      votesBalances: {
        fake: 9997,
        notFake: 123
      },
      canUserVote: true
    }
  ];
}

async function getBalance(address: string): Promise<number> {
  await sleep(500);
  return 999;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadFakePages() {
  await sleep(500);
  return ["https://fake.com", "https://example.com"];
}

export default {
  isPageAlreadyReported,
  loadFakePages,
  getBalance,
  getReports
};
