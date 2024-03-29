// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

library Types {
	/**
	 * @dev Pocket status which has 4 statuses
	 */
	enum PocketStatus {
		Unset,
		Active,
		Paused,
		Closed,
		Withdrawn
	}

	/**
	 * @dev Value comparison
	 */
	enum ValueComparisonOperator {
		Unset,
		Gt,
		Gte,
		Lt,
		Lte,
		Bw,
		NBw
	}
	struct ValueComparison {
		uint256 value0;
		uint256 value1;
		ValueComparisonOperator operator;
	}

	/// @dev Declare trading stop condition
	enum TradingStopConditionType {
		Unset,
		Price,
		PortfolioPercentageDiff,
		PortfolioValueDiff
	}
	struct TradingStopCondition {
		TradingStopConditionType stopType;
		uint256 value;
	}

	/**
	 * @dev Stop condition
	 */
	enum StopConditionOperator {
		EndTimeReach,
		BatchAmountReach,
		SpentBaseTokenAmountReach,
		ReceivedTargetTokenAmountReach
	}
	struct StopCondition {
		uint256 value;
		StopConditionOperator operator;
	}

	/// @dev Declare AMM router version
	enum AMMRouterVersion {
		V3,
		V2,
		V3NonUniversal
	}

	/**
	 * @dev Define Pocket
	 */
	struct Pocket {
		/**
		 * @dev Each pocket would have a unique id
		 */
		string id;
		/**
		 * @dev Info is used for statistic
		 * @dev Following fields will be assigned during runtime.
		 */
		uint256 totalDepositedBaseAmount;
		uint256 totalSwappedBaseAmount;
		uint256 totalReceivedTargetAmount;
		uint256 totalClosedPositionInTargetTokenAmount;
		uint256 totalReceivedFundInBaseTokenAmount;
		uint256 baseTokenBalance;
		uint256 targetTokenBalance;
		uint256 executedBatchAmount;
		uint256 nextScheduledExecutionAt;
		PocketStatus status;
		/**
		 * @dev Owner
		 */
		address owner;
		/**
		 * @dev AMM configurations
		 */
		address ammRouterAddress;
		address baseTokenAddress;
		address targetTokenAddress;
		/**
		 * @dev Pocket trade config
		 **/
		uint256 startAt;
		uint256 batchVolume;
		uint256 frequency;
		ValueComparison openingPositionCondition;
		StopCondition[] stopConditions;
		TradingStopCondition takeProfitCondition;
		TradingStopCondition stopLossCondition;
		/**
		 * @dev AMM router version
		 */
		AMMRouterVersion ammRouterVersion;
	}
}
