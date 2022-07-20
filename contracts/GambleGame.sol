// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";


/** @title A contract to simulate a bet on a coin flip with predetermined house edge
 * @author OllieM26
 * @dev This implements chainlink oracles to produce verifiable randomness
 */
contract GambleGame is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;
    address public coordinatorAddress;
    uint64 public subscriptionId;
    bytes32 public keyHash;
    
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;
    uint256 public s_requestId;
    uint256[] public s_randomWords;

    address payable owner;
    uint256 public minimumBet;
    uint256 public houseEdge; // bips

    struct Bet {
        address bettor;
        uint256 betAmount;
    }
    Bet[] public unsettledBets;

    event BetAccepted(
        address bettor,
        uint256 betAmount,
        uint256 blockNumber,
        uint256 blockTimestamp
    );
    event BetSettled(
        address bettor,
        uint256 betAmount,
        uint256 blockNumber,
        uint256 blockTimestamp,
        uint256 randomWord,
        bool isWinner
    );

    constructor(
        uint64 _subscriptionId,
        bytes32 _keyHash,
        address _vrfCoordinator
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        coordinatorAddress = address(COORDINATOR);
        owner = payable(msg.sender);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function!");
        _;
    }

    /**
     * @notice This function funds the contract, and is only callable by the owner
     */
    function fund() public payable onlyOwner {}

    /**
     * @notice This function withdraws funds from the contract, only callable by the owner
     * @param amount The amount of wei to be withdrawn
     */
    function withdraw(uint256 amount) public payable onlyOwner {
        require(
            amount <= address(this).balance,
            "Attempted to withdraw amount exceeding contract balance."
        );
        require(unsettledBets.length == 0, "Cannot withdraw while bets are being settled.");
        payable(msg.sender).transfer(amount);
    }

    function updateMinimumBet(uint256 newMinimumBet) public onlyOwner {
        minimumBet = newMinimumBet;
    }

    function updateHouseEdge(uint256 newHouseEdge) public onlyOwner {
        houseEdge = newHouseEdge;
    }

    function getBalance() public view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    function getUnsettledBets() public view onlyOwner returns(Bet[] memory) {
        return unsettledBets;
    }

    /**
     * @notice This function requests a random number from the chainlink VRF
     * @dev To be called only by this contract in the function bet()
     */
    function requestRandomWords() external {
        // Will revert if subscription is not set and funded.
        s_requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
    }

    /**
     * @notice This function is called by the chainlink VRF and returns the random number
     * @notice It then settles the bet, sending ETH back to the sender if they won
     *
     * @dev This implements price feeds as our library
     *
     * @param randomWords the VRF output expanded to the requested number of words (1)
     */
    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        s_randomWords = randomWords;
        uint256 latestRandomWord = s_randomWords[s_randomWords.length - 1];
        // Settle the bet
        Bet memory currentBet = popBet();
        uint256 randomNumber = latestRandomWord % 10000;
        bool isWinner;
        if (randomNumber >= 5000 + houseEdge / 2) {
            payable(currentBet.bettor).transfer(currentBet.betAmount * 2);
            isWinner = true;
        }
        emit BetSettled(
            msg.sender,
            msg.value,
            block.number,
            block.timestamp,
            latestRandomWord,
            isWinner
        );
    }

    /**
     * @notice This function returns the oldest bet from unsettledBets
     * @notice It also removes the bet from the unsettledBets array
     *
     * @dev Manually update the array element by element
     * @dev There is no more efficient way to do this (as far as I know)
     */
    function popBet() internal returns (Bet memory) {
        uint256 length = unsettledBets.length;
        require(length > 0, "There are no unsettled bets.");
        Bet memory output = unsettledBets[0];
        for (uint256 i = 0; i < length - 1; i++) {
            unsettledBets[i] = unsettledBets[i + 1];
        }
        unsettledBets.pop();
        return output;
    }

    /**
     * @notice This function places a bet
     * @notice Bet amount (msg.value) must be above minimumBet and below the balance of the contract
     *
     * @dev Requests a random number and stores msg.sender and msg.value in the unsettledBets array
     * @dev The bet is settled in the callback function called by the chainlink VRF: fulfillRandomWords()
     */
    function bet() public payable {
        require(msg.value >= minimumBet && msg.value > 0, "Bet amount too small.");
        require(msg.value <= address(this).balance, "Bet amount too large.");
        unsettledBets.push(Bet(msg.sender, msg.value));
        this.requestRandomWords();
        emit BetAccepted(
            msg.sender,
            msg.value,
            block.number,
            block.timestamp
        );
        // Bet is to be settled in the callback function
    }

    /**
     * @notice This function sends back the ETH of those whose bets are still unsettled
     * @notice To be used if the VRF goes down and bets cannot be settled
     *
     * @dev 
     */
    function refundUnsettledBets() public onlyOwner {
        require(unsettledBets.length > 0, "There are currently no unsettled bets.");
        Bet memory currentBet;
        for (uint i=0; i<unsettledBets.length; i++) {
            currentBet = unsettledBets[i];
            payable(currentBet.bettor).transfer(currentBet.betAmount);
        }
        delete unsettledBets;
    }

    function selfDestruct() public onlyOwner {
        selfdestruct(owner);
    }
}
