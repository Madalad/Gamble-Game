const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("GambleGame", async function () {
          let gambleGame;
          let deployer;
          let vrfCoordinatorV2Mock;
          const fundAmount = ethers.utils.parseEther("1");
          const betAmount = ethers.utils.parseEther("0.1");

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              gambleGame = await ethers.getContract("GambleGame", deployer);
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              );

              const subscriptionTx =
                  await vrfCoordinatorV2Mock.createSubscription();
              const txReceipt = await subscriptionTx.wait(1);

              await vrfCoordinatorV2Mock.fundSubscription(
                  1,
                  ethers.utils.parseEther("7")
              );
          });

          describe("constructor", async function () {
              it("constructor sets state variables correctly", async function () {
                  let response;
                  response = await gambleGame.keyHash();
                  assert.equal(response, network.config.keyHash);
                  response = await gambleGame.subscriptionId();
                  assert.equal(response, network.config.subscriptionId);
                  response = await gambleGame.coordinatorAddress();
                  assert.equal(response, vrfCoordinatorV2Mock.address);
              });
          });

          describe("fund", async function () {
              it("fund works properly", async function () {
                  await gambleGame.fund({ value: fundAmount });
                  const balance = await gambleGame.getBalance();
                  assert.equal(fundAmount.toString(), balance.toString());
              });
              it("only the owner can fund the contract", async function () {
                  const accounts = await ethers.getSigners();
                  const gambleGameConnectedContract = await gambleGame.connect(
                      accounts[1]
                  );
                  await expect(
                      gambleGameConnectedContract.fund({ value: fundAmount })
                  ).to.be.revertedWith(
                      "Only the owner can call this function!"
                  );
              });
          });

          describe("withdraw", async function () {
              beforeEach(async function () {
                  await gambleGame.fund({ value: fundAmount });
              });
              it("can withdraw", async function () {
                  const startingContractBalance = await gambleGame.getBalance();
                  const startingDeployerBalance =
                      await gambleGame.provider.getBalance(deployer);

                  const transactionResponse = await gambleGame.withdraw(
                      startingContractBalance
                  );
                  const transactionReceipt = await transactionResponse.wait(1);
                  const { gasUsed, effectiveGasPrice } = transactionReceipt;
                  const gasCost = gasUsed.mul(effectiveGasPrice);

                  const endingContractBalance = await gambleGame.getBalance();
                  const endingDeployerbalance =
                      await gambleGame.provider.getBalance(deployer);

                  assert.equal(endingContractBalance.toString(), "0");
                  assert.equal(
                      startingContractBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingContractBalance
                          .add(endingDeployerbalance)
                          .add(gasCost)
                          .toString()
                  );
              });
              it("only owner can withdraw", async function () {
                  const accounts = await ethers.getSigners();
                  const gambleGameConnectedContract = await gambleGame.connect(
                      accounts[1]
                  );
                  const contractBalance = await gambleGame.getBalance();
                  await expect(
                      gambleGameConnectedContract.withdraw(contractBalance)
                  ).to.be.revertedWith(
                      "Only the owner can call this function!"
                  );
              });
              it("withdrawing too much raises correct error", async function () {
                  const contractBalance = await gambleGame.getBalance();
                  await expect(
                      gambleGame.withdraw(contractBalance.mul(2))
                  ).to.be.revertedWith(
                      "Attempted to withdraw amount exceeding contract balance."
                  );
              });
              it("withdrawing during bet settlement raises correct error", async function () {
                  const contractBalance = await gambleGame.getBalance();
                  await gambleGame.bet({ value: betAmount });
                  await expect(
                      gambleGame.withdraw(contractBalance)
                  ).to.be.revertedWith(
                      "Cannot withdraw while bets are being settled."
                  );
              });
          });

          describe("update minimum bet", async function () {
              it("update minimum bet works", async function () {
                  const newMinimumBet = ethers.utils.parseEther("1");
                  await gambleGame.updateMinimumBet(newMinimumBet);
                  const response = await gambleGame.minimumBet();
                  assert.equal(response.toString(), newMinimumBet.toString());
              });
          });

          describe("update house edge", async function () {
              it("update house edge works", async function () {
                  const newHouseEdge = 100;
                  await gambleGame.updateHouseEdge(newHouseEdge);
                  const response = await gambleGame.houseEdge();
                  assert.equal(response.toString(), newHouseEdge.toString());
              });
          });

          describe("bet function", async function () {
              beforeEach(async function () {
                  await gambleGame.fund({ value: fundAmount });
              });

              it("cannot bet below the minimum amount", async function () {
                  const minimumBet = ethers.utils.parseEther("2");
                  await gambleGame.updateMinimumBet(minimumBet);
                  const accounts = ethers.getSigners();
                  const bettor = accounts[1];
                  const betAmount = ethers.utils.parseEther("1");
                  expect(
                      gambleGame.bet({ from: bettor, value: betAmount })
                  ).to.be.revertedWith("Bet amount too small.");
              });
              it("cannot bet above the contract balance", async function () {
                  const contractBalance = await gambleGame.getBalance();
                  const accounts = ethers.getSigners();
                  const bettor = accounts[1];
                  const betAmount = contractBalance.add(
                      ethers.utils.parseEther("1")
                  );
                  expect(
                      await gambleGame.bet({ from: bettor, value: betAmount })
                  ).to.be.revertedWith("Bet amount too large.");
              });
              it("can accept a bet", async function () {
                  const startingContractBalance = await gambleGame.getBalance();
                  const transactionResponse = await gambleGame.bet({
                      value: betAmount,
                  });
                  const transactionReceipt = await transactionResponse.wait(1);
                  const { events } = transactionReceipt;
                  const { event } = events[1];
                  assert.equal(event.toString(), "BetAccepted");
                  const endingContractBalance = await gambleGame.getBalance();
                  assert.equal(
                      startingContractBalance.add(betAmount).toString(),
                      endingContractBalance.toString()
                  );
              });
          });
          describe("refund bets", async function () {
              beforeEach(async function () {
                  await gambleGame.fund({ value: fundAmount });
              });
              it("should refund the bet", async function () {
                  const startingContractBalance = await gambleGame.getBalance();
                  const startingDeployerBalance =
                      await gambleGame.provider.getBalance(deployer);

                  await gambleGame.bet({ value: betAmount });
                  const currentContractBalance = await gambleGame.getBalance();
                  assert.equal(
                      currentContractBalance.toString(),
                      startingContractBalance.add(betAmount).toString()
                  );
                  await gambleGame.refundUnsettledBets();
                  const endingContractBalance = await gambleGame.getBalance();
                  const endingDeployerBalance =
                      await gambleGame.provider.getBalance(deployer);
                  assert.equal(
                      startingContractBalance.toString(),
                      endingContractBalance.toString()
                  );
              });
          });
      });
