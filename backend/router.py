from enum import Enum
from typing import List, Optional
from pydantic import BaseModel
from services.genai_service import client  # Centralized client

# --- 1. Define the World (Schemas) ---
class Intent(str, Enum):
    PLAN = "plan"          # "Make a 7 day schedule"
    EXPLAIN = "explain"    # "Explain thermodynamics"
    QUIZ = "quiz"          # "Quiz me on modern history"
    AUTOPILOT = "autopilot" # "Start auto mode"
    UNKNOWN = "unknown"

class ExamType(str, Enum):
    NEET = "neet"
    JEE = "jee"
    UPSC = "upsc"
    CAT = "cat"
    NONE = "none"

class SubjectScope(BaseModel):
    subject: str  # e.g., "Physics", "Polity", "Verbal Ability"
    sub_subject: Optional[str] = None # e.g., "Inorganic", "Ancient History"
    topics: List[str] = []

class RouteDecision(BaseModel):
    intent: Intent
    exam: ExamType
    scope: SubjectScope
    confidence: float
    needs_clarification: bool
    clarifying_question: Optional[str] = None

# --- 2. The Syllabus Registry (The Source of Truth) ---
SYLLABI_REGISTRY = {
    "neet": {
        "biology": "NEET Biology Syllabus: \n- Diversity in Living World\n- Structural Organisation in Animals and Plants\n- Cell Structure and Function\n- Plant Physiology\n- Human Physiology\n- Reproduction\n- Genetics and Evolution\n- Biology and Human Welfare\n- Biotechnology and Its Applications\n- Ecology and Environment",
        "physics": "NEET Physics Syllabus: \n- Physical World and Measurement\n- Kinematics\n- Laws of Motion\n- Work, Energy and Power\n- Motion of System of Particles and Rigid Body\n- Gravitation\n- Properties of Bulk Matter\n- Thermodynamics\n- Behaviour of Perfect Gas and Kinetic Theory\n- Oscillations and Waves\n- Electrostatics\n- Current Electricity\n- Magnetic Effects of Current and Magnetism\n- Electromagnetic Induction and Alternating Currents\n- Electromagnetic Waves\n- Optics\n- Dual Nature of Matter and Radiation\n- Atoms and Nuclei\n- Electronic Devices",
        "chemistry": {
            "inorganic": "NEET Inorganic Chemistry: \n- Classification of Elements and Periodicity in Properties\n- Chemical Bonding and Molecular Structure\n- Hydrogen\n- s-Block Elements (Alkali and Alkaline earth metals)\n- Some p-Block Elements\n- General Principles and Processes of Isolation of Elements\n- p-Block Elements\n- d and f Block Elements\n- Coordination Compounds",
            "organic": "NEET Organic Chemistry: \n- Organic Chemistry- Some Basic Principles and Techniques\n- Hydrocarbons\n- Haloalkanes and Haloarenes\n- Alcohols, Phenols and Ethers\n- Aldehydes, Ketones and Carboxylic Acids\n- Organic Compounds Containing Nitrogen\n- Biomolecules\n- Polymers\n- Chemistry in Everyday Life",
            "physical": "NEET Physical Chemistry: \n- Some Basic Concepts of Chemistry\n- Structure of Atom\n- States of Matter: Gases and Liquids\n- Thermodynamics\n- Equilibrium\n- Redox Reactions\n- Solid State\n- Solutions\n- Electrochemistry\n- Chemical Kinetics\n- Surface Chemistry"
        }
    },
    "jee": {
        "math": "JEE Mathematics Syllabus: \n- Sets, Relations and Functions\n- Complex Numbers and Quadratic Equations\n- Matrices and Determinants\n- Permutations and Combinations\n- Mathematical Induction\n- Binomial Theorem and its Simple Applications\n- Sequences and Series\n- Limit, Continuity and Differentiability\n- Integral Calculus\n- Differential Equations\n- Coordinate Geometry\n- Three Dimensional Geometry\n- Vector Algebra\n- Statistics and Probability\n- Trigonometry\n- Mathematical Reasoning",
        "physics": "JEE Physics Syllabus: \n- Physics and Measurement\n- Kinematics\n- Laws of Motion\n- Work, Energy and Power\n- Rotational Motion\n- Gravitation\n- Properties of Solids and Liquids\n- Thermodynamics\n- Kinetic Theory of Gases\n- Oscillations and Waves\n- Electrostatics\n- Current Electricity\n- Magnetic Effects of Current and Magnetism\n- Electromagnetic Induction and Alternating Currents\n- Electromagnetic Waves\n- Optics\n- Dual Nature of Matter and Radiation\n- Atoms and Nuclei\n- Electronic Devices\n- Communication Systems",
        "chemistry": "JEE Chemistry Syllabus: \n- Physical Chemistry: Basic Concepts, States of Matter, Atomic Structure, Chemical Bonding, Thermodynamics, Solutions, Equilibrium, Redox, Kinetics, Surface Chem.\n- Inorganic Chemistry: Periodic Properties, General Principles of Isolation, Hydrogen, s-Block, p-Block, d & f Block, Coordination usage, Environmental Chem.\n- Organic Chemistry: Purification & Characterization, Basic Principles, Hydrocarbons, Organic Compounds with Halogens/Oxygen/Nitrogen, Polymers, Biomolecules, Chem in Everyday Life, Principles of Practical Chem."
    },
    "upsc": {
        "history": "UPSC History Syllabus: \n- Ancient India: Prehistoric, Indus Valley, Vedic, Mauryan, Gupta, Post-Gupta.\n- Medieval India: Delhi Sultanate, Mughals, Vijaynagar, Bhakti/Sufi movements.\n- Modern India: European penetration, British expansion, 1857 Revolt, Freedom Struggle (Gandhian era), Partition, Post-Independence consolidation.\n- Art & Culture: Architecture, Sculpture, Painting, Music, Dance, Literary works.\n- World History: Industrial Revolution, World Wars, Cold War, Decolonization.",
        "geography": "UPSC Geography Syllabus: \n- Physical Geography: Geomorphology, Climatology, Oceanography, Biogeography.\n- Human Geography: Perspectives, Economic, Population, Settlement.\n- Indian Geography: Physical setting, Resources, Agriculture, Industry, Transport, Trade via maps.",
        "polity": "UPSC Polity & Governance Syllabus: \n- Indian Constitution: Preamble, Fundamental Rights/Duties, DPSP, Amendment.\n- System of Government: Parliamentary vs Presidential, Federal vs Unitary.\n- Central & State Govt: Executive, Legislature, Judiciary.\n- Local Govt: Panchayats, Municipalities.\n- Constitutional & Non-Constitutional Bodies.\n- Governance: Rights issues, Public Policy, schemes.",
        "economy": "UPSC Economy Syllabus: \n- Planning, Mobilization of Resources, Growth, Development.\n- Government Budgeting.\n- Agriculture: Cropping patterns, Irrigation, Storage, Marketing, E-technology.\n- Food Processing, Land Reforms.\n- Liberalization, Infrastructure, Investment Models."
    },
    "cat": {
        "quant": "CAT Quantitative Aptitude Syllabus: \n- Arithmetic: Percentages, Profit & Loss, SI/CI, Time & Work, TSD, Averages, Mixtures.\n- Algebra: Linear/Quadratic Equations, Inequalities, Logarithms, Functions, Progressions.\n- Geometry & Mensuration: Triangles, Circles, Polygons, Coordinate Geometry.\n- Number System: Properties, Divisibility, Remainders.\n- Modern Math: P&C, Probability.",
        "verbal": "CAT VARC Syllabus: \n- Reading Comprehension: Philosophy, Science, Economics, Arts passages.\n- Verbal Ability: Para Jumbles, Para Summary, Odd Sentence Out, Sentence Completion.",
        "dilr": "CAT DILR Syllabus: \n- Data Interpretation: Tables, Bar/Line/Pie Charts, Caselets.\n- Logical Reasoning: Arrangements (Linear/Circular), Team Selection, Blood Relations, Games & Tournaments, Cubes, Venn Diagrams."
    }
}

# --- 3. The Router Agent ---
async def route_request(user_text: str, current_exam_context: str = None) -> RouteDecision:
    prompt = f"""
    Analyze the user's request for an exam prep app.
    Current Context Exam: {current_exam_context}
    
    User Input: "{user_text}"
    
    Task:
    1. Identify INTENT (Plan, Explain, Quiz).
    2. Identify EXAM (NEET, JEE, UPSC, CAT). If implied by context, use that.
    3. Identify SCOPE (Subject/Sub-subject).
    
    Output JSON conforming to the RouteDecision schema.
    """
    
    # Using client.aio for async call as per plan_agent.py pattern
    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash-exp", # Using fast model as requested
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": RouteDecision,
        }
    )
    return response.parsed

# --- 4. The Scope Guard (The Fix) ---
def get_safe_syllabus(decision: RouteDecision) -> str:
    """Returns the SPECIFIC syllabus chunk based on scope."""
    exam = decision.exam.value
    subject = decision.scope.subject.lower()
    sub = decision.scope.sub_subject.lower() if decision.scope.sub_subject else None
    
    # Safety Check: If user asks for "History" in "NEET", error out.
    # Note: dictionary keys are lowercase in SYLLABI_REGISTRY
    
    exam_registry = SYLLABI_REGISTRY.get(exam, {})
    
    # 1. Handle UPSC/CAT (Flat subjects) - and simple subjects in others
    if exam in ["upsc", "cat"]:
        if subject in exam_registry:
            return exam_registry[subject]
        # Basic partial match search if exact match fails
        for key in exam_registry:
            if key in subject or subject in key:
                 return exam_registry[key]
            
    # 2. Handle NEET/JEE (Nested Chemistry)
    if exam in ["neet", "jee"]:
        if subject == "chemistry":
            if isinstance(exam_registry.get("chemistry"), dict):
                 if sub and sub in exam_registry["chemistry"]:
                     return exam_registry["chemistry"][sub]
                 else:
                     # Return all chemistry if sub not found or generic
                     return str(exam_registry["chemistry"])
            else:
                 return exam_registry.get("chemistry")
        
        if subject in exam_registry:
            return exam_registry[subject]

    # Fallback: Return FULL syllabus if scope is generic
    # But warn the plan agent to filter.
    return str(SYLLABI_REGISTRY.get(exam, "Standard Syllabus"))
