"""
Blockchain network configurations for all chains supported by GlueX.
Contains chain IDs, names, RPC URLs, and other metadata.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ChainConfig:
    """Configuration for a blockchain network."""

    id: str  # GlueX identifier (e.g., "ethereum")
    name: str  # Display name (e.g., "Ethereum")
    chain_id: int  # EVM chain ID
    rpc_url: str  # Public RPC endpoint
    explorer_url: str  # Block explorer URL
    native_token: str  # Native token symbol (e.g., "ETH")
    logo: Optional[str] = None  # Logo URL or path
    is_testnet: bool = False
    color: Optional[str] = None  # Brand color for UI


# All blockchain networks supported by GlueX
CHAINS: Dict[str, ChainConfig] = {
    "ethereum": ChainConfig(
        id="ethereum",
        name="Ethereum",
        chain_id=1,
        rpc_url="https://eth.llamarpc.com",
        explorer_url="https://etherscan.io",
        native_token="ETH",
        color="#627EEA",
        is_testnet=False,
    ),

    "arbitrum": ChainConfig(
        id="arbitrum",
        name="Arbitrum One",
        chain_id=42161,
        rpc_url="https://arb1.arbitrum.io/rpc",
        explorer_url="https://arbiscan.io",
        native_token="ETH",
        color="#28A0F0",
        is_testnet=False,
    ),

    "optimism": ChainConfig(
        id="optimism",
        name="Optimism",
        chain_id=10,
        rpc_url="https://mainnet.optimism.io",
        explorer_url="https://optimistic.etherscan.io",
        native_token="ETH",
        color="#FF0420",
        is_testnet=False,
    ),

    "polygon": ChainConfig(
        id="polygon",
        name="Polygon",
        chain_id=137,
        rpc_url="https://polygon-rpc.com",
        explorer_url="https://polygonscan.com",
        native_token="MATIC",
        color="#8247E5",
        is_testnet=False,
    ),

    "base": ChainConfig(
        id="base",
        name="Base",
        chain_id=8453,
        rpc_url="https://mainnet.base.org",
        explorer_url="https://basescan.org",
        native_token="ETH",
        color="#0052FF",
        is_testnet=False,
    ),

    "bsc": ChainConfig(
        id="bsc",
        name="BNB Smart Chain",
        chain_id=56,
        rpc_url="https://bsc-dataseed.binance.org",
        explorer_url="https://bscscan.com",
        native_token="BNB",
        color="#F3BA2F",
        is_testnet=False,
    ),

    "avalanche": ChainConfig(
        id="avalanche",
        name="Avalanche C-Chain",
        chain_id=43114,
        rpc_url="https://api.avax.network/ext/bc/C/rpc",
        explorer_url="https://snowtrace.io",
        native_token="AVAX",
        color="#E84142",
        is_testnet=False,
    ),

    "gnosis": ChainConfig(
        id="gnosis",
        name="Gnosis Chain",
        chain_id=100,
        rpc_url="https://rpc.gnosischain.com",
        explorer_url="https://gnosisscan.io",
        native_token="xDAI",
        color="#04795B",
        is_testnet=False,
    ),

    "linea": ChainConfig(
        id="linea",
        name="Linea",
        chain_id=59144,
        rpc_url="https://rpc.linea.build",
        explorer_url="https://lineascan.build",
        native_token="ETH",
        color="#121212",
        is_testnet=False,
    ),

    "mantle": ChainConfig(
        id="mantle",
        name="Mantle",
        chain_id=5000,
        rpc_url="https://rpc.mantle.xyz",
        explorer_url="https://explorer.mantle.xyz",
        native_token="MNT",
        color="#000000",
        is_testnet=False,
    ),

    "scroll": ChainConfig(
        id="scroll",
        name="Scroll",
        chain_id=534352,
        rpc_url="https://rpc.scroll.io",
        explorer_url="https://scrollscan.com",
        native_token="ETH",
        color="#FFEEDA",
        is_testnet=False,
    ),

    "taiko": ChainConfig(
        id="taiko",
        name="Taiko",
        chain_id=167000,
        rpc_url="https://rpc.taiko.xyz",
        explorer_url="https://taikoscan.io",
        native_token="ETH",
        color="#E81899",
        is_testnet=False,
    ),

    "blast": ChainConfig(
        id="blast",
        name="Blast",
        chain_id=81457,
        rpc_url="https://rpc.blast.io",
        explorer_url="https://blastscan.io",
        native_token="ETH",
        color="#FCFC03",
        is_testnet=False,
    ),

    "sonic": ChainConfig(
        id="sonic",
        name="Sonic",
        chain_id=146,
        rpc_url="https://rpc.soniclabs.com",
        explorer_url="https://sonicscan.org",
        native_token="S",
        color="#0066FF",
        is_testnet=False,
    ),

    "hyperevm": ChainConfig(
        id="hyperevm",
        name="HyperEVM",
        chain_id=998,
        rpc_url="https://api.hyperliquid.xyz/evm",
        explorer_url="https://explorer.hyperliquid.xyz",
        native_token="HYPE",
        color="#00D4AA",
        is_testnet=False,
    ),

    "unichain": ChainConfig(
        id="unichain",
        name="Unichain",
        chain_id=1301,
        rpc_url="https://rpc.unichain.org",
        explorer_url="https://uniscan.xyz",
        native_token="ETH",
        color="#FF007A",
        is_testnet=False,
    ),

    "berachain": ChainConfig(
        id="berachain",
        name="Berachain",
        chain_id=80084,
        rpc_url="https://rpc.berachain.com",
        explorer_url="https://beratrail.io",
        native_token="BERA",
        color="#E8751A",
        is_testnet=False,
    ),
}


def get_chain(chain_id: str) -> Optional[ChainConfig]:
    """
    Get chain configuration by ID.

    Args:
        chain_id: Chain identifier (e.g., "ethereum", "arbitrum")

    Returns:
        ChainConfig if found, None otherwise
    """
    return CHAINS.get(chain_id.lower())


def get_chain_by_chain_id(chain_id: int) -> Optional[ChainConfig]:
    """
    Get chain configuration by EVM chain ID.

    Args:
        chain_id: EVM chain ID (e.g., 1 for Ethereum, 42161 for Arbitrum)

    Returns:
        ChainConfig if found, None otherwise
    """
    for chain in CHAINS.values():
        if chain.chain_id == chain_id:
            return chain
    return None


def get_all_chains() -> List[ChainConfig]:
    """
    Get all supported chain configurations.

    Returns:
        List of all ChainConfig objects
    """
    return list(CHAINS.values())


def get_supported_chain_ids() -> List[str]:
    """
    Get list of all supported chain IDs.

    Returns:
        List of chain ID strings (e.g., ["ethereum", "arbitrum", ...])
    """
    return list(CHAINS.keys())


def is_chain_supported(chain_id: str) -> bool:
    """
    Check if a chain is supported.

    Args:
        chain_id: Chain identifier to check

    Returns:
        True if chain is supported, False otherwise
    """
    return chain_id.lower() in CHAINS


def get_chains_from_env(env_var: str = "SUPPORTED_CHAINS") -> List[ChainConfig]:
    """
    Get chain configurations from environment variable.

    Args:
        env_var: Environment variable name containing comma-separated chain IDs

    Returns:
        List of ChainConfig objects for chains specified in env var
    """
    import os

    chain_ids_str = os.getenv(env_var, "")
    if not chain_ids_str:
        # Default to all chains if not specified
        return get_all_chains()

    chain_ids = [cid.strip().lower() for cid in chain_ids_str.split(",")]
    configs = []

    for chain_id in chain_ids:
        config = get_chain(chain_id)
        if config:
            configs.append(config)
        else:
            print(f"Warning: Chain '{chain_id}' not found in configurations")

    return configs


# Export commonly used constants
CHAIN_IDS = get_supported_chain_ids()
DEFAULT_CHAIN = "ethereum"
