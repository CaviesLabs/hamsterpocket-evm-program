// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

import "./Types.sol";
import "./Params.sol";

/**
 * @notice HamsterPocket allows users to create and manage their own dollar-cost averaging pools
 * (“pockets”) that will automatically execute the chosen strategies over tim,
 **/
/// @custom:security-contact khang@cavies.xyz
contract PocketRegistry is
	Initializable,
	PausableUpgradeable,
	ReentrancyGuardUpgradeable,
	AccessControlUpgradeable,
	OwnableUpgradeable
{
	using SafeMathUpgradeable for uint256;

	/// @notice Operator that is allowed to run swap
	bytes32 public constant OPERATOR = keccak256("OPERATOR");

	/// @notice Relayer that is specific to internal components such as router or vault
	bytes32 public constant RELAYER = keccak256("RELAYER");

	/// @notice Store pocket configuration
	mapping(address => bool) public allowedInteractiveAddresses;

	/// @notice Store user pocket data
	mapping(string => Types.Pocket) public pockets;

	/// @notice Utility check
	mapping(string => bool) public blacklistedIdMap;

	/// @notice Event emitted when whitelisting/blacklisting address
	event AddressWhitelisted(
		address indexed actor,
		address indexed mintAddress,
		bool value
	);

	/// @notice Event emitted when initializing user pocket
	event PocketInitialized(
		address indexed actor,
		string indexed pocketId,
		address indexed owner,
		Params.CreatePocketParams params
	);

	/// @notice Event emitted when initializing user pocket
	event PocketUpdated(
		address indexed actor,
		string indexed pocketId,
		address indexed owner,
		string reason,
		Types.Pocket pocketData
	);

	/// @notice Check if id is unique
	/// @dev should be used as a modifier
	modifier idMustBeAvailable(string memory id) {
		require(blacklistedIdMap[id] == false, "ID: the id is not unique");
		blacklistedIdMap[id] = true;

		_;
	}

	/// @notice Check if the target is the owner of a given pocket id
	/// @dev should be used as a modifier
	modifier mustBeOwnerOf(string memory pocketId, address target) {
		require(
			isOwnerOf(pocketId, target),
			"Permission: not permitted operation"
		);

		_;
	}

	/// @notice Check whether an address is the pocket owner
	function isOwnerOf(string memory pocketId, address target)
		public
		view
		returns (bool)
	{
		return pockets[pocketId].owner == target;
	}

	/// @notice Check whether an address is the pocket owner
	function getStopConditionsOf(string memory pocketId)
		public
		view
		returns (Types.StopCondition[] memory)
	{
		return pockets[pocketId].stopConditions;
	}

	/// @notice Get trading pair info of a given pocket id
	function getTradingInfoOf(string memory pocketId)
		public
		view
		returns (
			address,
			address,
			address,
			uint256,
			uint256,
			uint256,
			uint256,
			Types.ValueComparison memory,
			Types.ValueComparison memory
		)
	{
		return (
			pockets[pocketId].ammRouterAddress,
			pockets[pocketId].baseMintAddress,
			pockets[pocketId].targetMintAddress,
			pockets[pocketId].startAt,
			pockets[pocketId].batchVolume,
			pockets[pocketId].frequency,
			pockets[pocketId].nextScheduledExecutionAt,
			pockets[pocketId].openingPositionCondition,
			pockets[pocketId].closingPositionCondition
		);
	}

	/// @notice Get balance info of a given pocket
	function getBalanceInfoOf(string memory pocketId)
		public
		view
		returns (uint256, uint256)
	{
		return (
			pockets[pocketId].baseTokenBalance,
			pockets[pocketId].targetTokenBalance
		);
	}

	/// @notice Check whether a pocket is available for depositing
	function isAbleToDeposit(string memory pocketId, address owner)
		external
		view
		returns (bool)
	{
		return (pockets[pocketId].owner == owner &&
			pockets[pocketId].status != Types.PocketStatus.Closed &&
			pockets[pocketId].status != Types.PocketStatus.Withdrawn);
	}

	/// @notice Check whether a pocket is available to close
	function isAbleToClose(string memory pocketId, address owner)
		external
		view
		returns (bool)
	{
		return (pockets[pocketId].owner == owner &&
			pockets[pocketId].status != Types.PocketStatus.Closed &&
			pockets[pocketId].status != Types.PocketStatus.Withdrawn);
	}

	/// @notice Check whether a pocket is available to withdraw
	function isAbleToWithdraw(string memory pocketId, address owner)
		external
		view
		returns (bool)
	{
		return (pockets[pocketId].owner == owner &&
			pockets[pocketId].status == Types.PocketStatus.Closed);
	}

	/// @notice Check whether a pocket is available to restart
	function isAbleToRestart(string memory pocketId, address owner)
		external
		view
		returns (bool)
	{
		return (pockets[pocketId].owner == owner &&
			pockets[pocketId].status == Types.PocketStatus.Paused);
	}

	/// @notice Check whether a pocket is available to pause
	function isAbleToPause(string memory pocketId, address owner)
		external
		view
		returns (bool)
	{
		return (pockets[pocketId].owner == owner &&
			pockets[pocketId].status == Types.PocketStatus.Active);
	}

	/// @notice Check whether a pocket is ready to swap
	function isReadyToSwap(string memory pocketId)
		external
		view
		returns (bool)
	{
		return (pockets[pocketId].status == Types.PocketStatus.Active &&
			pockets[pocketId].startAt <= block.timestamp &&
			pockets[pocketId].nextScheduledExecutionAt <= block.timestamp);
	}

	/// @notice Users initialize their pocket
	function initializeUserPocket(Params.CreatePocketParams memory params)
		external
		onlyRole(RELAYER)
		idMustBeAvailable(params.id)
	{
		/// @dev Validate input
		require(
			params.startAt >= block.timestamp,
			"Timestamp: must be equal or greater than block time"
		);
		require(
			params.batchVolume >= 0,
			"Batch volume: must be equal or greater than 0"
		);
		require(
			params.frequency >= 1 hours,
			"Frequency: must be equal or greater than 1 hour"
		);
		require(params.owner != address(0), "Address: invalid owner");
		require(
			params.ammRouterAddress != address(0),
			"Address: invalid ammRouterAddress"
		);
		require(
			allowedInteractiveAddresses[params.ammRouterAddress],
			"Address: ammRouterAddress is not whitelisted"
		);
		require(
			params.baseMintAddress != address(0),
			"Address: invalid baseMintAddress"
		);
		require(
			allowedInteractiveAddresses[params.baseMintAddress],
			"Address: baseMintAddress is not whitelisted"
		);
		require(
			params.targetMintAddress != address(0),
			"Address: invalid targetMintAddress"
		);
		require(
			allowedInteractiveAddresses[params.targetMintAddress],
			"Address: targetMintAddress is not whitelisted"
		);
		/// @dev Validate stop condition through loop
		for (uint256 index = 0; index < params.stopConditions.length; index++) {
			require(
				params.stopConditions[index].value > 0,
				"StopCondition: value must not be zero"
			);
		}
		/// @dev Validate value comparison struct
		if (
			params.openingPositionCondition.operator !=
			Types.ValueComparisonOperator.Unset
		) {
			if (
				params.openingPositionCondition.operator ==
				Types.ValueComparisonOperator.Bw ||
				params.openingPositionCondition.operator ==
				Types.ValueComparisonOperator.NBw
			) {
				require(
					params.openingPositionCondition.value0 > 0 &&
						params.openingPositionCondition.value1 >=
						params.openingPositionCondition.value0,
					"ValueComparison: invalid value"
				);
			} else {
				require(
					params.openingPositionCondition.value0 > 0,
					"ValueComparison: invalid value"
				);
			}
		}
		/// @dev Validate value comparison struct
		if (
			params.closingPositionCondition.operator !=
			Types.ValueComparisonOperator.Unset
		) {
			if (
				params.closingPositionCondition.operator ==
				Types.ValueComparisonOperator.Bw ||
				params.closingPositionCondition.operator ==
				Types.ValueComparisonOperator.NBw
			) {
				require(
					params.closingPositionCondition.value0 > 0 &&
						params.closingPositionCondition.value1 >=
						params.closingPositionCondition.value0,
					"ValueComparison: invalid value"
				);
			} else {
				require(
					params.closingPositionCondition.value0 > 0,
					"ValueComparison: invalid value"
				);
			}
		}

		/// @dev Initialize user pocket data
		pockets[params.id] = Types.Pocket({
			id: params.id,
			owner: params.owner,
			ammRouterAddress: params.ammRouterAddress,
			baseMintAddress: params.baseMintAddress,
			targetMintAddress: params.targetMintAddress,
			startAt: params.startAt,
			batchVolume: params.batchVolume,
			frequency: params.frequency,
			stopConditions: params.stopConditions,
			openingPositionCondition: params.openingPositionCondition,
			closingPositionCondition: params.closingPositionCondition,
			/// @dev Those fields are updated during the relayers operation
			status: Types.PocketStatus.Active,
			totalDepositedBaseAmount: 0,
			totalReceivedTargetAmount: 0,
			totalSwappedBaseAmount: 0,
			totalClosedPositionInTargetTokenAmount: 0,
			totalReceivedFundInBaseTokenAmount: 0,
			baseTokenBalance: 0,
			targetTokenBalance: 0,
			executedBatchAmount: 0,
			nextScheduledExecutionAt: 0
		});

		/// @dev Emit event
		emit PocketInitialized(msg.sender, params.id, params.owner, params);
	}

	/// @notice The function to provide a method for relayers to update pocket stats
	function updatePocketClosingPositionStats(
		Params.UpdatePocketClosingPositionStatsParams memory params,
		string memory reason
	) external onlyRole(RELAYER) mustBeOwnerOf(params.id, params.actor) {
		Types.Pocket storage pocket = pockets[params.id];

		/// @dev Assigned value
		pocket.totalClosedPositionInTargetTokenAmount = pocket
			.totalClosedPositionInTargetTokenAmount
			.add(params.swappedTargetTokenAmount);
		pocket.totalReceivedFundInBaseTokenAmount = pocket
			.totalReceivedFundInBaseTokenAmount
			.add(params.receivedBaseTokenAmount);
		pocket.baseTokenBalance = pocket.baseTokenBalance.add(
			params.receivedBaseTokenAmount
		);
		pocket.targetTokenBalance = pocket.targetTokenBalance.sub(
			params.swappedTargetTokenAmount
		);

		/// @dev Emit events
		emit PocketUpdated(msg.sender, params.id, params.actor, reason, pocket);
	}

	/// @notice The function to provide a method for relayers to update pocket stats
	function updatePocketTradingStats(
		Params.UpdatePocketTradingStatsParams memory params,
		string memory reason
	) external onlyRole(RELAYER) mustBeOwnerOf(params.id, params.actor) {
		Types.Pocket storage pocket = pockets[params.id];

		/// @dev Assigned value
		pocket.nextScheduledExecutionAt = block.timestamp.add(pocket.frequency);
		pocket.executedBatchAmount = pocket.executedBatchAmount.add(1);
		pocket.totalSwappedBaseAmount = pocket.totalSwappedBaseAmount.add(
			params.swappedBaseTokenAmount
		);
		pocket.totalReceivedTargetAmount = pocket.totalReceivedTargetAmount.add(
			params.receivedTargetTokenAmount
		);
		pocket.baseTokenBalance = pocket.totalSwappedBaseAmount.sub(
			params.swappedBaseTokenAmount
		);
		pocket.targetTokenBalance = pocket.targetTokenBalance.add(
			params.receivedTargetTokenAmount
		);

		/// @dev Emit events
		emit PocketUpdated(msg.sender, params.id, params.actor, reason, pocket);
	}

	/// @notice The function to provide a method for relayers to update pocket stats
	function updatePocketWithdrawalStats(
		Params.UpdatePocketWithdrawalParams memory params,
		string memory reason
	) external onlyRole(RELAYER) mustBeOwnerOf(params.id, params.actor) {
		Types.Pocket storage pocket = pockets[params.id];

		/// @dev Assigned value
		pocket.baseTokenBalance = 0;
		pocket.targetTokenBalance = 0;

		/// @dev Emit events
		emit PocketUpdated(msg.sender, params.id, params.actor, reason, pocket);
	}

	/// @notice The function to provide a method for relayers to update pocket stats
	function updatePocketDepositStats(
		Params.UpdatePocketDepositParams memory params,
		string memory reason
	) external onlyRole(RELAYER) mustBeOwnerOf(params.id, params.actor) {
		Types.Pocket storage pocket = pockets[params.id];

		/// @dev Assigned value
		pocket.totalDepositedBaseAmount = pocket.totalDepositedBaseAmount.add(
			params.amount
		);
		pocket.baseTokenBalance = pocket.baseTokenBalance.add(params.amount);

		/// @dev Emit events
		emit PocketUpdated(msg.sender, params.id, params.actor, reason, pocket);
	}

	/// @notice The function to provide a method for relayers to update pocket stats
	function updatePocketStatus(
		Params.UpdatePocketStatusParams memory params,
		string memory reason
	) external onlyRole(RELAYER) mustBeOwnerOf(params.id, params.actor) {
		Types.Pocket storage pocket = pockets[params.id];

		/// @dev Assigned value
		pocket.status = params.status;

		/// @dev Emit events
		emit PocketUpdated(msg.sender, params.id, params.actor, reason, pocket);
	}

	/// @notice Admin can update whitelisted address
	/// @dev Simply assign value to the mapping
	function whitelistAddress(address interactiveAddress, bool value)
		external
		onlyOwner
		onlyRole(DEFAULT_ADMIN_ROLE)
	{
		allowedInteractiveAddresses[interactiveAddress] = value;
		emit AddressWhitelisted(msg.sender, interactiveAddress, value);
	}

	/// ================ System methods ================== ///
	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	/// @notice Initialization func
	function initialize() public initializer {
		__Pausable_init();
		__Ownable_init();
		__AccessControl_init();

		// Grant default role
		_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
	}

	function pause() public onlyOwner onlyRole(DEFAULT_ADMIN_ROLE) {
		_pause();
	}

	function unpause() public onlyOwner onlyRole(DEFAULT_ADMIN_ROLE) {
		_unpause();
	}
	/// ================ End System methods ================== ///
}
