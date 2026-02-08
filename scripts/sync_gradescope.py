#!/usr/bin/env python3
"""
Gradescope Assignment Sync Script

This script runs as a GitHub Action to sync Gradescope assignments
for all connected users to the Appwrite database.

Usage:
    python sync_gradescope.py

Environment variables required:
    APPWRITE_ENDPOINT - Appwrite API endpoint
    APPWRITE_PROJECT_ID - Appwrite project ID
    APPWRITE_API_KEY - Appwrite API key with users and database permissions
    GRADESCOPE_ENCRYPTION_KEY - Base64-encoded 32-byte encryption key
"""

import os
import sys
import json
import logging
import base64
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from difflib import SequenceMatcher

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.users import Users
from appwrite.query import Query
from appwrite.id import ID
from appwrite.permission import Permission
from appwrite.role import Role

import requests

# Configuration
DATABASE_ID = "6971d0970008b1d89c01"
ASSIGNMENTS_COLLECTION = "assignment"
COURSES_COLLECTION = "courses"
CONFLICTS_COLLECTION = "conflicts"

# Gradescope URLs
GRADESCOPE_BASE_URL = "https://www.gradescope.com"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/sync.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class GradescopeAssignment:
    """Represents an assignment from Gradescope"""
    id: str
    title: str
    course_id: str
    course_name: str
    deadline: datetime
    points_possible: Optional[float] = None
    score: Optional[float] = None
    submission_status: Optional[str] = None


@dataclass
class ConnectedUser:
    """Represents a user with Gradescope connected"""
    id: str
    email: str
    encrypted_token: str
    token_expiry: Optional[datetime] = None
    encrypted_gemini_key: Optional[str] = None


class TokenDecryption:
    """Handles decryption of Gradescope session tokens"""

    def __init__(self, encryption_key: str):
        # Key is base64-encoded 32-byte key
        self.key = base64.b64decode(encryption_key)
        if len(self.key) != 32:
            raise ValueError("Encryption key must be 32 bytes")

    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt data encrypted by the Node.js encryption module.
        Format: iv:authTag:encryptedData (all base64)
        """
        parts = encrypted_data.split(':')
        if len(parts) != 3:
            raise ValueError("Invalid encrypted data format")

        iv = base64.b64decode(parts[0])
        auth_tag = base64.b64decode(parts[1])
        ciphertext = base64.b64decode(parts[2])

        # AES-GCM: ciphertext + auth_tag
        aesgcm = AESGCM(self.key)
        plaintext = aesgcm.decrypt(iv, ciphertext + auth_tag, None)

        return plaintext.decode('utf-8')


class GradescopeClient:
    """Client for interacting with Gradescope"""

    def __init__(self, session_token: str):
        self.session = requests.Session()
        self.session.cookies.set('_gradescope_session', session_token, domain='www.gradescope.com')

    def get_courses(self) -> List[Dict]:
        """Fetch all courses for the user"""
        try:
            # Gradescope dashboard page contains course info
            response = self.session.get(f"{GRADESCOPE_BASE_URL}/account")
            if response.status_code != 200:
                logger.error(f"Failed to fetch courses: {response.status_code}")
                return []

            # Parse courses from HTML or try API endpoint
            # Note: Gradescope doesn't have a public API, so we may need to scrape
            # For now, try the courses API endpoint that some implementations use

            response = self.session.get(f"{GRADESCOPE_BASE_URL}/api/v1/courses")
            if response.status_code == 200:
                data = response.json()
                return data.get('courses', [])

            # Fallback: return empty if API not available
            logger.warning("Gradescope API not available, returning empty courses")
            return []

        except Exception as e:
            logger.error(f"Error fetching courses: {e}")
            return []

    def get_assignments(self, course_id: str, gemini_key: Optional[str] = None) -> List[Dict]:
        """Fetch assignments for a specific course"""
        try:
            # Gradescope assignment page
            response = self.session.get(
                f"{GRADESCOPE_BASE_URL}/courses/{course_id}"
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch course page: {response.status_code}")
                return []

            # Prioritize AI Parsing
            if gemini_key:
                logger.info(f"Using Gemini AI to parse assignments for course {course_id}")
                assignments = self.parse_with_ai(response.text, gemini_key)
                if assignments:
                    return assignments
                logger.warning("AI parsing yielded no results, falling back to standard parsing")

            # Try to parse as JSON (if API exists)
            try:
                data = response.json()
                return data.get('assignments', [])
            except:
                pass
                
            logger.warning(f"No Gemini Key or parsing failed - Skipping assignment parsing for {course_id}")
            return []
            
        except Exception as e:
            logger.error(f"Error fetching assignments for course {course_id}: {e}")
            return []

    def parse_with_ai(self, html_content: str, api_key: str) -> List[Dict]:
        """Parse HTML using Gemini"""
        import re
        
        # Clean HTML
        clean_html = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', html_content)
        clean_html = re.sub(r'<style\b[^>]*>[\s\S]*?</style>', '', clean_html)
        clean_html = re.sub(r'<svg\b[^>]*>[\s\S]*?</svg>', '', clean_html)
        
        prompt = """
        Extract assignments from this Gradescope course page HTML.
        Return a JSON object with a key "assignments" containing a list.
        Each item must have:
        - id: string (assignment ID, derived from link e.g. /courses/X/assignments/Y -> Y)
        - title: string
        - due_date: ISO 8601 string (Assume year {year} if missing)
        - score: number or null
        - total_points: number or null
        - status: string
        """
        
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        current_year = datetime.now().year
        final_prompt = prompt.format(year=current_year)
        
        payload = {
            "contents": [{
                "parts": [{"text": final_prompt}, {"text": clean_html[:100000]}] 
            }]
        }
        
        try:
            res = requests.post(api_url, json=payload, headers={'Content-Type': 'application/json'})
            if res.status_code != 200:
                logger.error(f"Gemini API Error: {res.text}")
                return []
                
            result = res.json()
            if 'candidates' not in result or not result['candidates']:
                return []
                
            text = result['candidates'][0]['content']['parts'][0]['text']
            
            # Extract JSON
            match = re.search(r'```json\s*({.*})\s*```', text, re.DOTALL)
            if match:
                json_str = match.group(1)
            else:
                start = text.find('{')
                end = text.rfind('}') + 1
                json_str = text[start:end] if start != -1 else "{}"
            
            data = json.loads(json_str)
            return data.get('assignments', [])
            
        except Exception as e:
            logger.error(f"AI Parse Error: {e}")
            return []

    def verify_session(self) -> bool:
        """Verify the session is still valid"""
        try:
            response = self.session.get(f"{GRADESCOPE_BASE_URL}/account", allow_redirects=False)
            # If redirected to login, session is invalid
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Error verifying session: {e}")
            return False


class GradescopeSyncer:
    """Main sync orchestrator"""

    def __init__(self):
        # Initialize Appwrite client
        self.client = Client()
        self.client.set_endpoint(os.environ['APPWRITE_ENDPOINT'])
        self.client.set_project(os.environ['APPWRITE_PROJECT_ID'])
        self.client.set_key(os.environ['APPWRITE_API_KEY'])

        self.databases = Databases(self.client)
        self.users_service = Users(self.client)

        # Initialize token decryption
        self.decryptor = TokenDecryption(os.environ['GRADESCOPE_ENCRYPTION_KEY'])

        # Stats
        self.stats = {
            'users_processed': 0,
            'users_skipped': 0,
            'assignments_synced': 0,
            'conflicts_created': 0,
            'errors': []
        }

    def get_connected_users(self) -> List[ConnectedUser]:
        """Fetch all users with Gradescope connected"""
        connected_users = []

        try:
            # List all users (paginated)
            offset = 0
            limit = 100

            while True:
                response = self.users_service.list(
                    queries=[Query.limit(limit), Query.offset(offset)]
                )

                for user in response['users']:
                    prefs = user.get('prefs', {})

                    # Check if Gradescope is connected
                    if prefs.get('gradescopeConnected') and prefs.get('gradescopeSessionToken'):
                        # Check if token is not expired
                        token_expiry = None
                        if prefs.get('gradescopeTokenExpiry'):
                            token_expiry = datetime.fromisoformat(
                                prefs['gradescopeTokenExpiry'].replace('Z', '+00:00')
                            )
                            if token_expiry < datetime.now(token_expiry.tzinfo):
                                logger.info(f"Token expired for user {user['$id']}")
                                self.mark_token_expired(user['$id'])
                                continue

                        connected_users.append(ConnectedUser(
                            id=user['$id'],
                            email=prefs.get('gradescopeEmail', 'unknown'),
                            encrypted_token=prefs['gradescopeSessionToken'],
                            token_expiry=token_expiry,
                            encrypted_gemini_key=prefs.get('geminiApiKey')
                        ))

                # Check if there are more users
                if len(response['users']) < limit:
                    break
                offset += limit

        except Exception as e:
            logger.error(f"Error fetching connected users: {e}")
            self.stats['errors'].append(f"Failed to fetch users: {e}")

        return connected_users

    def mark_token_expired(self, user_id: str):
        """Mark a user's token as expired"""
        try:
            self.users_service.update_prefs(user_id, {
                'gradescopeConnected': False
            })
            logger.info(f"Marked token as expired for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to mark token expired for user {user_id}: {e}")

    def get_user_courses(self, user_id: str) -> List[Dict]:
        """Get existing courses for a user"""
        try:
            courses = []
            offset = 0
            limit = 100

            while True:
                response = self.databases.list_documents(
                    DATABASE_ID,
                    COURSES_COLLECTION,
                    queries=[
                        Query.equal('userId', user_id),
                        Query.limit(limit),
                        Query.offset(offset)
                    ]
                )

                courses.extend(response['documents'])

                if len(response['documents']) < limit:
                    break
                offset += limit

            return courses
        except Exception as e:
            logger.error(f"Error fetching courses for user {user_id}: {e}")
            return []

    def get_user_assignments(self, user_id: str) -> List[Dict]:
        """Get existing assignments for a user"""
        try:
            assignments = []
            offset = 0
            limit = 100

            while True:
                response = self.databases.list_documents(
                    DATABASE_ID,
                    ASSIGNMENTS_COLLECTION,
                    queries=[
                        Query.equal('userId', user_id),
                        Query.limit(limit),
                        Query.offset(offset)
                    ]
                )

                assignments.extend(response['documents'])

                if len(response['documents']) < limit:
                    break
                offset += limit

            return assignments

        except Exception as e:
            logger.error(f"Error fetching assignments for user {user_id}: {e}")
            return []

    def find_similar_assignment(
        self,
        existing: List[Dict],
        gs_assignment: GradescopeAssignment
    ) -> Optional[Dict]:
        """
        Find a potentially matching manual assignment.

        Matching criteria:
        1. Title similarity > 80%
        2. Deadline within 48 hours
        """
        for assignment in existing:
            # Skip if already from Gradescope
            if assignment.get('source') == 'gradescope':
                continue

            # Check title similarity
            title_similarity = SequenceMatcher(
                None,
                assignment['title'].lower(),
                gs_assignment.title.lower()
            ).ratio()

            if title_similarity < 0.8:
                continue

            # Check deadline proximity (within 48 hours)
            existing_deadline = datetime.fromisoformat(
                assignment['deadline'].replace('Z', '+00:00')
            )
            deadline_diff = abs((existing_deadline - gs_assignment.deadline).total_seconds())

            if deadline_diff <= 48 * 60 * 60:  # 48 hours in seconds
                return assignment

        return None

    def find_by_gradescope_id(
        self,
        existing: List[Dict],
        gradescope_id: str
    ) -> Optional[Dict]:
        """Find an assignment by its Gradescope ID"""
        for assignment in existing:
            if assignment.get('gradescopeId') == gradescope_id:
                return assignment
        return None

    def create_assignment(
        self,
        user_id: str,
        gs_assignment: GradescopeAssignment
    ) -> Optional[str]:
        """Create a new assignment from Gradescope data"""
        try:
            doc = self.databases.create_document(
                DATABASE_ID,
                ASSIGNMENTS_COLLECTION,
                ID.unique(),
                {
                    'title': gs_assignment.title,
                    'courseId': '',  # Will need to be mapped manually
                    'deadline': gs_assignment.deadline.isoformat(),
                    'status': 'not_started',
                    'category': 'assignment',
                    'userId': user_id,
                    'source': 'gradescope',
                    'gradescopeId': gs_assignment.id,
                    'gradescopeCourseId': gs_assignment.course_id,
                    'gradescopeCourseName': gs_assignment.course_name,
                    'tags': [],
                    'notes': f'Imported from Gradescope ({gs_assignment.course_name})',
                    'attachmentFileId': None,
                    'attachmentFileName': None,
                    'completedAt': None,
                    'googleCalendarEventId': None,
                    'calendarSynced': False
                },
                [
                    Permission.read(Role.user(user_id)),
                    Permission.update(Role.user(user_id)),
                    Permission.delete(Role.user(user_id))
                ]
            )
            return doc['$id']
        except Exception as e:
            logger.error(f"Error creating assignment: {e}")
            return None

    def update_assignment(self, assignment_id: str, updates: Dict):
        """Update an existing assignment"""
        try:
            self.databases.update_document(
                DATABASE_ID,
                ASSIGNMENTS_COLLECTION,
                assignment_id,
                updates
            )
        except Exception as e:
            logger.error(f"Error updating assignment {assignment_id}: {e}")

    def update_course_grades(
        self,
        course_id: str,
        title: str,
        score: float,
        total: float
    ):
        """Update existing course grades"""
        try:
            # Re-fetch course to get latest gradedItems
            course = self.databases.get_document(
                DATABASE_ID,
                COURSES_COLLECTION,
                course_id
            )
            
            graded_items = []
            if course.get('gradedItems'):
                try:
                    graded_items = json.loads(course['gradedItems'])
                except:
                    graded_items = []
            
            if not isinstance(graded_items, list):
                graded_items = []

            # Check if item exists
            existing_index = -1
            for i, item in enumerate(graded_items):
                if item.get('name') == title:
                    existing_index = i
                    break
            
            changed = False
            
            if existing_index >= 0:
                # Update if different
                curr_score = graded_items[existing_index].get('score')
                curr_total = graded_items[existing_index].get('total')
                if curr_score != score or curr_total != total:
                    graded_items[existing_index]['score'] = score
                    graded_items[existing_index]['total'] = total
                    changed = True
            else:
                # Create
                grade_weights = []
                if course.get('gradeWeights'):
                    try:
                        grade_weights = json.loads(course['gradeWeights'])
                    except:
                        pass
                
                category = "Assignments"
                if grade_weights:
                    # Fuzzy match category
                    found = False
                    for gw in grade_weights:
                        cat_name = gw.get('category', '').lower()
                        if cat_name and (cat_name in title.lower() or title.lower() in cat_name):
                            category = gw['category']
                            found = True
                            break
                    if not found and grade_weights:
                        category = grade_weights[0]['category']
                
                # Generate simple ID
                import random, string
                new_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

                graded_items.append({
                    'id': new_id,
                    'category': category,
                    'name': title,
                    'score': score,
                    'total': total
                })
                changed = True
            
            if changed:
                self.databases.update_document(
                    DATABASE_ID,
                    COURSES_COLLECTION,
                    course_id,
                    {'gradedItems': json.dumps(graded_items)}
                )
                logger.info(f"Updated grades for course {course_id} - {title}")

        except Exception as e:
            logger.error(f"Error updating course grades {course_id}: {e}")

    def create_conflict(
        self,
        user_id: str,
        manual_assignment: Dict,
        gs_assignment: GradescopeAssignment
    ):
        """Create a conflict record for manual resolution"""
        try:
            self.databases.create_document(
                DATABASE_ID,
                CONFLICTS_COLLECTION,
                ID.unique(),
                {
                    'userId': user_id,
                    'manualAssignmentId': manual_assignment['$id'],
                    'gradescopeTitle': gs_assignment.title,
                    'gradescopeDeadline': gs_assignment.deadline.isoformat(),
                    'gradescopeCourseId': gs_assignment.course_id,
                    'gradescopeCourseName': gs_assignment.course_name,
                    'gradescopeData': json.dumps({
                        'id': gs_assignment.id,
                        'title': gs_assignment.title,
                        'courseId': gs_assignment.course_id,
                        'courseName': gs_assignment.course_name,
                        'deadline': gs_assignment.deadline.isoformat(),
                        'pointsPossible': gs_assignment.points_possible
                    }),
                    'resolved': False,
                    'resolution': None,
                    'resolvedAt': None
                },
                [
                    Permission.read(Role.user(user_id)),
                    Permission.update(Role.user(user_id)),
                    Permission.delete(Role.user(user_id))
                ]
            )
            self.stats['conflicts_created'] += 1
            logger.info(f"Created conflict for user {user_id}: {gs_assignment.title}")
        except Exception as e:
            logger.error(f"Error creating conflict: {e}")

    def sync_user(self, user: ConnectedUser):
        """Sync assignments for a single user"""
        logger.info(f"Syncing user {user.id} ({user.email})")

        try:
            # Decrypt session token
            session_token = self.decryptor.decrypt(user.encrypted_token)

            # Create Gradescope client
            gs_client = GradescopeClient(session_token)

            # Verify session is still valid
            if not gs_client.verify_session():
                logger.warning(f"Session expired for user {user.id}")
                self.mark_token_expired(user.id)
                self.stats['users_skipped'] += 1
                return

            # Get user's existing assignments and courses
            existing_assignments = self.get_user_assignments(user.id)
            internal_courses = self.get_user_courses(user.id)

            # Fetch courses and assignments from Gradescope
            courses = gs_client.get_courses()
            logger.info(f"Found {len(courses)} courses for user {user.id}")

            for course in courses:
                course_id = str(course.get('id', ''))
                course_name = course.get('name', course.get('shortname', 'Unknown'))
                
                # Attempt to match with internal course
                internal_course_id = ''
                gs_name_clean = ''.join(e for e in course_name.lower() if e.isalnum())
                gs_short_clean = ''.join(e for e in course.get('shortname', '').lower() if e.isalnum())
                
                for ic in internal_courses:
                    ic_code = ''.join(e for e in ic.get('code', '').lower() if e.isalnum())
                    ic_name = ''.join(e for e in ic.get('name', '').lower() if e.isalnum())
                    
                    if (ic_code and ic_code in gs_short_clean) or \
                       (gs_short_clean and gs_short_clean in ic_code) or \
                       (ic_name and ic_name == gs_name_clean):
                        internal_course_id = ic['$id']
                        break

                # Decrypt Gemini Key (if available for this user)
                gemini_key = None
                if user.encrypted_gemini_key:
                    try:
                        gemini_key = self.decryptor.decrypt(user.encrypted_gemini_key)
                    except:
                        pass

                assignments = gs_client.get_assignments(course_id, gemini_key)
                logger.info(f"Found {len(assignments)} assignments in {course_name}")

                for assignment_data in assignments:
                    try:
                        # Parse deadline (handle different formats from AI or API)
                        deadline_str = assignment_data.get('due_date') or assignment_data.get('due_at')
                        if not deadline_str:
                            continue

                        # Clean up ISO string from AI (might have Z or offset)
                        deadline_str = deadline_str.replace('Z', '+00:00')
                        try:
                            deadline = datetime.fromisoformat(deadline_str)
                        except:
                            # Fallback parsing
                            continue
                        
                        points_possible = assignment_data.get('total_points')
                        if points_possible is None:
                            points_possible = assignment_data.get('points')
                        
                        # Parse score
                        score = assignment_data.get('score')
                        if score is None and 'submission' in assignment_data:
                             score = assignment_data['submission'].get('score')

                        gs_assignment = GradescopeAssignment(
                            id=str(assignment_data.get('id', '')),
                            title=assignment_data.get('title', assignment_data.get('name', 'Untitled')),
                            course_id=course_id,
                            course_name=course_name,
                            deadline=deadline,
                            points_possible=float(points_possible) if points_possible is not None else None,
                            score=float(score) if score is not None else None
                        )
                        
                        # Update course grades if score exists and course matched
                        if gs_assignment.score is not None and internal_course_id:
                            total = gs_assignment.points_possible if gs_assignment.points_possible else 100.0
                            self.update_course_grades(internal_course_id, gs_assignment.title, gs_assignment.score, total)

                        # Check if already tracked by gradescopeId
                        existing_match = self.find_by_gradescope_id(
                            existing_assignments,
                            gs_assignment.id
                        )

                        if existing_match:
                            # Update details
                            updates = {}
                            existing_deadline = datetime.fromisoformat(
                                existing_match['deadline'].replace('Z', '+00:00')
                            )
                            if existing_deadline != gs_assignment.deadline:
                                updates['deadline'] = gs_assignment.deadline.isoformat()
                            
                            # Update courseId if we found a match and it was missing
                            if internal_course_id and not existing_match.get('courseId'):
                                updates['courseId'] = internal_course_id
                            
                            if updates:
                                self.update_assignment(existing_match['$id'], updates)
                                logger.info(f"Updated {gs_assignment.title}")
                            continue

                        # Check for potential conflict with manual assignment
                        similar_assignment = self.find_similar_assignment(
                            existing_assignments,
                            gs_assignment
                        )

                        if similar_assignment:
                            # Create conflict for manual resolution
                            self.create_conflict(user.id, similar_assignment, gs_assignment)
                        else:
                            # Skip task creation if assignment is in the past (completed/old)
                            # But we still processed the grade above!
                            if gs_assignment.deadline.timestamp() < datetime.now().timestamp():
                                continue

                            # Create new assignment
                            # Inject internal_course_id into creation logic. 
                            # But create_assignment method doesn't take it currently.
                            # I'll modify create_assignment now as well or just update it after creation if simpler. 
                            # Or better: modify create_assignment to take optional course_id.
                            
                            # Since I can't easily modify create_assignment signature without replacing it too,
                            # I'll just override the courseId in the method if I pass it, 
                            # but create_assignment is separate.
                            # Let's just create it, then update it if needed? No, create correctly is better.
                            
                            # I'll temporarily update the create_assignment call to handle it if I modify create_assignment.
                            # But I didn't modify create_assignment yet.
                            # Let's update create_assignment later. For now, create then update if needed.
                            # Actually, I'll invoke create_assignment then update.
                            
                            new_id = self.create_assignment(user.id, gs_assignment)
                            if new_id:
                                if internal_course_id:
                                    self.update_assignment(new_id, {'courseId': internal_course_id})
                                self.stats['assignments_synced'] += 1
                                logger.info(f"Created assignment: {gs_assignment.title}")

                    except Exception as e:
                        logger.error(f"Error processing assignment: {e}")

            # Update last sync time
            self.users_service.update_prefs(user.id, {
                'gradescopeLastSync': datetime.utcnow().isoformat() + 'Z'
            })

            self.stats['users_processed'] += 1

        except Exception as e:
            logger.error(f"Error syncing user {user.id}: {e}")
            self.stats['errors'].append(f"User {user.id}: {e}")
            self.stats['users_skipped'] += 1

    def run(self):
        """Main sync loop"""
        logger.info("=" * 50)
        logger.info("Starting Gradescope sync")
        logger.info("=" * 50)

        # Get all connected users
        users = self.get_connected_users()
        logger.info(f"Found {len(users)} connected users")

        # Sync each user
        for user in users:
            try:
                self.sync_user(user)
            except Exception as e:
                logger.error(f"Unhandled error for user {user.id}: {e}")
                self.stats['errors'].append(f"User {user.id}: {e}")

        # Log summary
        logger.info("=" * 50)
        logger.info("Sync complete")
        logger.info(f"Users processed: {self.stats['users_processed']}")
        logger.info(f"Users skipped: {self.stats['users_skipped']}")
        logger.info(f"Assignments synced: {self.stats['assignments_synced']}")
        logger.info(f"Conflicts created: {self.stats['conflicts_created']}")
        if self.stats['errors']:
            logger.warning(f"Errors: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:10]:  # Log first 10 errors
                logger.warning(f"  - {error}")
        logger.info("=" * 50)


def main():
    # Verify required environment variables
    required_vars = [
        'APPWRITE_ENDPOINT',
        'APPWRITE_PROJECT_ID',
        'APPWRITE_API_KEY',
        'GRADESCOPE_ENCRYPTION_KEY'
    ]

    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)

    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)

    # Run the sync
    syncer = GradescopeSyncer()
    syncer.run()


if __name__ == '__main__':
    main()
