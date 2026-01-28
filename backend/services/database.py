"""
Database Service - SQLite for chat history and repair sessions
"""
import aiosqlite
import json
import uuid
from datetime import datetime
from typing import Optional
from pathlib import Path

DATABASE_PATH = Path(__file__).parent.parent / "repair_history.db"


class DatabaseService:
    def __init__(self):
        self.db_path = DATABASE_PATH
        self._initialized = False
    
    async def initialize(self):
        """Create tables if they don't exist"""
        if self._initialized:
            return
        
        async with aiosqlite.connect(self.db_path) as db:
            # Sessions table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT DEFAULT 'New Repair',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Messages table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    images_count INTEGER DEFAULT 0,
                    image_data TEXT,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Add image_data column if it doesn't exist (migration)
            try:
                await db.execute("ALTER TABLE messages ADD COLUMN image_data TEXT")
            except:
                pass  # Column already exists
            
            # Detected items table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS detected_items (
                    id TEXT PRIMARY KEY,
                    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
                    object TEXT,
                    brand TEXT,
                    model TEXT,
                    serial_number TEXT,
                    condition TEXT,
                    issues TEXT,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Conversation context table (key facts, not full history)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS conversation_context (
                    id TEXT PRIMARY KEY,
                    session_id TEXT UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
                    key_facts TEXT DEFAULT '[]',
                    decisions_made TEXT DEFAULT '[]',
                    topics_discussed TEXT DEFAULT '[]',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            await db.commit()
        
        self._initialized = True
    
    async def create_session(self, title: str = "New Repair") -> str:
        """Create a new chat session"""
        await self.initialize()
        session_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO sessions (id, title) VALUES (?, ?)",
                (session_id, title)
            )
            await db.commit()
        
        return session_id
    
    async def get_sessions(self, limit: int = 20) -> list:
        """Get recent sessions"""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?",
                (limit,)
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get a single session"""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM sessions WHERE id = ?",
                (session_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
    
    async def update_session_title(self, session_id: str, title: str):
        """Update session title"""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
                (title, datetime.now().isoformat(), session_id)
            )
            await db.commit()
    
    async def delete_session(self, session_id: str):
        """Delete a session and all its messages"""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
            await db.execute("DELETE FROM detected_items WHERE session_id = ?", (session_id,))
            await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            await db.commit()
    
    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        images_count: int = 0,
        image_data: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> str:
        """Add a message to a session"""
        await self.initialize()
        message_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT INTO messages (id, session_id, role, content, images_count, image_data, metadata)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (message_id, session_id, role, content, images_count, image_data,
                 json.dumps(metadata) if metadata else None)
            )
            # Update session timestamp
            await db.execute(
                "UPDATE sessions SET updated_at = ? WHERE id = ?",
                (datetime.now().isoformat(), session_id)
            )
            await db.commit()
        
        return message_id
    
    async def get_messages(self, session_id: str) -> list:
        """Get all messages for a session"""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC",
                (session_id,)
            )
            rows = await cursor.fetchall()
            messages = []
            for row in rows:
                msg = dict(row)
                if msg.get('metadata'):
                    msg['metadata'] = json.loads(msg['metadata'])
                messages.append(msg)
            return messages
    
    async def save_detected_item(
        self,
        session_id: str,
        detection_result: dict
    ) -> str:
        """Save a detected item"""
        await self.initialize()
        item_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT INTO detected_items 
                   (id, session_id, object, brand, model, serial_number, condition, issues, description)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item_id,
                    session_id,
                    detection_result.get('object', ''),
                    detection_result.get('brand', ''),
                    detection_result.get('model', ''),
                    detection_result.get('serial_number', ''),
                    detection_result.get('condition', ''),
                    json.dumps(detection_result.get('issues', [])),
                    detection_result.get('description', '')
                )
            )
            await db.commit()
        
        return item_id
    
    async def get_detected_item(self, session_id: str) -> Optional[dict]:
        """Get the detected item for a session"""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM detected_items WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
                (session_id,)
            )
            row = await cursor.fetchone()
            if row:
                item = dict(row)
                if item.get('issues'):
                    item['issues'] = json.loads(item['issues'])
                return item
            return None
    
    async def get_recent_messages(self, session_id: str, limit: int = 6) -> list:
        """Get last N messages for sliding window context (efficient)"""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """SELECT role, content FROM messages 
                   WHERE session_id = ? AND content NOT LIKE '[Image%]'
                   ORDER BY created_at DESC LIMIT ?""",
                (session_id, limit)
            )
            rows = await cursor.fetchall()
            # Reverse to get chronological order
            return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
    
    async def get_conversation_context(self, session_id: str) -> Optional[dict]:
        """Get stored conversation context (key facts)"""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM conversation_context WHERE session_id = ?",
                (session_id,)
            )
            row = await cursor.fetchone()
            if row:
                ctx = dict(row)
                ctx['key_facts'] = json.loads(ctx.get('key_facts', '[]'))
                ctx['decisions_made'] = json.loads(ctx.get('decisions_made', '[]'))
                ctx['topics_discussed'] = json.loads(ctx.get('topics_discussed', '[]'))
                return ctx
            return None
    
    async def update_conversation_context(
        self,
        session_id: str,
        key_fact: Optional[str] = None,
        decision: Optional[str] = None,
        topic: Optional[str] = None
    ):
        """Update conversation context with new facts (append-only, no LLM needed)"""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Get existing or create new
            cursor = await db.execute(
                "SELECT key_facts, decisions_made, topics_discussed FROM conversation_context WHERE session_id = ?",
                (session_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                key_facts = json.loads(row[0] or '[]')
                decisions = json.loads(row[1] or '[]')
                topics = json.loads(row[2] or '[]')
            else:
                key_facts, decisions, topics = [], [], []
            
            # Append new items (keep last 10 of each to limit size)
            if key_fact and key_fact not in key_facts:
                key_facts.append(key_fact)
                key_facts = key_facts[-10:]
            if decision and decision not in decisions:
                decisions.append(decision)
                decisions = decisions[-10:]
            if topic and topic not in topics:
                topics.append(topic)
                topics = topics[-10:]
            
            # Upsert
            await db.execute(
                """INSERT INTO conversation_context (id, session_id, key_facts, decisions_made, topics_discussed, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?)
                   ON CONFLICT(session_id) DO UPDATE SET
                   key_facts = excluded.key_facts,
                   decisions_made = excluded.decisions_made,
                   topics_discussed = excluded.topics_discussed,
                   updated_at = excluded.updated_at""",
                (str(uuid.uuid4()), session_id, json.dumps(key_facts), json.dumps(decisions), json.dumps(topics), datetime.now().isoformat())
            )
            await db.commit()


# Singleton instance
db_service = DatabaseService()
