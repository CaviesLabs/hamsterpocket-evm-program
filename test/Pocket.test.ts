import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { HamsterSwap } from "../typechain-types";

/**
 * @dev Define the item type
 */
enum SwapItemType {
  Nft,
  Currency,
}

/**
 * @dev Define status enum
 */
enum SwapItemStatus {
  Created,
  Deposited,
  Redeemed,
  Withdrawn,
}

/**
 * @dev Define proposal status
 */
enum ProposalStatus {
  Created,
  Deposited,
  Fulfilled,
  Canceled,
  Redeemed,
  Withdrawn,
}

describe("HamsterSwap", async function () {
  let fixtures: Awaited<ReturnType<typeof deployFixtures>>;

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployFixtures() {
    /**
     * @dev Initializes mocked erc contracts
     */
    const MockedERC20Contract = await ethers.getContractFactory("MockedERC20");
    const MockedERC20 = await MockedERC20Contract.deploy();

    const MockedERC721Contract = await ethers.getContractFactory(
      "MockedERC721"
    );
    const MockedERC721 = await MockedERC721Contract.deploy();

    /**
     * @dev Mint erc721
     */
    const [owner, seller, buyer] = await ethers.getSigners();
    await MockedERC721.connect(owner).safeMint(buyer.address, "1");
    await MockedERC721.connect(owner).safeMint(seller.address, "2");

    /**
     * @dev Funding erc20
     */
    await MockedERC20.connect(owner).transfer(
      seller.address,
      ethers.BigNumber.from(ethers.constants.WeiPerEther).mul(20)
    );

    /**
     * @dev Deploy contract
     */
    const SwapContract = await ethers.getContractFactory("HamsterSwap");
    const Swap = (await upgrades.deployProxy(SwapContract, [], {
      unsafeAllowCustomTypes: true,
    })) as HamsterSwap;

    /**
     * @dev Configure registry
     */
    await Swap.connect(owner).configure(
      "3",
      "4",
      [MockedERC721.address, MockedERC20.address],
      []
    );

    /**
     * @dev return
     */
    return { Swap, MockedERC20, MockedERC721, owner, seller, buyer };
  }

  before(async () => {
    fixtures = await loadFixture(deployFixtures);
  });

  it("Should: admin can configure pocket registry", async function () {
    const { Swap, MockedERC20, MockedERC721 } = fixtures;

    /**
     * @dev Expect
     */
    expect(await Swap.whitelistedAddresses(MockedERC721.address)).to.be.true;
    expect(await Swap.whitelistedAddresses(MockedERC20.address)).to.be.true;
    expect(await Swap.maxAllowedItems()).to.eq("3");
    expect(await Swap.maxAllowedOptions()).to.eq("4");
  });

  it("Should: anyone can create proposal and deposit items", async () => {
    const { Swap, MockedERC20, MockedERC721, seller } = fixtures;

    /**
     * @dev Approve first
     */
    await MockedERC20.connect(seller).approve(
      Swap.address,
      ethers.BigNumber.from(ethers.constants.MaxInt256)
    );
    await MockedERC721.connect(seller).setApprovalForAll(Swap.address, true);

    /**
     * @dev Expect initial values
     */
    expect(await MockedERC20.balanceOf(seller.address)).eq(
      ethers.BigNumber.from(ethers.constants.WeiPerEther).mul(20)
    );
    expect(await MockedERC721.balanceOf(seller.address)).eq(1);
    expect(await MockedERC721.ownerOf(2)).eq(seller.address);

    expect(await MockedERC20.balanceOf(Swap.address)).eq(0);
    expect(await MockedERC721.balanceOf(Swap.address)).eq(0);

    /**
     * @dev Create and deposit proposal
     */
    const proposalId = "proposal_1";
    const offeredItems = [
      {
        id: "offeredItem_1",
        contractAddress: MockedERC20.address,
        itemType: SwapItemType.Currency,
        amount: ethers.BigNumber.from((10 * 10 ** 18).toString()),
        tokenId: 1,
      },
      {
        id: "offeredItem_2",
        contractAddress: MockedERC20.address,
        itemType: SwapItemType.Currency,
        amount: ethers.BigNumber.from((10 * 10 ** 18).toString()),
        tokenId: 1,
      },
      {
        id: "offeredItem_3",
        contractAddress: MockedERC721.address,
        itemType: SwapItemType.Nft,
        amount: 1,
        tokenId: 2,
      },
    ];
    const askingItems = [
      {
        id: "option_1",
        askingItems: [
          {
            id: "askingItem_1",
            contractAddress: MockedERC721.address,
            amount: 1,
            tokenId: 1,
            itemType: SwapItemType.Nft,
          },
        ],
      },
      {
        id: "option_2",
        askingItems: [
          {
            id: "askingItem_2",
            contractAddress: MockedERC20.address,
            amount: 1,
            tokenId: 1,
            itemType: SwapItemType.Currency,
          },
        ],
      },
    ];
    const expiredAt =
      parseInt((new Date().getTime() / 1000).toString()) + 60 * 60;

    /**
     * @dev Call contract
     */
    await Swap.connect(seller).createProposal(
      proposalId,
      offeredItems,
      askingItems,
      expiredAt
    );

    /**
     * @dev Expect
     */
    const proposal = await Swap.proposals(proposalId);

    /**
     * @dev Expect initial values
     */
    expect(proposal.id).eq(proposalId);
    expect(proposal.status).eq(ProposalStatus.Deposited); // which means the status is deposited
    expect(proposal.expiredAt).eq(expiredAt);
    expect(proposal.owner).eq(seller.address);
    expect(proposal.fulfilledBy).eq(ethers.constants.AddressZero);
    expect(proposal.fulfilledByOptionId).eq("");

    /**
     * @dev Expect items and options
     */
    const [items, options] = await Swap.getProposalItemsAndOptions(proposalId);

    /**
     * @dev Expect offered items have been recoded properly
     */
    offeredItems.map((item, index) => {
      expect(item.id).eq(items[index].id);
      expect(item.itemType).eq(items[index].itemType);
      expect(item.amount).eq(items[index].amount);
      expect(item.contractAddress).eq(items[index].contractAddress);
      expect(items[index].owner).eq(seller.address); // owner is recorded properly
      expect(items[index].status).eq(ProposalStatus.Deposited); // status changed to deposited

      if (item.itemType === 1) {
        expect(items[index].tokenId).eq(0);
      } else {
        expect(item.tokenId).eq(items[index].tokenId);
      }
    });

    /**
     * @dev Expect options have been recorded properly
     */
    askingItems.map((elm, index) => {
      expect(elm.id).eq(options[index].id);

      elm.askingItems.map((item, itemIndex) => {
        expect(item.id).eq(options[index].askingItems[itemIndex].id);
        expect(item.itemType).eq(
          options[index].askingItems[itemIndex].itemType
        );
        expect(item.amount).eq(options[index].askingItems[itemIndex].amount);
        expect(item.contractAddress).eq(
          options[index].askingItems[itemIndex].contractAddress
        );
        expect(item.tokenId).eq(options[index].askingItems[itemIndex].tokenId);

        expect(options[index].askingItems[itemIndex].status).eq(
          ProposalStatus.Created
        ); // status has been recoded as created
        expect(options[index].askingItems[itemIndex].owner).eq(
          ethers.constants.AddressZero
        ); // status has been recoded as created
      });
    });

    /**
     * @dev After transferring to the contract, the balance will be empty
     */
    expect(await MockedERC20.balanceOf(seller.address)).eq(0);
    expect(await MockedERC721.balanceOf(seller.address)).eq(0);

    expect(await MockedERC20.balanceOf(Swap.address)).eq(
      ethers.BigNumber.from(ethers.constants.WeiPerEther).mul(20)
    );
    expect(await MockedERC721.balanceOf(Swap.address)).eq(1);
    expect(await MockedERC721.ownerOf(2)).eq(Swap.address);
  });

  it("should: anyone can fulfill proposal if he/she owns the required items and exec the pocket", async () => {
    const { Swap, MockedERC20, MockedERC721, seller, buyer } = fixtures;

    /**
     * @dev Before fulfilling the proposal, the balance will be empty
     */
    expect(await MockedERC20.balanceOf(buyer.address)).eq(0);
    expect(await MockedERC721.balanceOf(buyer.address)).eq(1);
    expect(await MockedERC721.ownerOf(1)).eq(buyer.address);

    expect(await MockedERC20.balanceOf(seller.address)).eq(0);
    expect(await MockedERC721.balanceOf(seller.address)).eq(0);

    expect(await MockedERC20.balanceOf(Swap.address)).eq(
      ethers.BigNumber.from(ethers.constants.WeiPerEther).mul(20)
    );
    expect(await MockedERC721.balanceOf(Swap.address)).eq(1);
    expect(await MockedERC721.ownerOf(2)).eq(Swap.address);

    /**
     * @dev Approve first
     */
    await MockedERC721.connect(buyer).setApprovalForAll(Swap.address, true);

    /**
     * @dev Call contract
     */
    await Swap.connect(buyer).fulfillProposal("proposal_1", "option_1");

    /**
     * @dev Expect
     */
    const proposal = await Swap.proposals("proposal_1");
    const [items, options] = await Swap.getProposalItemsAndOptions(
      "proposal_1"
    );

    expect(proposal.status).eq(ProposalStatus.Redeemed); // Redeemed
    expect(proposal.fulfilledByOptionId).eq("option_1");
    expect(proposal.fulfilledBy).eq(buyer.address);

    /**
     * @dev Expect offered items have been recoded properly
     */
    items.map((item, index) => {
      expect(items[index].owner).eq(seller.address); // owner is recorded properly
      expect(items[index].status).eq(SwapItemStatus.Redeemed); // status changed to REDEEMED
    });

    /**
     * @dev Expect options have been recorded properly
     */
    options
      .filter((elm) => elm.id === "option_1")
      .map((elm, index) => {
        elm.askingItems.map((item, itemIndex) => {
          expect(options[index].askingItems[itemIndex].status).eq(
            SwapItemStatus.Redeemed
          ); // status has been recoded as REDEEMED
          expect(options[index].askingItems[itemIndex].owner).eq(buyer.address); // owner has been updated to buyer address
        });
      });

    /**
     * @dev Before fulfilling the proposal, the balance will be empty
     */
    expect(await MockedERC20.balanceOf(buyer.address)).eq(
      ethers.BigNumber.from(ethers.constants.WeiPerEther).mul(20)
    );
    expect(await MockedERC721.balanceOf(buyer.address)).eq(1);
    expect(await MockedERC721.ownerOf(2)).eq(buyer.address);

    expect(await MockedERC20.balanceOf(seller.address)).eq(0);
    expect(await MockedERC721.balanceOf(seller.address)).eq(1);
    expect(await MockedERC721.ownerOf(1)).eq(seller.address);

    expect(await MockedERC20.balanceOf(Swap.address)).eq(0);
    expect(await MockedERC721.balanceOf(Swap.address)).eq(0);
  });

  it("should: non-proposal owner cannot cancel proposal", async () => {
    const { Swap, MockedERC20, MockedERC721, seller, owner, buyer } = fixtures;

    /**
     * @dev Funding erc20
     */
    await MockedERC20.connect(owner).transfer(
      seller.address,
      ethers.BigNumber.from(ethers.constants.WeiPerEther).mul(10)
    );

    /**
     * @dev Create and deposit proposal
     */
    const proposalId = "proposal_2";
    const offeredItems = [
      {
        id: "offeredItem_4",
        contractAddress: MockedERC20.address,
        itemType: 1,
        amount: ethers.BigNumber.from(ethers.constants.WeiPerEther).mul(10),
        tokenId: 1,
      },
    ];
    const askingItems = [
      {
        id: "option_3",
        askingItems: [
          {
            id: "askingItem_5",
            contractAddress: MockedERC721.address,
            amount: 1,
            tokenId: 1,
            itemType: 0,
          },
        ],
      },
    ];
    const expiredAt =
      parseInt((new Date().getTime() / 1000).toString()) + 60 * 60;

    /**
     * @dev Call contract
     */
    await Swap.connect(seller).createProposal(
      proposalId,
      offeredItems,
      askingItems,
      expiredAt
    );

    expect(await MockedERC20.balanceOf(seller.address)).eq(0);

    /**
     * @dev Cannot cancel the redeemed proposal
     */
    try {
      await Swap.connect(buyer).cancelProposal("proposal_2");
      throw new Error("Should failed");
    } catch (e: any) {
      expect(
        e
          .toString()
          .includes(
            "Error: VM Exception while processing transaction: reverted with panic code 0x1"
          )
      ).eq(true);
    }
  });

  it("shoud: proposan owner can cancel proposal", async () => {
    const { Swap, MockedERC20, seller } = fixtures;

    /**
     * @dev Cancel
     */
    await Swap.connect(seller).cancelProposal("proposal_2");

    const proposal = await Swap.proposals("proposal_2");
    const [items] = await Swap.getProposalItemsAndOptions("proposal_2");

    expect(proposal.status).eq(5); // Canceled

    /**
     * @dev Expect offered items have been recoded properly
     */
    items.map((item, index) => {
      expect(items[index].owner).eq(seller.address); // owner is recorded properly
      expect(items[index].status).eq(SwapItemStatus.Withdrawn);
    });

    expect(await MockedERC20.balanceOf(seller.address)).eq(
      ethers.BigNumber.from(ethers.constants.WeiPerEther).mul(10)
    );
  });

  it("should: proposal owner cannot cancel the completed proposal", async () => {
    const { Swap, seller } = fixtures;

    /**
     * @dev Cannot cancel the redeemed proposal
     */
    try {
      await Swap.connect(seller).cancelProposal("proposal_1");
      throw new Error("Should failed");
    } catch (e: any) {
      expect(
        e
          .toString()
          .includes(
            "Error: VM Exception while processing transaction: reverted with panic code 0x1"
          )
      ).eq(true);
    }
  });

  it("should: proposal owner cannot cancel the withdrawn proposal", async () => {
    const { Swap, seller } = fixtures;

    /**
     * @dev Cannot cancel the redeemed proposal
     */
    try {
      await Swap.connect(seller).cancelProposal("proposal_2");
      throw new Error("Should failed");
    } catch (e: any) {
      expect(
        e
          .toString()
          .includes(
            "Error: VM Exception while processing transaction: reverted with panic code 0x1"
          )
      ).eq(true);
    }
  });
});
