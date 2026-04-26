import logging
import sys

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger("Dataclaw.Main")

from dataclaw_core.core.model_router import ModelRouter
from dataclaw_core.core.black_swan_guard import BlackSwanGuard
from dataclaw_core.super_core.swarm_orchestrator import SwarmOrchestrator, MetaGovernor
from dataclaw_core.agents.signal_agent import DistributedSignalAgent
from dataclaw_core.agents.mirofish import Mirofish
from dataclaw_core.agents.betafish import Betafish
from dataclaw_core.memory.episodic_memory import EpisodicMemory
from dataclaw_core.plugins.plugin_loader import PluginRegistry

def main():
    logger.info("Initializing Dataclaw Autonomous Agent OS...")
    
    # 1. Initialize Core Subsystems
    router = ModelRouter()
    guard = BlackSwanGuard(max_drawdown_percent=10.0, volatility_spike_threshold=4.0)
    memory = EpisodicMemory()
    registry = PluginRegistry()
    
    # 2. Setup Plugins
    registry.discover_plugins()
    
    # 3. Initialize Swarm
    swarm = SwarmOrchestrator()
    swarm.register_agent(DistributedSignalAgent("AlphaHunter", router))
    
    mirofish = Mirofish("Mirofish", router, memory)
    swarm.register_agent(mirofish)
    
    betafish = Betafish("Betafish")
    swarm.register_agent(betafish)

    governor = MetaGovernor(swarm)
    
    # 4. Simulation Loop
    import json
    logger.info(f"Orchestrator System Status: {json.dumps(swarm.get_system_status(), indent=2)}")
    
    logger.info("Starting simulation loop...")
    market_data = {"price": 94000, "volatility_z_score": 1.2, "exchange_latency_ms": 150}
    portfolio = {"current_drawdown": 1.5}
    
    # Check Black Swan Guard
    guard_status = guard.monitor(portfolio, market_data)
    
    # Arbitrate
    decision_payload = governor.arbitrate(market_data, guard_status)
    
    # Memory record
    if decision_payload["final_action"] != "HOLD":
        memory.record_trade({"strategy": "AlphaHunter", "action": decision_payload["final_action"], "pnl": 0.0})
    
    logger.info(f"System Output Matrix: {decision_payload}")

if __name__ == '__main__':
    main()
