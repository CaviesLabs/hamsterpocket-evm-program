// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@uniswap/universal-router/contracts/libraries/Commands.sol";
import "@uniswap/universal-router/contracts/libraries/Constants.sol";

import "./PocketRegistry.sol";

import "./Types.sol";
import "./Params.sol";

interface UniversalRouter {
	function execute(
		bytes calldata commands,
		bytes[] calldata inputs,
		uint256 deadline
	) external payable;
}

interface IPermit2 {
	function approve(
		address token,
		address spender,
		uint160 amount,
		uint48 expiration
	) external;
}

contract PocketVault is
	Initializable,
	PausableUpgradeable,
	ReentrancyGuardUpgradeable,
	OwnableUpgradeable
{
	using SafeMathUpgradeable for uint256;

	/// @dev Declare pocket registry
	PocketRegistry public registry;
	IPermit2 public permit2;

	/// @dev RegistryUpdated emitted event
	event RegistryUpdated(address indexed actor, address indexed registry);
	event Permit2Updated(address indexed actor, address indexed permit2);

	/// @dev Emit Withdrawn whenever a withdrawal happens
	event Withdrawn(
		address indexed actor,
		string indexed pocketId,
		address baseTokenAddress,
		uint256 baseTokenAmount,
		address targetTokenAddress,
		uint256 targetTokenAmount
	);

	/// @dev Emit Deposited whenever a deposit happens
	event Deposited(
		address indexed actor,
		string indexed pocketId,
		address indexed tokenAddress,
		uint256 amount
	);

	/// @dev Emit ClosedPosition whenever a position is closed
	event ClosedPosition(
		address indexed actor,
		string indexed pocketId,
		address baseTokenAddress,
		uint256 baseTokenAmount,
		address targetTokenAddress,
		uint256 targetTokenAmount
	);

	/// @dev Emit Swapped whenever a swap happens
	event Swapped(
		address indexed actor,
		string indexed pocketId,
		address baseTokenAddress,
		uint256 baseTokenAmount,
		address targetTokenAddress,
		uint256 targetTokenAmount
	);

	/// @notice Modifier to verify only permitted actor can perform the operation
	modifier onlyRelayer() {
		require(
			registry.hasRole(registry.RELAYER(), msg.sender),
			"Permission: only relayer is permitted"
		);

		_;
	}

	/// @dev Make swap leverages uniswap universal router
	function makeSwap(
		address router,
		address baseTokenAddress,
		address targetTokenAddress,
		uint256 amount
	) private returns (uint256) {
		IERC20(baseTokenAddress).approve(address(permit2), amount);
		permit2.approve(
			baseTokenAddress,
			router,
			uint160(amount),
			uint48(block.timestamp)
		);

		bytes memory commands = abi.encodePacked(
			bytes1(uint8(Commands.V3_SWAP_EXACT_IN))
		);
		address[] memory path = new address[](2);
		path[0] = baseTokenAddress;
		path[1] = targetTokenAddress;
		bytes[] memory inputs = new bytes[](1);
		inputs[0] = abi.encode(Constants.MSG_SENDER, amount, 0, path, true);

		uint256 beforeBalance = IERC20(baseTokenAddress).balanceOf(
			address(this)
		);
		UniversalRouter(router).execute(commands, inputs, block.timestamp);

		return
			IERC20(baseTokenAddress).balanceOf(address(this)).sub(
				beforeBalance
			);
	}

	/// @notice Make DCA swap for the given pocket pocket
	function makeDCASwap(string calldata pocketId)
		external
		onlyRelayer
		nonReentrant
		returns (uint256, uint256)
	{
		/// @dev Extract necessary info
		(
			address ammRouterAddress,
			address baseTokenAddress,
			address targetTokenAddress,
			,
			uint256 batchVolume,
			,
			,
			,
			,

		) = registry.getTradingInfoOf(pocketId);

		uint256 amountOut = makeSwap(
			ammRouterAddress,
			baseTokenAddress,
			targetTokenAddress,
			batchVolume
		);

		/// @dev Emit event
		emit Swapped(
			msg.sender,
			pocketId,
			baseTokenAddress,
			batchVolume,
			targetTokenAddress,
			amountOut
		);

		/// @dev Return amount in and amount out
		return (batchVolume, amountOut);
	}

	/// @notice Make close position for the given pocket
	function closePosition(string calldata pocketId)
		external
		onlyRelayer
		nonReentrant
		returns (uint256, uint256)
	{
		/// @dev Extract necessary info
		(
			address ammRouterAddress,
			address baseTokenAddress,
			address targetTokenAddress,
			,
			,
			,
			,
			,
			,

		) = registry.getTradingInfoOf(pocketId);
		(, uint256 targetTokenBalance) = registry.getBalanceInfoOf(pocketId);

		uint256 amountOut = makeSwap(
			ammRouterAddress,
			targetTokenAddress,
			baseTokenAddress,
			targetTokenBalance
		);

		/// @dev Emit event
		emit ClosedPosition(
			msg.sender,
			pocketId,
			baseTokenAddress,
			amountOut,
			targetTokenAddress,
			targetTokenBalance
		);

		/// @dev Return amount in and amount out
		return (targetTokenBalance, amountOut);
	}

	/// @notice withdraw
	function withdraw(Params.UpdatePocketWithdrawalParams calldata params)
		external
		onlyRelayer
		nonReentrant
	{
		/// @dev Withdraw tokens
		(
			,
			address baseTokenAddress,
			address targetTokenAddress,
			,
			,
			,
			,
			,
			,

		) = registry.getTradingInfoOf(params.id);
		(uint256 baseTokenBalance, uint256 targetTokenBalance) = registry
			.getBalanceInfoOf(params.id);
		address owner = registry.getOwnerOf(params.id);

		require(
			IERC20(baseTokenAddress).transfer(owner, baseTokenBalance),
			"Error: cannot transfer token"
		);
		require(
			IERC20(targetTokenAddress).transfer(owner, targetTokenBalance),
			"Error: cannot transfer token"
		);

		/// @dev Emit event
		emit Withdrawn(
			owner,
			params.id,
			baseTokenAddress,
			baseTokenBalance,
			targetTokenAddress,
			targetTokenBalance
		);
	}

	/// @notice Deposit
	function deposit(Params.UpdatePocketDepositParams calldata params)
		external
		onlyRelayer
		nonReentrant
	{
		/// @dev Use msg.sender instead of params.actor so that we can deposit token from the PocketChef.
		require(
			IERC20(params.tokenAddress).transferFrom(
				msg.sender,
				address(this),
				params.amount
			),
			"Error: cannot transfer token"
		);

		/// @dev Emit event
		emit Deposited(
			msg.sender,
			params.id,
			params.tokenAddress,
			params.amount
		);
	}

	/// @notice Set registry address
	function setRegistry(address registryAddress) external onlyOwner {
		registry = PocketRegistry(registryAddress);
		emit RegistryUpdated(msg.sender, registryAddress);
	}

	/// @notice Set registry address
	function setPermit2(address permit2Address) external onlyOwner {
		permit2 = IPermit2(permit2Address);
		emit Permit2Updated(msg.sender, permit2Address);
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
