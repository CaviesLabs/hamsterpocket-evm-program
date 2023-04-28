// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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

	/// @notice We use precision as 1 million for the more accurate percentage
	uint256 public constant PERCENTAGE_PRECISION = 1000000;

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

	/// @notice Check if id is unique
	/// @dev should be used as a modifier
	modifier mustBeValidPocket(string memory id) {
		require(blacklistedIdMap[id] == true, "ID: the id must be existed");
		require(pockets[id].owner != address(0), "Pocket: invalid pocket");

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

	/// @notice Check whether a pocket meet stop condition. The pocket should be settled before checking this condition.
	function shouldClosePocket(string memory pocketId)
		public
		view
		returns (bool)
	{
		Types.Pocket storage pocket = pockets[pocketId];
		Types.StopCondition[] storage stopConditions = pockets[pocketId]
			.stopConditions;

		/// @dev Save some gas
		if (stopConditions.length == 0) return false;

		for (uint256 index = 0; index < stopConditions.length; index++) {
			Types.StopCondition storage condition = stopConditions[index];

			/// @dev Check for condition here
			if (
				condition.operator == Types.StopConditionOperator.EndTimeReach
			) {
				return condition.value <= block.timestamp;
			}

			if (
				condition.operator ==
				Types.StopConditionOperator.BatchAmountReach
			) {
				return pocket.executedBatchAmount >= condition.value;
			}

			if (
				condition.operator ==
				Types.StopConditionOperator.SpentBaseTokenAmountReach
			) {
				return pocket.totalSwappedBaseAmount >= condition.value;
			}

			if (
				condition.operator ==
				Types.StopConditionOperator.ReceivedTargetTokenAmountReach
			) {
				return pocket.totalReceivedTargetAmount >= condition.value;
			}
		}

		return false;
	}

	/// @notice Check whether a pocket meet buy condition. The pocket should not be settled until this condition is verified.
	function shouldOpenPosition(
		string memory pocketId,
		uint256 swappedBaseTokenAmount,
		uint256 receivedTargetTokenAmount
	) public view returns (bool) {
		Types.Pocket storage pocket = pockets[pocketId];
		Types.ValueComparison storage condition = pockets[pocketId]
			.openingPositionCondition;

		if (condition.operator == Types.ValueComparisonOperator.Unset) {
			return true;
		}

		/// @dev Calculate price
		uint256 expectedAmountOut = receivedTargetTokenAmount
			.mul(pocket.batchVolume)
			.div(swappedBaseTokenAmount);

		if (condition.operator == Types.ValueComparisonOperator.Lt) {
			return expectedAmountOut < condition.value0;
		}

		if (condition.operator == Types.ValueComparisonOperator.Lte) {
			return expectedAmountOut <= condition.value0;
		}

		if (condition.operator == Types.ValueComparisonOperator.Gt) {
			return expectedAmountOut > condition.value0;
		}

		if (condition.operator == Types.ValueComparisonOperator.Gte) {
			return expectedAmountOut >= condition.value0;
		}

		if (condition.operator == Types.ValueComparisonOperator.Bw) {
			return
				expectedAmountOut >= condition.value0 &&
				expectedAmountOut <= condition.value1;
		}

		if (condition.operator == Types.ValueComparisonOperator.NBw) {
			return
				expectedAmountOut < condition.value0 ||
				expectedAmountOut > condition.value1;
		}

		/// @dev Default will be true
		return true;
	}

	/// @notice Check whether a pocket meet buy condition. The pocket should not be settled until this condition is verified.
	function shouldTakeProfit(
		string memory pocketId,
		uint256 swappedTargetTokenAmount,
		uint256 receivedBaseTokenAmount
	) public view returns (bool) {
		Types.Pocket storage pocket = pockets[pocketId];
		Types.TradingStopCondition storage condition = pockets[pocketId]
			.takeProfitCondition;

		/// @dev Save some gas by early returns
		if (condition.stopType == Types.TradingStopConditionType.Unset) {
			return false;
		}

		/// @dev If pocket stop condition is based on price, return true if expectedAmountOut is greater than or equal condition value
		if (condition.stopType == Types.TradingStopConditionType.Price) {
			/// @dev Calculate price
			uint256 targetTokenDecimal = ERC20(pocket.targetTokenAddress)
				.decimals();
			uint256 expectedAmountOut = receivedBaseTokenAmount
				.mul(10**targetTokenDecimal)
				.div(swappedTargetTokenAmount);

			return expectedAmountOut >= condition.value;
		}

		/// @dev pocket stop condition is based on portfolio value diff
		if (
			condition.stopType ==
			Types.TradingStopConditionType.PortfolioValueDiff
		) {
			return
				receivedBaseTokenAmount >=
				pocket.totalSwappedBaseAmount.add(condition.value);
		}

		/// @dev Pocket stop condition is based on portfolio percentage diff
		if (
			condition.stopType ==
			Types.TradingStopConditionType.PortfolioPercentageDiff
		) {
			/// @dev Return false if the portfolio is in a loss position
			if (receivedBaseTokenAmount <= pocket.totalSwappedBaseAmount) {
				return false;
			}

			/// @dev Compute the position profit
			return
				receivedBaseTokenAmount
					.sub(pocket.totalSwappedBaseAmount)
					.mul(PERCENTAGE_PRECISION)
					.div(pocket.totalSwappedBaseAmount) >= condition.value;
		}

		return false;
	}

	/// @notice Check whether a pocket meet buy condition. The pocket should not be settled until this condition is verified.
	function shouldStopLoss(
		string memory pocketId,
		uint256 swappedTargetTokenAmount,
		uint256 receivedBaseTokenAmount
	) public view returns (bool) {
		Types.Pocket storage pocket = pockets[pocketId];
		Types.TradingStopCondition storage condition = pockets[pocketId]
			.stopLossCondition;

		/// @dev Save some gas by early returns
		if (condition.stopType == Types.TradingStopConditionType.Unset) {
			return false;
		}

		/// @dev If pocket stop condition is based on price, return true if expectedAmountOut is greater than or equal condition value
		if (condition.stopType == Types.TradingStopConditionType.Price) {
			/// @dev Calculate price
			uint256 targetTokenDecimal = ERC20(pocket.targetTokenAddress)
				.decimals();
			uint256 expectedAmountOut = receivedBaseTokenAmount
				.mul(10**targetTokenDecimal)
				.div(swappedTargetTokenAmount);

			return expectedAmountOut <= condition.value;
		}

		/// @dev pocket stop condition is based on portfolio value diff
		if (
			condition.stopType ==
			Types.TradingStopConditionType.PortfolioValueDiff
		) {
			return
				receivedBaseTokenAmount <= pocket.totalSwappedBaseAmount &&
				pocket.totalSwappedBaseAmount.sub(receivedBaseTokenAmount) >=
				condition.value;
		}

		/// @dev Pocket stop condition is based on portfolio percentage diff
		if (
			condition.stopType ==
			Types.TradingStopConditionType.PortfolioPercentageDiff
		) {
			/// @dev Return false if the portfolio is not in a loss position
			if (receivedBaseTokenAmount > pocket.totalSwappedBaseAmount) {
				return false;
			}

			/// @dev Compute the position loss
			return
				pocket
					.totalSwappedBaseAmount
					.sub(receivedBaseTokenAmount)
					.mul(PERCENTAGE_PRECISION)
					.div(pocket.totalSwappedBaseAmount) >= condition.value;
		}

		return false;
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
			Types.TradingStopCondition memory,
			Types.TradingStopCondition memory
		)
	{
		return (
			pockets[pocketId].ammRouterAddress,
			pockets[pocketId].baseTokenAddress,
			pockets[pocketId].targetTokenAddress,
			pockets[pocketId].startAt,
			pockets[pocketId].batchVolume,
			pockets[pocketId].frequency,
			pockets[pocketId].nextScheduledExecutionAt,
			pockets[pocketId].openingPositionCondition,
			pockets[pocketId].takeProfitCondition,
			pockets[pocketId].stopLossCondition
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

	/// @notice Get owner address of a given pocket
	function getOwnerOf(string memory pocketId) public view returns (address) {
		return (pockets[pocketId].owner);
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

	/// @notice Check whether a pocket is available for depositing
	function isAbleToUpdate(string memory pocketId, address owner)
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
	function initializeUserPocket(Params.CreatePocketParams calldata params)
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
			params.baseTokenAddress != address(0),
			"Address: invalid baseTokenAddress"
		);
		require(
			allowedInteractiveAddresses[params.baseTokenAddress],
			"Address: baseTokenAddress is not whitelisted"
		);
		require(
			params.targetTokenAddress != address(0),
			"Address: invalid targetTokenAddress"
		);
		require(
			allowedInteractiveAddresses[params.targetTokenAddress],
			"Address: targetTokenAddress is not whitelisted"
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
			params.takeProfitCondition.stopType !=
			Types.TradingStopConditionType.Unset
		) {
			require(
				params.takeProfitCondition.value > 0,
				"ValueComparison: invalid value"
			);
		}
		/// @dev Validate value comparison struct
		if (
			params.stopLossCondition.stopType !=
			Types.TradingStopConditionType.Unset
		) {
			require(
				params.stopLossCondition.value > 0,
				"ValueComparison: invalid value"
			);
		}

		/// @dev Initialize user pocket data
		pockets[params.id] = Types.Pocket({
			id: params.id,
			owner: params.owner,
			ammRouterAddress: params.ammRouterAddress,
			baseTokenAddress: params.baseTokenAddress,
			targetTokenAddress: params.targetTokenAddress,
			startAt: params.startAt,
			batchVolume: params.batchVolume,
			frequency: params.frequency,
			stopConditions: params.stopConditions,
			openingPositionCondition: params.openingPositionCondition,
			takeProfitCondition: params.takeProfitCondition,
			stopLossCondition: params.stopLossCondition,
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

	/// @notice Users initialize their pocket
	function updatePocket(
		Params.UpdatePocketParams calldata params,
		string calldata reason
	) external onlyRole(RELAYER) mustBeValidPocket(params.id) {
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
			params.takeProfitCondition.stopType !=
			Types.TradingStopConditionType.Unset
		) {
			require(
				params.takeProfitCondition.value > 0,
				"ValueComparison: invalid value"
			);
		}
		/// @dev Validate value comparison struct
		if (
			params.stopLossCondition.stopType !=
			Types.TradingStopConditionType.Unset
		) {
			require(
				params.stopLossCondition.value > 0,
				"ValueComparison: invalid value"
			);
		}

		Types.Pocket storage currentPocket = pockets[params.id];

		/// @dev Initialize user pocket data
		pockets[params.id] = Types.Pocket({
			/// @dev Those fields are updated
			startAt: params.startAt,
			batchVolume: params.batchVolume,
			frequency: params.frequency,
			stopConditions: params.stopConditions,
			openingPositionCondition: params.openingPositionCondition,
			takeProfitCondition: params.takeProfitCondition,
			stopLossCondition: params.stopLossCondition,
			/// @dev Reserve those fields
			id: currentPocket.id,
			owner: currentPocket.owner,
			ammRouterAddress: currentPocket.ammRouterAddress,
			baseTokenAddress: currentPocket.baseTokenAddress,
			targetTokenAddress: currentPocket.targetTokenAddress,
			status: currentPocket.status,
			totalDepositedBaseAmount: currentPocket.totalDepositedBaseAmount,
			totalReceivedTargetAmount: currentPocket.totalReceivedTargetAmount,
			totalSwappedBaseAmount: currentPocket.totalSwappedBaseAmount,
			totalClosedPositionInTargetTokenAmount: currentPocket
				.totalClosedPositionInTargetTokenAmount,
			totalReceivedFundInBaseTokenAmount: currentPocket
				.totalReceivedFundInBaseTokenAmount,
			baseTokenBalance: currentPocket.baseTokenBalance,
			targetTokenBalance: currentPocket.targetTokenBalance,
			executedBatchAmount: currentPocket.executedBatchAmount,
			nextScheduledExecutionAt: currentPocket.nextScheduledExecutionAt
		});

		/// @dev Emit event
		emit PocketUpdated(
			msg.sender,
			currentPocket.id,
			currentPocket.owner,
			reason,
			pockets[params.id]
		);
	}

	/// @notice The function to provide a method for relayers to update pocket stats
	function updatePocketClosingPositionStats(
		Params.UpdatePocketClosingPositionStatsParams calldata params,
		string calldata reason
	) external onlyRole(RELAYER) mustBeOwnerOf(params.id, params.actor) {
		Types.Pocket storage pocket = pockets[params.id];

		/// @dev Assigned value
		pocket.totalClosedPositionInTargetTokenAmount = params
			.swappedTargetTokenAmount;
		pocket.totalReceivedFundInBaseTokenAmount = params
			.receivedBaseTokenAmount;

		/// @dev Update balance properly
		pocket.baseTokenBalance = params.receivedBaseTokenAmount;
		pocket.targetTokenBalance = 0;

		/// @dev Emit events
		emit PocketUpdated(msg.sender, params.id, params.actor, reason, pocket);
	}

	/// @notice The function to provide a method for relayers to update pocket stats
	function updatePocketTradingStats(
		Params.UpdatePocketTradingStatsParams calldata params,
		string calldata reason
	) external onlyRole(RELAYER) mustBeOwnerOf(params.id, params.actor) {
		Types.Pocket storage pocket = pockets[params.id];

		/// @dev Assigned value
		pocket.nextScheduledExecutionAt = block.timestamp.add(pocket.frequency);
		pocket.executedBatchAmount = pocket.executedBatchAmount.add(1);

		/// @dev Update balance properly
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
		Params.UpdatePocketWithdrawalParams calldata params,
		string calldata reason
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
		Params.UpdatePocketDepositParams calldata params,
		string calldata reason
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
		Params.UpdatePocketStatusParams calldata params,
		string calldata reason
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
