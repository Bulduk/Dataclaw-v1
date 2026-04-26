import logging
import json
from typing import Dict, Any
from dataclaw_core.super_core.swarm_orchestrator import AgentNode
from dataclaw_core.memory.episodic_memory import EpisodicMemory

logger = logging.getLogger("Dataclaw.Mirofish")

class Mirofish(AgentNode):
    """
    Mirofish integrates with Episodic Memory to record trade outcomes 
    and agent errors, using this data to provide feedback to the Strategy Mutator.
    """
    def __init__(self, name: str, router: Any, memory: EpisodicMemory):
        super().__init__(name, role="signal_and_feedback", capabilities=["signal", "reinforcement"])
        self.router = router
        self.memory = memory

    def get_signal(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[{self.name}] Analyzing market data and querying memory...")
        
        # Incorporate memory feedback into decision
        feedback_data = self.memory.feedback_loop()
        
        prompt = f"""
        Analyze current market data combining episodic memory feedback logic.
        Data: {json.dumps(market_data)}
        Memory Feedback: {json.dumps(feedback_data)}
        Respond in JSON: {{"signal": "BUY|SELL|HOLD", "confidence": 0.0-1.0, "rationale": "..."}}
        """

        try:
            response_str = self.router.route_task(
                task_type="deep_reasoning",
                prompt=prompt,
                context=market_data
            )
            data = json.loads(response_str)
            return {
                "signal": data.get("signal", "HOLD"),
                "confidence": data.get("confidence", 0.5),
                "rationale": data.get("rationale", "Mirofish reasoned with memory."),
                "risk_score": 0.4
            }
        except Exception as e:
            self.memory.record_error({"agent": self.name, "error_type": "RouteTaskError", "message": str(e)})
            logger.error(f"[{self.name}] Failed to get strategy. Recorded error to memory.")
            return {"signal": "HOLD", "confidence": 0.0, "rationale": "Error analyzing", "risk_score": 1.0}

    def process_trade_outcome(self, trade_event: Dict[str, Any]):
        """Records outcomes into memory."""
        try:
            self.memory.record_trade(trade_event)
        except Exception as e:
            self.memory.record_error({"agent": self.name, "error_type": "RecordTradeError", "message": str(e)})
            logger.error(f"[{self.name}] Error recording outcome: {e}")
