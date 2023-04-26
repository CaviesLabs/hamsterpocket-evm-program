// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./PocketRegistry.sol";
import "./PocketVault.sol";

import "./Types.sol";
import "./Params.sol";

/**
 * @notice HamsterPocket allows users to create and manage their own dollar-cost averaging pools
 * (“pockets”) that will automatically execute the chosen strategies over tim,
 **/
/// @custom:security-contact khang@cavies.xyz
contract PocketChef is
	Initializable,
	PausableUpgradeable,
	ReentrancyGuardUpgradeable,
	OwnableUpgradeable
{
	PocketRegistry public registry;
	PocketVault public vault;

	/// @notice Events
	event VaultUpdated(address indexed actor, address updatedAddress);
	event RegistryUpdated(address indexed actor, address updatedAddress);

	/// @notice create pocket
	function createPocket(Params.CreatePocketParams memory params) external {
		require(params.owner == msg.sender, "Invalid pocket: owner mismatches");
		registry.initializeUserPocket(params);
	}

	/// @notice Update pocket data
	function updatePocket(Params.UpdatePocketParams memory params) external {
		require(
			registry.isAbleToUpdate(params.id, msg.sender),
			"Operation error: the pocket is not able to update"
		);

		registry.updatePocket(params, "USER_UPDATE_POCKET");
	}

	/// @notice Make DCA swap
	function tryClosingPosition(string memory pocketId) external nonReentrant {
		/// @dev Verify swap condition
		require(
			registry.hasRole(registry.OPERATOR(), msg.sender),
			"Operation error: only operator is only permitted for the operation"
		);
		require(
			registry.isReadyToSwap(pocketId),
			"Operation error: the pocket is not ready to perform swap"
		);

		/// @dev Execute DCA Swap
		(uint256 amountIn, uint256 amountOut) = vault.closePosition(pocketId);

		/// @dev Check whether the buy condition meets
		require(
			registry.shouldStopLoss(pocketId, amountIn, amountOut) ||
				registry.shouldTakeProfit(pocketId, amountIn, amountOut),
			"Operation error: closing position condition not reaches"
		);

		/// @dev Update trading stats
		registry.updatePocketClosingPositionStats(
			Params.UpdatePocketClosingPositionStatsParams({
				id: pocketId,
				actor: msg.sender,
				swappedTargetTokenAmount: amountIn,
				receivedBaseTokenAmount: amountOut
			}),
			"UPDATE_CLOSING_POSITION_STATS"
		);
	}

	/// @notice Make DCA swap
	function tryMakingDCASwap(string memory pocketId) external nonReentrant {
		/// @dev Verify swap condition
		require(
			registry.hasRole(registry.OPERATOR(), msg.sender),
			"Operation error: only operator is only permitted for the operation"
		);
		require(
			registry.isReadyToSwap(pocketId),
			"Operation error: the pocket is not ready to perform swap"
		);

		/// @dev Execute DCA Swap
		(uint256 amountIn, uint256 amountOut) = vault.makeDCASwap(pocketId);

		/// @dev Check whether the buy condition meets
		require(
			registry.shouldOpenPosition(pocketId, amountIn, amountOut),
			"Operation error: buy condition not reaches"
		);

		/// @dev Update trading stats
		registry.updatePocketTradingStats(
			Params.UpdatePocketTradingStatsParams({
				id: pocketId,
				actor: msg.sender,
				swappedBaseTokenAmount: amountIn,
				receivedTargetTokenAmount: amountOut
			}),
			"UPDATE_TRADING_STATS"
		);

		/// @dev Check whether should stop pocket
		if (registry.shouldClosePocket(pocketId)) {
			registry.updatePocketStatus(
				Params.UpdatePocketStatusParams({
					id: pocketId,
					actor: msg.sender,
					status: Types.PocketStatus.Closed
				}),
				"CLOSE_POCKET_DUE_TO_STOP_CONDITIONS"
			);
		}
	}

	/// @notice Deposit token to a pocket
	function deposit(string memory pocketId, uint256 amount)
		external
		nonReentrant
	{
		/// @dev verify pocket stats
		require(
			registry.isAbleToDeposit(pocketId, msg.sender),
			"Operation error: cannot deposit"
		);

		(, address baseTokenAddress, , , , , , , , ) = registry
			.getTradingInfoOf(pocketId);

		Params.UpdatePocketDepositParams memory params = Params
			.UpdatePocketDepositParams({
				id: pocketId,
				actor: msg.sender,
				tokenAddress: baseTokenAddress,
				amount: amount
			});

		/// @dev Deposit to pocket
		vault.deposit(params);

		/// @dev Update stats
		registry.updatePocketDepositStats(params, "CREDIT_DEPOSIT_BALANCE");
	}

	/// @notice Deposit token to a pocket
	function withdraw(string memory pocketId) external nonReentrant {
		require(
			registry.isAbleToWithdraw(pocketId, msg.sender),
			"Operation error: cannot withdraw pocket"
		);

		Params.UpdatePocketWithdrawalParams memory params = Params
			.UpdatePocketWithdrawalParams({id: pocketId, actor: msg.sender});

		/// @dev Withdraw from pocket
		vault.withdraw(params);

		/// @dev Update withdrawal stats
		registry.updatePocketWithdrawalStats(
			params,
			"DEBIT_WITHDRAWAL_BALANCE"
		);
	}

	/// @notice pause pocket
	function pausePocket(string memory pocketId) external {
		require(
			registry.isAbleToPause(pocketId, msg.sender),
			"Operation error: cannot pause pocket"
		);

		/// @dev Update pocket
		registry.updatePocketStatus(
			Params.UpdatePocketStatusParams({
				id: pocketId,
				actor: msg.sender,
				status: Types.PocketStatus.Paused
			}),
			"USER_PAUSED_POCKET"
		);
	}

	/// @notice restart pocket
	function restartPocket(string memory pocketId) external {
		require(
			registry.isAbleToRestart(pocketId, msg.sender),
			"Operation error: cannot restart pocket"
		);

		/// @dev Update pocket
		registry.updatePocketStatus(
			Params.UpdatePocketStatusParams({
				id: pocketId,
				actor: msg.sender,
				status: Types.PocketStatus.Active
			}),
			"USER_RESTARTED_POCKET"
		);
	}

	/// @notice close pocket
	function closePocket(string memory pocketId) external {
		require(
			registry.isAbleToClose(pocketId, msg.sender),
			"Operation error: cannot close pocket"
		);

		/// @dev Update pocket
		registry.updatePocketStatus(
			Params.UpdatePocketStatusParams({
				id: pocketId,
				actor: msg.sender,
				status: Types.PocketStatus.Closed
			}),
			"USER_CLOSED_POCKET"
		);
	}

	/// @notice Set vault
	function setVault(address vaultAddress) external onlyOwner {
		vault = PocketVault(vaultAddress);
		emit VaultUpdated(msg.sender, vaultAddress);
	}

	/// @notice Set Registry
	function setRegistry(address registryAddress) external onlyOwner {
		registry = PocketRegistry(registryAddress);
		emit RegistryUpdated(msg.sender, registryAddress);
	}

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	function initialize() public initializer {
		__Pausable_init();
		__Ownable_init();
	}

	function pause() public onlyOwner {
		_pause();
	}

	function unpause() public onlyOwner {
		_unpause();
	}
}
