import json
import logging
import redis
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class RedisEventBus:
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_url = redis_url
        self.client = None
        self.pubsub = None
        self._connect()

    def _connect(self):
        try:
            self.client = redis.Redis.from_url(self.redis_url, decode_responses=True)
            self.pubsub = self.client.pubsub()
            logger.info(f"Connected to Redis at {self.redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")

    def publish(self, table: str, operation: str, payload: Dict[str, Any]):
        if not self.client:
            return
        
        event = {
            "table": table,
            "operation": operation,
            "payload": payload
        }
        channel = f"dataclaw:{table}:{operation}"
        try:
            self.client.publish(channel, json.dumps(event))
            # Also publish to a global firehose
            self.client.publish("dataclaw:firehose", json.dumps(event))
        except Exception as e:
            logger.error(f"Failed to publish to Redis: {e}")

    def subscribe(self, channel: str, callback):
        if not self.pubsub:
            return
        
        try:
            self.pubsub.subscribe(**{channel: callback})
            self.pubsub.run_in_thread(sleep_time=0.01)
            logger.info(f"Subscribed to {channel}")
        except Exception as e:
            logger.error(f"Failed to subscribe to Redis: {e}")
            
    def emit_signal(self, payload: Dict[str, Any]):
        self.publish("signals", "INSERT", payload)

    def emit_trade(self, payload: Dict[str, Any]):
        self.publish("trade_history", "INSERT", payload)
        
    def emit_memory_update(self, payload: Dict[str, Any]):
        self.publish("agent_memory", "UPDATE", payload)
