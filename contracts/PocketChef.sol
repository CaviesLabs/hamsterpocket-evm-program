// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";

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
	OwnableUpgradeable,
	MulticallUpgradeable
{
	PocketRegistry public registry;
	PocketVault public vault;

	/// @notice Events
	event VaultUpdated(address indexed actor, address updatedAddress);
	event RegistryUpdated(address indexed actor, address updatedAddress);

	/// @notice create pocket
	function createPocket(Params.CreatePocketParams calldata params) public {
		require(params.owner == msg.sender, "Invalid pocket: owner mismatches");
		registry.initializeUserPocket(params);
	}

	/// @notice create pocket
	function createPocketAndDepositEther(
		Params.CreatePocketParams calldata params
	) external payable {
		/// @dev Create pocket
		createPocket(params);

		/// @dev Calling deposit ether
		depositEther(params.id);
	}

	/// @notice create pocket
	function createPocketAndDepositToken(
		Params.CreatePocketParams calldata params,
		uint256 depositAmount
	) external {
		/// @dev Create pocket
		createPocket(params);

		/// @dev Calling deposit ether
		depositToken(params.id, depositAmount);
	}

	/// @notice Update pocket data
	function updatePocket(Params.UpdatePocketParams calldata params) external {
		require(
			registry.isAbleToUpdate(params.id, msg.sender),
			"Operation error: the pocket is not able to update"
		);

		registry.updatePocket(params, "USER_UPDATE_POCKET");
	}

	/// @notice Make DCA swap
	function tryClosingPosition(string calldata pocketId)
		external
		nonReentrant
	{
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
			"OPERATOR_UPDATED_CLOSING_POSITION_STATS"
		);
	}

	/// @notice Make DCA swap
	function tryMakingDCASwap(string calldata pocketId) external nonReentrant {
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
			"OPERATOR_UPDATED_TRADING_STATS"
		);

		/// @dev Check whether should stop pocket
		if (registry.shouldClosePocket(pocketId)) {
			registry.updatePocketStatus(
				Params.UpdatePocketStatusParams({
					id: pocketId,
					actor: msg.sender,
					status: Types.PocketStatus.Closed
				}),
				"OPERATOR_CLOSED_POCKET_DUE_TO_STOP_CONDITIONS"
			);
		}
	}

	/// @dev Wrap ether
	function depositEther(string calldata pocketId)
		public
		payable
		nonReentrant
	{
		/// @dev Verify amount
		uint256 amount = msg.value;
		require(amount > 0, "Operation error: invalid amount");

		/// @dev verify pocket stats
		require(
			registry.isAbleToDeposit(pocketId, msg.sender),
			"Operation error: cannot deposit"
		);

		(, address baseTokenAddress, , , , , , , , ) = registry
			.getTradingInfoOf(pocketId);

		/// @dev Wrap ether here
		IWETH9(baseTokenAddress).deposit{value: amount}();

		/// @dev Approve vault to be able to spend an amount of base token
		IERC20(baseTokenAddress).approve(address(vault), amount);

		/// @dev Construct params
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
		registry.updatePocketDepositStats(params, "USER_DEPOSITED_FUND");
	}

	/// @notice Deposit token to a pocket
	function depositToken(string calldata pocketId, uint256 amount)
		public
		nonReentrant
	{
		/// @dev verify pocket stats
		require(
			registry.isAbleToDeposit(pocketId, msg.sender),
			"Operation error: cannot deposit"
		);

		(, address baseTokenAddress, , , , , , , , ) = registry
			.getTradingInfoOf(pocketId);

		/// @dev Spend user token
		require(
			IERC20(baseTokenAddress).transferFrom(
				msg.sender,
				address(this),
				amount
			),
			"Operation error: cannot deposit"
		);

		/// @dev Approve vault to be able to spend an amount of base token
		IERC20(baseTokenAddress).approve(address(vault), amount);

		/// @dev Construct params
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
		registry.updatePocketDepositStats(params, "USER_DEPOSITED_FUND");
	}

	/// @notice Deposit token to a pocket
	function withdraw(string calldata pocketId) external nonReentrant {
		require(
			registry.isAbleToWithdraw(pocketId, msg.sender),
			"Operation error: cannot withdraw pocket fund"
		);

		Params.UpdatePocketWithdrawalParams memory params = Params
			.UpdatePocketWithdrawalParams({id: pocketId, actor: msg.sender});

		/// @dev Withdraw from pocket
		vault.withdraw(params);

		/// @dev Update withdrawal stats
		registry.updatePocketWithdrawalStats(params, "USER_WITHDREW_FUND");
	}

	/// @notice pause pocket
	function pausePocket(string calldata pocketId) external {
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
	function restartPocket(string calldata pocketId) external {
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
	function closePocket(string calldata pocketId) external {
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
		__ReentrancyGuard_init();
		__Multicall_init();
	}

	function pause() public onlyOwner {
		_pause();
	}

	function unpause() public onlyOwner {
		_unpause();
	}
}
