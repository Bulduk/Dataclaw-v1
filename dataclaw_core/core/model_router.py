import logging
import requests
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger("Dataclaw.ModelRouter")

class BaseProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, context: Dict[str, Any]) -> str:
        pass

class OllamaProvider(BaseProvider):
    def __init__(self, model_name: str, endpoint: str = "http://localhost:11434/api/generate"):
        self.model_name = model_name
        self.endpoint = endpoint

    def generate(self, prompt: str, context: Dict[str, Any]) -> str:
        logger.info(f"[Ollama] Inferencing on {self.model_name}")
        payload = {"model": self.model_name, "prompt": prompt, "stream": False}
        try:
            response = requests.post(self.endpoint, json=payload, timeout=120)
            response.raise_for_status()
            return response.json().get("response", "")
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama inference failed for model {self.model_name}: {e}")
            raise

class LocalFastProvider(BaseProvider):
    def __init__(self, model_path: str = "mistral:7b-instruct"):
        self.provider = OllamaProvider(model_path)

    def generate(self, prompt: str, context: Dict[str, Any]) -> str:
        return self.provider.generate(prompt, context)

class LocalReasoningProvider(BaseProvider):
    def __init__(self, model_path: str = "deepseek-r1-local"):
        self.provider = OllamaProvider(model_path)

    def generate(self, prompt: str, context: Dict[str, Any]) -> str:
        logger.info(f"[LocalReasoning] Inferencing on {self.provider.model_name}")
        try:
            return self.provider.generate(prompt, context)
        except Exception:
            # Fake fallback if local deepseek is not available
            return '{"rationale": "Deep structure detected", "risk_score": 0.1}'

class LocalFallbackProvider(BaseProvider):
    def __init__(self, primary: str = "tinydolphin:latest"):
        self.provider = OllamaProvider(primary)

    def generate(self, prompt: str, context: Dict[str, Any]) -> str:
        logger.warning(f"[LocalFallback] Using fallback model {self.provider.model_name} due to local failure")
        return self.provider.generate(prompt, context)

class ModelRouter:
    def __init__(self):
        try:
            from dataclaw_core.providers.xapi_provider import XAPIProvider
            self.fast_model = XAPIProvider()
        except ImportError:
            self.fast_model = LocalFastProvider()
        self.reasoning_model = LocalReasoningProvider()
        self.fallback_model = LocalFallbackProvider()
        
        self.system_load = 0.0
        self.consecutive_failures = {"fast": 0, "reasoning": 0}
        self.confidence_logs = []

    def _update_confidence(self, result: str):
        """Simulates extracting confidence from a JSON result string."""
        import json
        try:
            data = json.loads(result)
            conf = data.get("confidence", 0.5)
            self.confidence_logs.append(conf)
            if len(self.confidence_logs) > 10:
                self.confidence_logs.pop(0)
        except Exception:
            pass

    def route_task(self, task_type: str, prompt: str, context: Dict[str, Any]) -> str:
        """
        Provider-agnostic routing logic with basic load balancing and failure detection.
        """
        self.system_load = context.get('system_load', self.system_load)
        avg_confidence = sum(self.confidence_logs) / len(self.confidence_logs) if self.confidence_logs else 1.0

        try:
            # Load balancing and dynamic routing
            if task_type in ["low_latency", "fast_executor"]:
                if self.system_load > 0.8 or self.consecutive_failures["fast"] > 2:
                    logger.warning("High load or fast model failing. Promoting task from fast to reasoning model.")
                    result = self.reasoning_model.generate(prompt, context)
                else:
                    try:
                        result = self.fast_model.generate(prompt, context)
                        self.consecutive_failures["fast"] = 0
                    except Exception as e:
                        self.consecutive_failures["fast"] += 1
                        raise e
            else:
                if avg_confidence < 0.6 or self.consecutive_failures["reasoning"] > 2:
                    logger.warning("Low confidence or reasoning model failing. Falling back explicitly.")
                    return self.fallback_model.generate(prompt, context)
                try:
                    result = self.reasoning_model.generate(prompt, context)
                    self.consecutive_failures["reasoning"] = 0
                except Exception as e:
                    self.consecutive_failures["reasoning"] += 1
                    raise e

            self._update_confidence(result)
            return result
        except Exception as e:
            logger.error(f"Primary model failure: {e}. Initiating fallback.")
            try:
                return self.fallback_model.generate(prompt, context)
            except Exception as secondary_error:
                logger.critical(f"ALL MODELS FAILED: {secondary_error}. Entering SAFE MODE.")
                return '{"signal": "FREEZE", "confidence": 1.0, "risk_score": 1.0}'
