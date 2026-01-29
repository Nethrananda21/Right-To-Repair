"""
Chat API Routes - Unified conversational endpoint
"""
import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.database import db_service
from services.ollama_service import ollama_service
from services.deep_search import deep_search
import asyncio

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    images_count: int = 0
    metadata: Optional[dict] = None


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    context: Optional[dict] = None  # Previous detection results


class ChatResponse(BaseModel):
    session_id: str
    message: str
    response_type: str  # 'text', 'detection', 'repair_results', 'clarification'
    data: Optional[dict] = None
    cards: Optional[list] = None  # Rich UI cards


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]


# ============== SESSION ENDPOINTS ==============

@router.get("/sessions", response_model=SessionListResponse)
async def get_sessions():
    """Get all repair sessions (history)"""
    sessions = await db_service.get_sessions()
    return SessionListResponse(sessions=sessions)


@router.post("/sessions")
async def create_session():
    """Create a new repair session"""
    session_id = await db_service.create_session()
    session = await db_service.get_session(session_id)
    return session


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific session with messages"""
    session = await db_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = await db_service.get_messages(session_id)
    detected_item = await db_service.get_detected_item(session_id)
    
    return {
        **session,
        "messages": messages,
        "detected_item": detected_item
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    await db_service.delete_session(session_id)
    return {"status": "deleted"}


class UpdateDetectedItemRequest(BaseModel):
    object: str
    brand: Optional[str] = ""
    model: Optional[str] = ""
    condition: str = "unknown"
    issues: list[str] = []
    description: str = ""


@router.put("/sessions/{session_id}/detected-item")
async def update_detected_item(session_id: str, request: UpdateDetectedItemRequest):
    """Update detected item with user corrections"""
    detection_data = {
        "object": request.object,
        "brand": request.brand or "",
        "model": request.model or "",
        "condition": request.condition,
        "issues": request.issues,
        "description": request.description,
    }
    
    # Save updated detection
    await db_service.save_detected_item(session_id, detection_data)
    
    # Update session title
    title = f"{request.brand + ' ' if request.brand else ''}{request.object}"
    await db_service.update_session_title(session_id, title[:30])
    
    return {"status": "updated", "data": detection_data}


class SaveMessageRequest(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    metadata: Optional[dict] = None


@router.post("/sessions/{session_id}/messages")
async def save_message(session_id: str, request: SaveMessageRequest):
    """Save a message to a session (used for live video detection)"""
    # Verify session exists
    session = await db_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db_service.add_message(
        session_id=session_id,
        role=request.role,
        content=request.content,
        metadata=request.metadata
    )
    
    return {"status": "saved"}


# ============== CHAT ENDPOINT ==============

@router.post("/message")
async def send_message(
    message: str = Form(""),
    session_id: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    """
    Send a chat message with optional image.
    This is the main conversational endpoint.
    """
    try:
        # Create session if not provided
        if not session_id:
            session_id = await db_service.create_session()
        
        # Read image if provided
        image_bytes = None
        image_base64 = None
        if image:
            image_bytes = await image.read()
            # Store as base64 data URL for persistence
            image_base64 = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode('utf-8')}"
        
        # Save user message with image data
        await db_service.add_message(
            session_id=session_id,
            role="user",
            content=message or "[Image uploaded]",
            images_count=1 if image_bytes else 0,
            image_data=image_base64
        )
        
        # Get existing detected item for context
        detected_item = await db_service.get_detected_item(session_id)
        
        # Get conversation history (sliding window + key facts)
        recent_messages = await db_service.get_recent_messages(session_id, limit=6)
        conversation_context = await db_service.get_conversation_context(session_id)
        
        # Determine what to do based on input
        response_type = "text"
        response_data = None
        cards = []
        ai_message = ""
        
        if image_bytes:
            # Image provided - run detection
            detection_result = await ollama_service.detect_object(image_bytes)
            print(f"Detection result: {detection_result}")  # Debug logging
            
            # Check if we got a valid object (not empty, not "Detection failed", not blank descriptions)
            obj = detection_result.get('object', '')
            is_valid = (
                obj and 
                obj != 'Detection failed' and 
                obj.lower() not in ['', 'unknown', 'n/a', 'none', 'blank', 'image']
            )
            
            if is_valid:
                # Save detected item
                await db_service.save_detected_item(session_id, detection_result)
                
                # Update session title with 2-4 word summary
                item_name = detection_result.get('object', 'Item')
                condition = detection_result.get('condition', '')
                issues = detection_result.get('issues', [])
                
                # Create short title: "Broken Laptop" or "Damaged Headphones"
                if condition in ['broken', 'damaged']:
                    title = f"{condition.capitalize()} {item_name}"
                elif issues:
                    # Extract first issue keyword
                    first_issue = issues[0].split(':')[0] if ':' in issues[0] else issues[0].split()[0]
                    title = f"{item_name} {first_issue}"
                else:
                    title = item_name
                
                await db_service.update_session_title(session_id, title[:30])
                
                response_type = "detection"
                response_data = detection_result
                
                # Build AI message
                condition = detection_result.get('condition', 'unknown')
                issues = detection_result.get('issues', [])
                
                ai_message = f"I identified this as a **{title}**.\n\n"
                ai_message += f"**Condition:** {condition.capitalize()}\n\n"
                
                if issues:
                    ai_message += "**Issues detected:**\n"
                    for issue in issues:
                        ai_message += f"• {issue}\n"
                    ai_message += "\n"
                
                ai_message += "Would you like me to search for repair guides and spare parts?"
                
                # Add detection card
                cards.append({
                    "type": "detection_card",
                    "data": detection_result
                })
            else:
                ai_message = "I couldn't clearly identify the item in this image. Could you try uploading a clearer photo?"
                response_type = "clarification"
        
        elif message and detected_item:
            # Text message with existing context
            message_lower = message.lower()
            
            # Keywords that explicitly request repair RESOURCES (tutorials, guides, parts)
            resource_keywords = ['tutorial', 'video', 'guide', 'parts', 'where to buy', 'search', 'find parts', 'show me', 'youtube', 'solutions', 'repair']
            
            # Keywords that suggest user wants to SEARCH for repair help
            search_intent = ['yes', 'sure', 'okay', 'ok', 'please', 'go ahead', 'find', 'search']
            
            # Keywords that indicate a QUESTION/ADVICE request (not resource search)
            question_keywords = ['should', 'worth', 'cost', 'how much', 'buy new', 'replace', 'advice', 'recommend', 'what do you think', 'opinion', 'suggest', '?']
            
            # Determine intent
            wants_resources = any(word in message_lower for word in resource_keywords)
            is_question = any(word in message_lower for word in question_keywords)
            is_simple_yes = any(word in message_lower for word in search_intent) and len(message.split()) <= 5
            
            # Debug logging
            print(f"Search intent check: wants_resources={wants_resources}, is_question={is_question}, is_simple_yes={is_simple_yes}")
            print(f"Using detected_item: {detected_item}")
            
            # If it's a question/advice request, use conversational AI
            if is_question and not wants_resources:
                # User asking for advice - use AI to answer with conversation memory
                ai_message = await ollama_service.chat_response(
                    message, 
                    detected_item,
                    recent_messages=recent_messages,
                    conversation_context=conversation_context
                )
                response_type = "text"
                
                # Track topic discussed (lightweight, no LLM call)
                topic = None
                if 'cost' in message_lower or 'price' in message_lower:
                    topic = "repair costs"
                elif 'worth' in message_lower or 'buy new' in message_lower:
                    topic = "repair vs replace decision"
                elif 'how' in message_lower and 'fix' in message_lower:
                    topic = "repair steps"
                if topic:
                    await db_service.update_conversation_context(session_id, topic=topic)
            
            elif wants_resources or is_simple_yes:
                # Search for repairs using deep search
                response_type = "repair_results"
                
                # Build optimized search query from detected item
                brand = detected_item.get('brand', '').strip()
                model = detected_item.get('model', '').strip()
                obj = detected_item.get('object', '').strip()
                issues = detected_item.get('issues', [])
                condition = detected_item.get('condition', '').strip()
                description = detected_item.get('description', '').strip()
                
                # Create focused, summarized search query
                # Priority: specific problem > object > brand/model
                query_parts = []
                
                # Add brand/model only if they provide value (not generic)
                if brand and brand.lower() not in ['unknown', 'generic', 'n/a', '']:
                    query_parts.append(brand)
                if model and model.lower() not in ['unknown', 'n/a', '']:
                    query_parts.append(model)
                
                # Always include object type
                if obj:
                    query_parts.append(obj)
                
                # Extract the core problem from issues (most important for search)
                problem_keywords = []
                if issues:
                    for issue in issues[:2]:  # Max 2 issues for focused query
                        # Clean up the issue text - extract key problem words
                        issue_clean = issue.lower()
                        # Remove common filler words
                        for filler in ['the', 'is', 'are', 'has', 'have', 'appears', 'seems', 'visible', 'showing', 'signs of']:
                            issue_clean = issue_clean.replace(filler, '')
                        # Get core problem words
                        issue_words = [w.strip() for w in issue_clean.split() if len(w.strip()) > 2]
                        if issue_words:
                            problem_keywords.extend(issue_words[:3])  # Max 3 words per issue
                
                # Add unique problem keywords
                seen = set()
                for kw in problem_keywords:
                    if kw not in seen and kw not in [p.lower() for p in query_parts]:
                        query_parts.append(kw)
                        seen.add(kw)
                        if len(seen) >= 3:  # Max 3 problem keywords
                            break
                
                # Add "repair" or "fix" based on condition
                if condition in ['broken', 'damaged']:
                    query_parts.append('repair fix')
                else:
                    query_parts.append('repair')
                
                # Create final search query - concise and focused
                search_query = " ".join(query_parts)
                
                # Create context summary for better relevance scoring
                context_parts = []
                if condition and condition != 'good':
                    context_parts.append(f"Condition: {condition}")
                if issues:
                    context_parts.append(f"Problems: {'; '.join(issues[:3])}")
                if description and len(description) < 200:
                    context_parts.append(f"Details: {description}")
                context = " | ".join(context_parts) if context_parts else None
                
                print(f"Deep search query: {search_query}")
                print(f"Context: {context}")
                
                # Run deep search across Reddit, Forums, and YouTube
                search_results = await deep_search({
                    "query": search_query,
                    "context": context,
                    "sources": ["reddit", "forums", "youtube"],
                    "max_results": 8
                })
                
                reddit_results = search_results.get("results", {}).get("reddit", [])
                forum_results = search_results.get("results", {}).get("forums", [])
                youtube_results = search_results.get("results", {}).get("youtube", [])
                
                print(f"Deep search results: Reddit={len(reddit_results)}, Forums={len(forum_results)}, YouTube={len(youtube_results)}")
                print(f"Search completed in {search_results.get('search_time_ms', 0):.0f}ms")
                
                response_data = {
                    "youtube": youtube_results,
                    "web": forum_results,  # Keep "web" key for frontend compatibility
                    "reddit": reddit_results,
                    "search_time_ms": search_results.get("search_time_ms", 0)
                }
                
                ai_message = "Here's what I found to help you repair your item:\n\n"
                
                if youtube_results:
                    ai_message += f"📺 **{len(youtube_results)} Video Tutorials**\n"
                    cards.append({
                        "type": "youtube_card",
                        "data": youtube_results[:4]
                    })
                
                if forum_results:
                    ai_message += f"📖 **{len(forum_results)} Repair Guides & Articles**\n"
                    cards.append({
                        "type": "guides_card",
                        "data": forum_results[:4]
                    })
                
                if reddit_results:
                    ai_message += f"💬 **{len(reddit_results)} Reddit Discussions**\n"
                    cards.append({
                        "type": "reddit_card",
                        "data": reddit_results[:4]
                    })
                
                ai_message += "\nClick on any card to learn more. Need help with something specific?"
                
                # Track that we searched for repairs (key fact for context)
                await db_service.update_conversation_context(
                    session_id, 
                    key_fact=f"Searched repairs for: {search_query}",
                    topic="repair resources"
                )
            
            elif any(word in message_lower for word in ['serial', 'model', 'number', 'label']):
                ai_message = "To find the serial number, look for a sticker on the back or bottom of your device. It usually starts with 'S/N' or 'Serial'. Upload a photo of it and I'll extract the details!"
                response_type = "clarification"
            
            else:
                # General conversation - use AI with memory
                ai_message = await ollama_service.chat_response(
                    message, 
                    detected_item,
                    recent_messages=recent_messages,
                    conversation_context=conversation_context
                )
                response_type = "text"
        
        elif message:
            # Text only, no context
            ai_message = "I'd love to help you repair something! Please upload a photo of the broken item and I'll identify it and find repair solutions for you."
            response_type = "clarification"
        
        else:
            ai_message = "Hello! I'm your repair assistant. Upload a photo of something broken and I'll help you fix it!"
            response_type = "text"
        
        # Save AI response (include image_data for detection responses so image shows in chat history)
        await db_service.add_message(
            session_id=session_id,
            role="assistant",
            content=ai_message,
            image_data=image_base64 if response_type == "detection" else None,
            metadata={"response_type": response_type, "data": response_data}
        )
        
        return {
            "session_id": session_id,
            "message": ai_message,
            "response_type": response_type,
            "data": response_data,
            "cards": cards if cards else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.get("/messages/{session_id}")
async def get_messages(session_id: str):
    """Get all messages for a session"""
    messages = await db_service.get_messages(session_id)
    return {"messages": messages}
