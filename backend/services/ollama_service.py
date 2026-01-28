"""
Ollama Service - Integration with Qwen3-VL model using direct HTTP
Optimized for RTX 4050 6GB VRAM with live video streaming support
"""
import asyncio
import base64
import io
import json
import re
from typing import Optional, AsyncGenerator
from PIL import Image
import httpx

class OllamaService:
    def __init__(self, host: str = "http://localhost:11434"):
        self.host = host
        self.model = "qwen3-vl:4b"
        # Reuse HTTP client with connection pooling for speed
        self._client = None
        # Lock to prevent concurrent inference (DROP policy for live video)
        self._is_processing = False
        
        # Options for LIVE video ONLY (balanced for speed + accuracy)
        self._live_inference_options = {
            "num_ctx": 4096,      # Larger context for better analysis
            "num_predict": 2000,  # Much more tokens to ensure output after thinking
            "temperature": 0.3,   # Slightly higher for better reasoning
            "top_p": 0.9,
            "num_gpu": 99,
        }
        # Regular detection uses Ollama defaults (no restrictions)
    
    async def warmup(self):
        """Warm up the model by loading it into VRAM"""
        try:
            print("🔥 Warming up Ollama model...")
            client = await self.get_client()
            # Simple request to load model into memory
            payload = {
                "model": self.model,
                "prompt": "Hello",
                "stream": False,
                "options": {"num_predict": 1}
            }
            await client.post(f"{self.host}/api/generate", json=payload)
            print("✅ Model warmed up and ready")
        except Exception as e:
            print(f"⚠️ Warmup failed (model will load on first request): {e}")
    
    async def get_client(self) -> httpx.AsyncClient:
        """Get or create reusable HTTP client"""
        if self._client is None or self._client.is_closed:
            # Disable proxy for localhost to avoid connection issues
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(120.0, connect=10.0),
                limits=httpx.Limits(max_keepalive_connections=5),
                proxy=None,  # Bypass any system proxy
                trust_env=False  # Don't use HTTP_PROXY env vars
            )
        return self._client
    
    async def process_image(self, image_bytes: bytes, max_size: int = 1024) -> bytes:
        """Resize image to optimize performance while maintaining quality"""
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._resize_image_sync, image_bytes, max_size)
        except Exception as e:
            print(f"Image processing error: {e}")
            return image_bytes
            
    def _resize_image_sync(self, image_bytes: bytes, max_size: int) -> bytes:
        """Synchronous image resizing helper - optimized for quality"""
        with Image.open(io.BytesIO(image_bytes)) as img:
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Calculate new size maintaining aspect ratio
            ratio = min(max_size / img.width, max_size / img.height)
            if ratio < 1.0:
                new_size = (int(img.width * ratio), int(img.height * ratio))
                # Use LANCZOS for better quality (important for damage detection)
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Save to bytes with higher quality for better detection
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=90, optimize=True)
            return output.getvalue()
    
    async def process_image_fast(self, image_bytes: bytes) -> bytes:
        """Fast image processing for live video - larger size (672px) for better accuracy"""
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._resize_image_sync, image_bytes, 672)
        except Exception as e:
            print(f"Fast image processing error: {e}")
            return image_bytes
    
    def check_image_quality(self, image_bytes: bytes) -> dict:
        """Quick quality check for live frames"""
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                # Check if image is too dark or too bright
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Sample pixels for quick brightness check
                pixels = list(img.getdata())
                if len(pixels) > 1000:
                    pixels = pixels[::len(pixels)//1000]  # Sample ~1000 pixels
                
                avg_brightness = sum(sum(p) for p in pixels) / (len(pixels) * 3)
                
                return {
                    "valid": 30 < avg_brightness < 240,
                    "brightness": avg_brightness,
                    "size": img.size
                }
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def detect_object_live(self, image_bytes: bytes) -> dict:
        """Fast detection for live video - simple direct prompt"""
        # DROP policy: skip if already processing
        if self._is_processing:
            return {"skipped": True, "reason": "busy"}
        
        self._is_processing = True
        try:
            optimized_image = await self.process_image_fast(image_bytes)
            
            # Very direct prompt
            prompt = """What item is this and what's broken? Reply with JSON only:
{"object":"item name","brand":"","model":"","condition":"broken or good","issues":["what is broken"],"description":"brief description"}

/no_think"""
            
            response = await self._generate_live(prompt, [optimized_image])
            result = self._parse_json_response(response, "object")
            result["skipped"] = False
            return result
        finally:
            self._is_processing = False
    
    async def stream_detect_live(self, image_bytes: bytes) -> AsyncGenerator[str, None]:
        """Stream detection results for live video with token-by-token output"""
        print(f"🎬 stream_detect_live called, _is_processing={self._is_processing}")
        
        if self._is_processing:
            print("⏭️ Skipping - already processing")
            yield '{"skipped": true, "reason": "busy"}'
            return
        
        self._is_processing = True
        try:
            optimized_image = await self.process_image_fast(image_bytes)
            image_b64 = base64.b64encode(optimized_image).decode('utf-8')
            print(f"🖼️ Live image prepared: {len(image_b64)} chars")
            
            # Very direct prompt - no explanation needed, just JSON
            prompt = """What item is this and what's broken? Reply with JSON only:
{"object":"item name","brand":"","model":"","condition":"broken or good","issues":["what is broken"],"description":"brief description"}

/no_think"""
            
            payload = {
                "model": self.model,
                "prompt": prompt,
                "images": [image_b64],
                "stream": True,
                "options": self._live_inference_options
            }
            
            print(f"🔧 Live options: {self._live_inference_options}")
            
            client = await self.get_client()
            print(f"📤 Sending streaming request to Ollama...")
            
            async with client.stream("POST", f"{self.host}/api/generate", json=payload) as response:
                print(f"📥 Stream response status: {response.status_code}")
                line_count = 0
                async for line in response.aiter_lines():
                    line_count += 1
                    if line:
                        try:
                            data = json.loads(line)
                            token = data.get("response", "")
                            done = data.get("done", False)
                            done_reason = data.get("done_reason", "")
                            
                            if done:
                                print(f"✅ Stream done: reason={done_reason}, lines={line_count}")
                            
                            if token:
                                yield token
                        except json.JSONDecodeError as e:
                            print(f"⚠️ JSON decode error: {e}, line: {line[:100]}")
                            continue
                
                print(f"📊 Total lines received: {line_count}")
                
        except Exception as e:
            print(f"❌ stream_detect_live error: {e}")
            import traceback
            traceback.print_exc()
            yield f'{{"error": "{str(e)}"}}'
        finally:
            self._is_processing = False
            print(f"🎬 stream_detect_live finished, _is_processing reset to False")
    
    async def detect_object(self, image_bytes: bytes) -> dict:
        """Detect object, brand, model, and condition from image"""
        optimized_image = await self.process_image(image_bytes)
        
        prompt = """Analyze this image of an item that may need repair.

First, describe what you see in detail:
- What type of object is this?
- Describe the physical state of each visible part
- Note any irregularities, asymmetry, or unusual positioning

Then answer these YES/NO questions:
1. Are all parts properly connected and attached?
2. Is there any visible crack, break, or fracture?
3. Are there any bent, warped, or misaligned parts?
4. Is anything missing or detached?
5. Are there signs of wear like scratches, dents, or discoloration?

Based on your analysis, provide this JSON:
{
    "object": "What this item is (e.g., wireless headphones, laptop, phone)",
    "brand": "Brand name if visible, otherwise empty string",
    "model": "Model number if visible, otherwise empty string",
    "condition": "broken OR damaged OR worn OR good",
    "issues": ["List each problem you found with its location"],
    "description": "Summary of item and main issue"
}

Use "broken" if parts are detached/snapped. Use "damaged" if cracked/bent but attached.
Use "worn" for cosmetic wear. Use "good" ONLY if nothing wrong.

Output valid JSON only.

/no_think"""

        response = await self._generate(prompt, [optimized_image])
        return self._parse_json_response(response, "object")
    
    async def extract_serial(self, image_bytes: bytes) -> dict:
        """Extract serial number and manufacturer info from image"""
        optimized_image = await self.process_image(image_bytes, max_size=1024)
        
        prompt = """Extract product identifiers from this label image.

OUTPUT JSON ONLY:
{
    "serial_number": "SN value or 'Not Found'",
    "model_number": "Model or 'Not Found'",
    "manufacturer": "Company or 'Unknown'",
    "other_codes": ["FCC ID", "other codes"]
}

/no_think"""

        response = await self._generate(prompt, [optimized_image])
        return self._parse_json_response(response, "serial")
    
    async def combined_detection(self, item_image: bytes, serial_image: Optional[bytes] = None) -> dict:
        """Combined detection from multiple images - Concurrent processing"""
        item_task = asyncio.create_task(self.detect_object(item_image))
        
        serial_result = {"serial_number": "Not Provided", "model_number": "Not Found", "manufacturer": "Unknown", "other_codes": []}
        
        if serial_image:
            serial_task = asyncio.create_task(self.extract_serial(serial_image))
            object_result, serial_result = await asyncio.gather(item_task, serial_task)
        else:
            object_result = await item_task
        
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
            "confidence_note": "AI detection may not be 100% accurate - please verify."
        }
    
    async def _generate(self, prompt: str, images: list[bytes]) -> str:
        """Send request using reusable HTTP client for speed - with VRAM-safe options"""
        try:
            # Convert images to base64
            images_b64 = [base64.b64encode(img).decode('utf-8') for img in images]
            
            print(f"🔍 _generate called: {len(images)} images, prompt length: {len(prompt)}")
            print(f"🔍 Image sizes (base64): {[len(i) for i in images_b64]}")
            
            # NO options = use Ollama defaults (no token limits)
            payload = {
                "model": self.model,
                "prompt": prompt,
                "images": images_b64,
                "stream": False
            }
            
            client = await self.get_client()
            print(f"🔍 Sending request to {self.host}/api/generate...")
            response = await client.post(
                f"{self.host}/api/generate",
                json=payload
            )
            print(f"🔍 Response status: {response.status_code}")
            response.raise_for_status()
            
            response_data = response.json()
            result = response_data.get('response', '')
            done_reason = response_data.get('done_reason', 'unknown')
            print(f"Ollama raw response length: {len(result)} chars, done_reason: {done_reason}")
            
            # If response is empty but thinking exists, extract it
            if not result and response_data.get('thinking'):
                print(f"🔍 Thinking found: {response_data.get('thinking', '')[:200]}")
            
            return result
        except httpx.HTTPStatusError as e:
            print(f"Ollama HTTP error: {e}")
            raise
        except Exception as e:
            print(f"Ollama generate error: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    async def _generate_live(self, prompt: str, images: list[bytes]) -> str:
        """Optimized generation for live video - non-streaming for simpler parsing"""
        try:
            images_b64 = [base64.b64encode(img).decode('utf-8') for img in images]
            
            payload = {
                "model": self.model,
                "prompt": prompt,
                "images": images_b64,
                "stream": False,
                "options": self._live_inference_options  # Use live options for speed
            }
            
            client = await self.get_client()
            response = await client.post(f"{self.host}/api/generate", json=payload)
            response.raise_for_status()
            return response.json().get('response', '')
        except Exception as e:
            print(f"Live generate error: {e}")
            return '{"error": "' + str(e) + '"}'
    
    async def chat_response(
        self, 
        user_message: str, 
        context: dict = None,
        recent_messages: list = None,
        conversation_context: dict = None
    ) -> str:
        """
        Generate a conversational response with memory.
        
        Args:
            user_message: Current user message
            context: Detected item info (brand, model, issues)
            recent_messages: Last N messages (sliding window) - list of {role, content}
            conversation_context: Key facts/decisions from conversation
        """
        # Build context string from detected item
        context_str = ""
        if context:
            item_name = context.get('object', 'Unknown item')
            brand = context.get('brand', '')
            condition = context.get('condition', '')
            issues = context.get('issues', [])
            
            context_str = f"""
=== DETECTED ITEM ===
Item: {item_name}
Brand: {brand if brand else 'Unknown'}
Condition: {condition}
Issues Found: {', '.join(issues) if issues else 'None specified'}
"""
        
        # Add conversation context (key facts - very token efficient)
        if conversation_context:
            facts = conversation_context.get('key_facts', [])
            decisions = conversation_context.get('decisions_made', [])
            if facts or decisions:
                context_str += "\n=== CONVERSATION CONTEXT ===\n"
                if facts:
                    context_str += f"Key Facts: {'; '.join(facts[-5:])}\n"
                if decisions:
                    context_str += f"Decisions: {'; '.join(decisions[-3:])}\n"
        
        # Add recent conversation history (sliding window - last 4 exchanges max)
        history_str = ""
        if recent_messages and len(recent_messages) > 0:
            # Take last 4 exchanges (8 messages) max to keep tokens low
            recent = recent_messages[-8:]
            if recent:
                history_str = "\n=== RECENT CONVERSATION ===\n"
                for msg in recent:
                    role = "User" if msg['role'] == 'user' else "Assistant"
                    # Truncate long messages to save tokens
                    content = msg['content'][:200] + "..." if len(msg['content']) > 200 else msg['content']
                    history_str += f"{role}: {content}\n"
                history_str += "==================\n"
        
        prompt = f"""{context_str}{history_str}
User Question: {user_message}

You are a knowledgeable repair advisor. Answer the user's question directly and helpfully.

GUIDELINES:
1. If asked "repair vs buy new" - Consider: age of item, cost of repair vs replacement, availability of parts, environmental impact. Give a balanced recommendation.
2. If asked about cost - Give rough estimates if possible, mention it varies by location/service.
3. If asked about difficulty - Rate as Easy/Medium/Hard and explain why.
4. If asked general questions - Answer based on the detected item's condition and issues.
5. Be concise but informative (under 150 words).
6. Be encouraging about repair when practical - this is a Right to Repair assistant!
7. If unsure, say so honestly and suggest what info would help.
8. Remember the conversation context - don't repeat information already discussed.

Respond naturally and helpfully:

/no_think"""
        
        try:
            client = await self.get_client()
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False
            }
            response = await client.post(f"{self.host}/api/generate", json=payload)
            response.raise_for_status()
            return response.json().get('response', "I'm here to help! Could you tell me more about the issue?")
        except Exception as e:
            print(f"Chat response error: {e}")
            return "I'm here to help with your repair! What would you like to know?"
    
    def _parse_json_response(self, response: str, response_type: str) -> dict:
        """Parse JSON from model response"""
        try:
            cleaned = response.strip()
            # Remove thinking blocks if any exist (robustness)
            cleaned = re.sub(r'<think>.*?</think>', '', cleaned, flags=re.DOTALL)
            cleaned = re.sub(r'^```json\s*', '', cleaned)
            cleaned = re.sub(r'^```\s*', '', cleaned)
            cleaned = re.sub(r'\s*```$', '', cleaned)
            
            start = cleaned.find('{')
            end = cleaned.rfind('}') + 1
            if start != -1 and end > start:
                json_str = cleaned[start:end]
                parsed = json.loads(json_str)
                print(f"Parsed JSON successfully: object={parsed.get('object', 'N/A')}")
                return parsed
            else:
                print(f"No JSON found in response. Raw: {response[:200]}...")
        except Exception as e:
            print(f"JSON parse error: {e}. Raw response: {response[:300]}...")
        
        if response_type == "object":
            return {
                "object": "Detection failed",
                "brand": "Unknown",
                "condition": "Unknown",
                "issues": [],
                "description": response[:500] if response else "Could not parse response"
            }
        else:
            return {
                "serial_number": "Not Found",
                "model_number": "Not Found",
                "manufacturer": "Unknown",
                "other_codes": []
            }

# Singleton instance
ollama_service = OllamaService()
