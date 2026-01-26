"""
Ollama Service - Integration with Qwen3-VL model
"""
import httpx
import base64
from pathlib import Path
from typing import Optional
import json
import re


class OllamaService:
    def __init__(self, host: str = "http://localhost:11434"):
        self.host = host
        self.model = "qwen3-vl:4b"
    
    async def encode_image(self, image_bytes: bytes) -> str:
        """Encode image bytes to base64"""
        return base64.b64encode(image_bytes).decode('utf-8')
    
    async def detect_object(self, image_bytes: bytes) -> dict:
        """Detect object, brand, model, and condition from image"""
        base64_image = await self.encode_image(image_bytes)
        
        prompt = """Analyze this image carefully and identify any damage or issues.

CRITICAL: Look for these specific problems:
- BROKEN parts (detached, disconnected, snapped, separated components)
- CRACKED or fractured materials
- MISSING pieces or components
- BENT, warped, or deformed parts
- TORN, ripped, or worn materials
- RUST, corrosion, or oxidation
- LOOSE connections or wobbly parts

Provide the following information in JSON format:
{
    "object": "specific name of the object/item",
    "brand": "brand name if visible, otherwise 'Unknown'",
    "model": "model name/number if visible, otherwise 'Unknown'",
    "condition": "new/good/used/damaged/broken",
    "issues": ["list ALL visible issues, defects, and damage - be specific about what is broken or damaged"],
    "description": "brief description including the main problem"
}

CONDITION GUIDE:
- "broken" = parts are detached, disconnected, snapped, or non-functional
- "damaged" = visible cracks, dents, rust, tears, but still attached
- "used" = wear and tear but fully functional
- "good" = minimal wear, fully functional
- "new" = no wear, like new condition

If something is DETACHED or DISCONNECTED, the condition MUST be "broken".

IMPORTANT: Respond ONLY with the JSON, no other text. Do not use markdown formatting."""

        response = await self._generate(prompt, [base64_image])
        return self._parse_json_response(response, "object")
    
    async def extract_serial(self, image_bytes: bytes) -> dict:
        """Extract serial number and manufacturer info from image"""
        base64_image = await self.encode_image(image_bytes)
        
        prompt = """Look at this image and extract any serial number, model number, or identification codes visible.
Respond in JSON format:
{
    "serial_number": "the serial number if found, otherwise 'Not Found'",
    "model_number": "model number if different from serial, otherwise 'Not Found'",
    "manufacturer": "manufacturer name if visible, otherwise 'Unknown'",
    "other_codes": ["any other codes or numbers visible"]
}

IMPORTANT: Respond ONLY with the JSON, no other text. Do not use markdown formatting."""

        response = await self._generate(prompt, [base64_image])
        return self._parse_json_response(response, "serial")
    
    async def combined_detection(self, item_image: bytes, serial_image: Optional[bytes] = None) -> dict:
        """Combined detection from multiple images"""
        # First, detect the object
        object_result = await self.detect_object(item_image)
        
        # Then extract serial if provided
        serial_result = {"serial_number": "Not Provided", "model_number": "Not Found", "manufacturer": "Unknown", "other_codes": []}
        if serial_image:
            serial_result = await self.extract_serial(serial_image)
        
        # Combine results
        return {
            "object": object_result.get("object", "Unknown"),
            "brand": object_result.get("brand", "Unknown"),
            "model": serial_result.get("model_number", object_result.get("model", "Unknown")),
            "serial_number": serial_result.get("serial_number", "Not Found"),
            "manufacturer": serial_result.get("manufacturer", object_result.get("brand", "Unknown")),
            "condition": object_result.get("condition", "Unknown"),
            "issues": object_result.get("issues", []),
            "description": object_result.get("description", ""),
            "other_codes": serial_result.get("other_codes", []),
            "confidence_note": "Please verify these details - AI detection may not be 100% accurate"
        }
    
    async def _generate(self, prompt: str, images: list[str]) -> str:
        """Send request to Ollama API"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.host}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "images": images,
                    "stream": False,
                    "options": {
                        "temperature": 0.1  # Low temperature for more consistent output
                    }
                }
            )
            response.raise_for_status()
            return response.json().get("response", "")
    
    def _parse_json_response(self, response: str, response_type: str) -> dict:
        """Parse JSON from model response, handling potential formatting issues"""
        try:
            # Try to find JSON in the response
            # Remove markdown code blocks if present
            cleaned = response.strip()
            cleaned = re.sub(r'^```json\s*', '', cleaned)
            cleaned = re.sub(r'^```\s*', '', cleaned)
            cleaned = re.sub(r'\s*```$', '', cleaned)
            
            # Find JSON object
            start = cleaned.find('{')
            end = cleaned.rfind('}') + 1
            if start != -1 and end > start:
                json_str = cleaned[start:end]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass
        
        # Return default structure if parsing fails
        if response_type == "object":
            return {
                "object": "Detection failed",
                "brand": "Unknown",
                "model": "Unknown",
                "condition": "Unknown",
                "issues": [],
                "description": response[:200] if response else "Could not parse response"
            }
        else:
            return {
                "serial_number": "Not Found",
                "model_number": "Not Found",
                "manufacturer": "Unknown",
                "other_codes": [],
                "raw_response": response[:200] if response else "Could not parse response"
            }


# Singleton instance
ollama_service = OllamaService()
