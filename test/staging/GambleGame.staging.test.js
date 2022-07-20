const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("GambleGame staging tests", async function () {
          let gambleGame;
          let deployer;
          const fundAmount = ethers.utils.parseEther("1");
          const betAmount = ethers.utils.parseEther("0.1");

          // put address of previously deployed GambleGame contract here
          // make sure it is added as a consumer on VRF subscription
          let gambleGameAddress = "0x8d7F96093dd5CB26dfEFF3f59b5f443AA3577fF7";

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;

              if (!gambleGameAddress) {
                  console.log("Deploying...");
                  await deployments.fixture(["all"]);
                  console.log("Contract deployed!");
                  gambleGame = await ethers.getContract("GambleGame", deployer);
              } else {
                  const GambleGame = await ethers.getContractFactory(
                      "GambleGame"
                  );
                  gambleGame = await GambleGame.attach(gambleGameAddress);
              }
              console.log(`Contract address: ${gambleGame.address}`);
          });

          it("should be funded and accept a bet", async function () {
              const initialContractBalance = await gambleGame.getBalance();
              if (initialContractBalance == 0) {
                  console.log(
                      `Funding contract with ${fundAmount / 10 ** 18} ETH...`
                  );
                  const tx = await gambleGame.fund({ value: fundAmount });
                  const tx_r = await tx.wait(1);
                  console.log("Contract funded!");
                  console.log("");
              }
              const startingContractBalance = await gambleGame.getBalance();
              const startingDeployerBalance =
                  await gambleGame.provider.getBalance(deployer);
              console.log(
                  `Contract balance: ${startingContractBalance / 10 ** 18}`
              );
              console.log(
                  `Deployer balance: ${startingDeployerBalance / 10 ** 18}`
              );
              console.log("");

              console.log(`Betting ${betAmount / 10 ** 18} ETH...`);
              const transactionResponse = await gambleGame.bet({
                  value: betAmount,
                  //gasLimit: 300000,
              });
              const transactionReceipt = await transactionResponse.wait(1);
              const { events } = transactionReceipt;
              const { event } = events[events.length - 1];
              assert.equal(event.toString(), "BetAccepted");

              console.log("Bet accepted!");
              console.log("");

              console.log("Settling bet...");

              let bet;
              let betSettled = false;
              let unsettledBets = await gambleGame.getUnsettledBets();
              while (!betSettled) {
                  try {
                      bet = await gambleGame.unsettledBets(0);
                  } catch (e) {
                      betSettled = true;
                  }
              }

              console.log("Bet settled!");
              console.log("");

              const endingContractBalance = await gambleGame.getBalance();
              const endingDeployerbalance =
                  await gambleGame.provider.getBalance(deployer);
              console.log(
                  `Contract balance: ${endingContractBalance / 10 ** 18}`
              );
              console.log(
                  `Deployer balance: ${endingDeployerbalance / 10 ** 18}`
              );
              console.log("");
              assert(endingDeployerbalance >= 0);

              console.log("Withdrawing entire balance...");
              const txResponse = await gambleGame.withdraw(
                  endingContractBalance
              );
              const txReceipt = await txResponse.wait(1);
              console.log("Withdrawal complete.");
              console.log("");
              const finalContractBalance = await gambleGame.getBalance();
              const finalDeployerBalance = await gambleGame.provider.getBalance(
                  deployer
              );
              console.log(
                  `Contract balance: ${finalContractBalance / 10 ** 18}`
              );
              console.log(
                  `Deployer balance: ${finalDeployerBalance / 10 ** 18}`
              );
              console.log("");

              assert.equal(finalContractBalance.toString(), "0");
          });
      });
