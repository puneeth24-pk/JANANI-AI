# ============================================================
# JANANI
# Mother Tongue-Based Multilingual Education
#
# FRONTEND ONLY
# Existing FastAPI backend remains untouched.
#
# Run:
#   uvicorn apifinal:app --reload --port 8000
#   streamlit run stream.py
# ============================================================

import html
import textwrap
import requests
import streamlit as st


# ============================================================
# CONFIG
# ============================================================

API_URL = "http://127.0.0.1:8000"

st.set_page_config(
    page_title="Janani",
    page_icon="🌳",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ============================================================
# SESSION STATE
# ============================================================

defaults = {
    "page": "Home",
    "selected_class": 1,
    "flash_index": 0,
    "flash_language": "Santhali",
    "flash_category": "Fruits",
}

for key, value in defaults.items():
    if key not in st.session_state:
        st.session_state[key] = value


# ============================================================
# HTML HELPER
# ============================================================

def ui_html(content):
    """
    Render custom HTML safely without Streamlit
    displaying the HTML as a code block.
    """
    st.html(textwrap.dedent(content).strip())


def esc(value):
    return html.escape(str(value))


# ============================================================
# PREMIUM JANANI CSS
# ============================================================

st.markdown(
    """
<style>

/* =========================================================
   JANANI COLOR SYSTEM
   ========================================================= */

:root {
    --green-950: #082718;
    --green-900: #0B3B21;
    --green-800: #14532D;
    --green-700: #176B3A;
    --green-600: #21854A;
    --green-100: #E8F5E9;
    --green-50: #F2FAF4;

    --gold-600: #C99500;
    --gold-500: #E5B72F;
    --gold-400: #F4C542;
    --gold-300: #F8D766;
    --gold-100: #FFF4C2;
    --gold-50: #FFF9E4;

    --cream: #FFFDF7;
    --cream-2: #FAF6E9;

    --text: #18251D;
    --muted: #68746C;

    --border: #DDD8C7;
    --white: #FFFFFF;

    --success: #16803C;
    --success-bg: #E4F6E9;
}


/* =========================================================
   GLOBAL
   ========================================================= */

.stApp {
    background:
        radial-gradient(
            circle at 85% 5%,
            rgba(244,197,66,0.12),
            transparent 28%
        ),
        linear-gradient(
            135deg,
            #FFFDF7 0%,
            #FFF9E9 100%
        );

    color: var(--text);
}


.block-container {
    max-width: 1500px;

    padding-top: 1rem;
    padding-bottom: 3rem;

    padding-left: clamp(1rem, 3vw, 3rem);
    padding-right: clamp(1rem, 3vw, 3rem);
}


header[data-testid="stHeader"] {
    background: transparent;
}


/* =========================================================
   SIDEBAR
   ========================================================= */

section[data-testid="stSidebar"] {
    background:
        linear-gradient(
            180deg,
            #102F20 0%,
            #0B2819 100%
        );

    border-right: 1px solid #071C11;

    box-shadow:
        8px 0 30px rgba(0,0,0,0.08);
}


section[data-testid="stSidebar"] > div {
    padding-top: 1rem;
}


/* Sidebar default text */

section[data-testid="stSidebar"] * {
    color: #EFF6F1;
}


/* =========================================================
   BRAND
   ========================================================= */

.brand {
    display: flex;
    align-items: center;

    gap: 11px;

    padding:
        8px 7px 22px 7px;

    border-bottom:
        1px solid rgba(255,255,255,0.10);

    margin-bottom: 14px;
}


.brand-icon {
    width: 43px;
    height: 43px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 13px;

    background:
        linear-gradient(
            135deg,
            #FFE998,
            #F4C542
        );

    font-size: 23px;

    box-shadow:
        0 6px 18px rgba(244,197,66,0.20);
}


.brand-name {
    color: #FFFFFF !important;

    font-size: 23px;

    font-weight: 950;

    letter-spacing: -0.5px;
}


.brand-tag {
    color: #B8CABE !important;

    font-size: 9px;

    margin-top: 2px;
}


/* =========================================================
   SIDEBAR SECTION
   ========================================================= */

.side-section {
    color: #91AA9B !important;

    font-size: 9px;

    font-weight: 900;

    text-transform: uppercase;

    letter-spacing: 0.13em;

    margin:
        20px 6px 8px;
}


/* =========================================================
   SIDEBAR BUTTONS
   ========================================================= */

section[data-testid="stSidebar"]
div.stButton > button {

    width: 100%;

    min-height: 43px;

    background:
        rgba(255,255,255,0.035) !important;

    color: #EAF2EC !important;

    border:
        1px solid rgba(255,255,255,0.08) !important;

    border-radius: 11px;

    text-align: left;

    padding-left: 14px;

    font-size: 12px;

    font-weight: 750;

    transition: all 0.18s ease;
}


section[data-testid="stSidebar"]
div.stButton > button p {

    color: #EAF2EC !important;

    font-weight: 750 !important;
}


section[data-testid="stSidebar"]
div.stButton > button:hover {

    background:
        rgba(244,197,66,0.15) !important;

    border-color:
        rgba(244,197,66,0.45) !important;

    transform:
        translateX(3px);
}


section[data-testid="stSidebar"]
div.stButton > button:hover p {

    color: #FFE27A !important;
}


/* =========================================================
   MAIN HEADER
   ========================================================= */

.welcome {
    color: var(--green-900);

    font-size:
        clamp(22px, 2.2vw, 30px);

    font-weight: 950;

    letter-spacing: -0.7px;
}


.welcome-sub {
    color: var(--muted);

    font-size: 12px;

    margin-top: 5px;
}


/* =========================================================
   TEACHER PROFILE
   ========================================================= */

.teacher {
    display: flex;
    align-items: center;

    gap: 10px;

    background:
        rgba(255,255,255,0.96);

    border:
        1px solid var(--border);

    padding:
        7px 13px;

    border-radius: 15px;

    box-shadow:
        0 5px 18px rgba(50,60,40,0.05);
}


.teacher-avatar {
    width: 38px;
    height: 38px;

    border-radius: 50%;

    display: flex;
    align-items: center;
    justify-content: center;

    background:
        linear-gradient(
            135deg,
            #FFF0A8,
            #F4C542
        );

    font-size: 19px;
}


.teacher-name {
    color: var(--green-900) !important;

    font-size: 12px;

    font-weight: 900;
}


.teacher-role {
    color: var(--muted) !important;

    font-size: 9px;

    margin-top: 2px;
}


/* =========================================================
   HERO
   ========================================================= */

.hero {
    position: relative;

    overflow: hidden;

    background:
        linear-gradient(
            120deg,
            #FFF0A8 0%,
            #FFF8D9 45%,
            #FFFFFF 100%
        );

    border:
        1px solid #EBD78D;

    border-radius: 24px;

    padding:
        clamp(24px, 4vw, 38px);

    margin:
        18px 0 24px;

    box-shadow:
        0 10px 35px rgba(96,79,20,0.07);
}


.hero::before {
    content: "";

    position: absolute;

    width: 190px;
    height: 190px;

    border-radius: 50%;

    background:
        rgba(244,197,66,0.12);

    right: 60px;
    top: -90px;
}


.hero-title {
    position: relative;

    color: var(--green-900);

    font-size:
        clamp(22px, 3vw, 31px);

    font-weight: 950;

    letter-spacing: -0.8px;

    z-index: 2;
}


.hero-text {
    position: relative;

    color: #5D6961;

    font-size: 13px;

    max-width: 700px;

    line-height: 1.75;

    margin-top: 8px;

    z-index: 2;
}


.hero-tree {
    position: absolute;

    right:
        clamp(20px, 5vw, 60px);

    bottom: -20px;

    font-size:
        clamp(75px, 10vw, 120px);

    opacity: 0.20;
}


/* =========================================================
   SECTION HEADINGS
   ========================================================= */

h1, h2, h3 {
    color: var(--green-900) !important;
}


h3 {
    font-weight: 900 !important;
}


/* =========================================================
   CARDS
   ========================================================= */

.card {
    background:
        rgba(255,255,255,0.97);

    border:
        1px solid var(--border);

    border-radius: 18px;

    padding: 19px;

    min-height: 145px;

    box-shadow:
        0 7px 25px rgba(45,55,40,0.055);

    transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease;
}


.card:hover {
    transform:
        translateY(-4px);

    border-color:
        #D8BE55;

    box-shadow:
        0 14px 35px rgba(50,60,35,0.10);
}


.card-icon {
    width: 46px;
    height: 46px;

    border-radius: 13px;

    display: flex;
    align-items: center;
    justify-content: center;

    background:
        linear-gradient(
            135deg,
            #FFF1A8,
            #F4C542
        );

    color: #3C3211;

    font-size: 21px;

    box-shadow:
        inset 0 -2px 0 rgba(0,0,0,0.05);
}


.card-title {
    color: var(--green-900) !important;

    font-size: 15px;

    font-weight: 900;

    margin-top: 11px;
}


.card-text {
    color: #68736B !important;

    font-size: 11px;

    line-height: 1.6;

    margin-top: 5px;
}


/* =========================================================
   STAT CARDS
   ========================================================= */

.stat {
    background: #FFFFFF;

    border:
        1px solid var(--border);

    border-radius: 16px;

    padding: 17px;

    box-shadow:
        0 5px 20px rgba(40,50,35,0.04);
}


.stat-label {
    color: #738077 !important;

    font-size: 10px;

    font-weight: 800;
}


.stat-value {
    color: var(--green-900) !important;

    font-size: 26px;

    font-weight: 950;

    margin-top: 4px;
}


.stat-change {
    color: #198754 !important;

    font-size: 10px;

    font-weight: 700;

    margin-top: 3px;
}


/* =========================================================
   FLASHCARD
   ========================================================= */

.flashcard {
    background:
        linear-gradient(
            145deg,
            #FFFFFF 0%,
            #FFF7D1 100%
        );

    border:
        1px solid #E6D78E;

    border-radius: 25px;

    padding:
        clamp(35px, 5vw, 55px) 25px;

    text-align: center;

    min-height: 330px;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    box-shadow:
        0 12px 40px rgba(86,70,15,0.08);
}


.flash-emoji {
    font-size:
        clamp(50px, 7vw, 75px);
}


.flash-word {
    color: var(--green-900) !important;

    font-size:
        clamp(24px, 3vw, 32px);

    font-weight: 950;

    margin-top: 10px;
}


.flash-language {
    color: #758078 !important;

    font-size: 11px;

    font-weight: 700;

    margin-top: 5px;
}


.flash-answer {
    display: inline-block;

    background:
        linear-gradient(
            135deg,
            #E2F6E8,
            #D4EFDC
        );

    color: #0D5B2B !important;

    border:
        1px solid #B8DEBF;

    border-radius: 14px;

    padding:
        11px 26px;

    font-size:
        clamp(19px, 3vw, 25px);

    font-weight: 950;

    margin-top: 22px;

    box-shadow:
        0 5px 15px rgba(22,128,60,0.08);
}


/* =========================================================
   NUMBERS
   ========================================================= */

.number-card {
    background: #FFFFFF;

    border:
        1px solid var(--border);

    border-radius: 14px;

    text-align: center;

    padding: 14px 6px;

    margin-bottom: 9px;

    transition: all 0.15s ease;
}


.number-card:hover {
    background: #FFF8D9;

    border-color: #DDBD42;

    transform:
        translateY(-2px);
}


.number {
    color: var(--green-700);

    font-size: 22px;

    font-weight: 950;
}


.number-name {
    color: #768078;

    font-size: 9px;

    margin-top: 3px;
}


/* =========================================================
   STATUS
   ========================================================= */

.offline {
    display: inline-flex;

    align-items: center;

    gap: 7px;

    background: #E1F5E7;

    color: #176B3A !important;

    border:
        1px solid #B9DFC3;

    padding:
        7px 12px;

    border-radius: 20px;

    font-size: 10px;

    font-weight: 850;
}


.dot {
    width: 7px;
    height: 7px;

    background: #19A957;

    border-radius: 50%;

    box-shadow:
        0 0 0 3px rgba(25,169,87,0.12);
}


/* =========================================================
   ALL BUTTONS
   ========================================================= */

div.stButton > button {

    min-height: 41px;

    border-radius: 11px;

    background: #FFFFFF !important;

    color: #173C28 !important;

    border:
        1px solid #D8D4C6 !important;

    font-size: 12px;

    font-weight: 800;

    transition: all 0.18s ease;
}


div.stButton > button p {

    color: #173C28 !important;

    font-weight: 800 !important;
}


div.stButton > button:hover {

    background: #FFF6CE !important;

    color: #0B3B21 !important;

    border-color: #D9B52F !important;

    transform:
        translateY(-1px);

    box-shadow:
        0 5px 14px rgba(100,80,20,0.08);
}


/* =========================================================
   PRIMARY BUTTON
   ========================================================= */

div.stButton > button[kind="primary"] {

    background:
        linear-gradient(
            135deg,
            #F8CF4A,
            #E9B72B
        ) !important;

    color: #19331F !important;

    border: none !important;

    box-shadow:
        0 5px 15px rgba(217,169,0,0.20);
}


div.stButton > button[kind="primary"] p {

    color: #19331F !important;
}


div.stButton > button[kind="primary"]:hover {

    background:
        linear-gradient(
            135deg,
            #FFD95B,
            #EDBC30
        ) !important;

    transform:
        translateY(-2px);
}


/* =========================================================
   TEXT INPUTS
   ========================================================= */

textarea,
input {

    color: #18251D !important;

    background: #FFFFFF !important;

    border-radius: 11px !important;

    border:
        1px solid #D8D4C6 !important;
}


textarea:focus,
input:focus {

    border-color:
        #D5B52E !important;

    box-shadow:
        0 0 0 2px
        rgba(244,197,66,0.15) !important;
}


/* =========================================================
   SELECT BOX
   ========================================================= */

div[data-baseweb="select"] > div {

    background:
        #FFFFFF !important;

    border:
        1px solid #D8D4C6 !important;

    border-radius:
        11px !important;
}


/* =========================================================
   RADIO
   ========================================================= */

div[data-testid="stRadio"] label {

    color:
        #23422F !important;

    font-weight:
        700 !important;

    font-size:
        12px !important;
}


/* =========================================================
   ALERTS
   ========================================================= */

div[data-testid="stAlert"] {

    border-radius:
        12px;

    border:
        1px solid rgba(0,0,0,0.06);
}


/* =========================================================
   AUDIO
   ========================================================= */

audio {

    width: 100%;

    border-radius: 12px;
}


/* =========================================================
   FOOTER
   ========================================================= */

.footer {

    text-align: center;

    color: #7A857D;

    font-size: 10px;

    margin-top: 40px;

    padding-top: 20px;

    border-top:
        1px solid var(--border);
}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 768px) {

    .block-container {

        padding-left: 0.8rem;
        padding-right: 0.8rem;
    }

    .welcome {

        font-size: 21px;
    }

    .teacher {

        margin-top: 12px;

        width: fit-content;
    }

    .hero {

        padding: 24px 20px;

        border-radius: 18px;
    }

    .hero-title {

        font-size: 22px;
    }

    .hero-text {

        font-size: 11px;

        max-width: 100%;
    }

    .hero-tree {

        opacity: 0.10;

        right: 5px;
    }

    .card {

        min-height: auto;

        padding: 15px;

        border-radius: 15px;
    }

    .flashcard {

        min-height: 280px;

        padding: 30px 15px;

        border-radius: 19px;
    }

    .flash-answer {

        max-width: 95%;

        overflow-wrap: anywhere;
    }

}


/* =========================================================
   SMALL MOBILE
   ========================================================= */

@media (max-width: 480px) {

    .hero-title {

        font-size: 20px;
    }

    .hero-text {

        font-size: 10px;
    }

    .flash-word {

        font-size: 23px;
    }

    .flash-answer {

        font-size: 18px;

        padding: 9px 15px;
    }

}


/* =========================================================
   SCROLLBAR
   ========================================================= */

::-webkit-scrollbar {

    width: 8px;
    height: 8px;
}


::-webkit-scrollbar-track {

    background: #F4F0E5;
}


::-webkit-scrollbar-thumb {

    background: #B8B09B;

    border-radius: 20px;
}


::-webkit-scrollbar-thumb:hover {

    background: #7D8C80;
}

</style>
""",
    unsafe_allow_html=True,
)


# ============================================================
# BACKEND CHECK
# ============================================================

@st.cache_data(ttl=5)
def check_backend():

    try:

        response = requests.get(
            f"{API_URL}/health",
            timeout=1.5
        )

        return response.status_code == 200

    except Exception:

        return False


backend_online = check_backend()


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    ui_html(
        """
        <div class="brand">

            <div class="brand-icon">
                📖
            </div>

            <div>

                <div class="brand-name">
                    Janani
                </div>

                <div class="brand-tag">
                    Learn Together. Grow Further.
                </div>

            </div>

        </div>
        """
    )


    ui_html(
        """
        <div class="side-section">
            Main
        </div>
        """
    )


    main_pages = [
        ("⌂", "Home"),
        ("▶", "Classroom"),
        ("文", "Translate"),
        ("▣", "My Content"),
        ("♙", "Students"),
        ("⚙", "Settings"),
    ]


    for icon, name in main_pages:

        if st.button(
            f"{icon}   {name}",
            key=f"sidebar_{name}",
            use_container_width=True,
        ):

            st.session_state.page = name

            st.rerun()


    ui_html(
        """
        <div class="side-section">
            Learning
        </div>
        """
    )


    learning_pages = [
        ("🃏", "Flash Cards"),
        ("🔢", "Numbers"),
        ("🍎", "Fruits"),
        ("💬", "Sentences"),
    ]


    for icon, name in learning_pages:

        if st.button(
            f"{icon}   {name}",
            key=f"learning_{name}",
            use_container_width=True,
        ):

            st.session_state.page = name

            st.rerun()


    st.write("")


    if backend_online:

        ui_html(
            """
            <div class="offline">

                <div class="dot"></div>

                AI Backend Online

            </div>
            """
        )

    else:

        ui_html(
            """
            <div class="offline">

                <div
                    class="dot"
                    style="background:#E2A21B;"
                ></div>

                Learning Mode

            </div>
            """
        )


# ============================================================
# TOP HEADER
# ============================================================

top_left, top_right = st.columns(
    [7, 2]
)


with top_left:

    page = st.session_state.page


    page_info = {

        "Home": (
            "☀️ Good morning, Teacher!",
            "Let's make learning more inclusive today."
        ),

        "Classroom": (
            "📚 Classroom",
            "Teach, translate and practice."
        ),

        "Translate": (
            "🌐 Quick Translate",
            "Translate classroom content instantly."
        ),

        "Flash Cards": (
            "🃏 Flash Cards",
            "Learn through visual vocabulary."
        ),

        "Numbers": (
            "🔢 Numbers 1–100",
            "Foundational numeracy practice."
        ),

        "Fruits": (
            "🍎 Fruits",
            "Visual vocabulary for young learners."
        ),

        "Sentences": (
            "💬 Classroom Sentences",
            "Simple classroom communication."
        ),

        "My Content": (
            "📚 My Content",
            "Your classroom learning materials."
        ),

        "Students": (
            "👩‍🎓 Students",
            "Monitor classroom learning progress."
        ),

        "Settings": (
            "⚙️ Settings",
            "Configure Janani."
        ),
    }


    title, subtitle = page_info.get(
        page,
        ("Janani", "Mother Tongue-Based Education")
    )


    ui_html(
        f"""
        <div class="welcome">
            {esc(title)}
        </div>

        <div class="welcome-sub">
            {esc(subtitle)}
        </div>
        """
    )


with top_right:

    ui_html(
        """
        <div class="teacher">

            <div class="teacher-avatar">
                👩‍🏫
            </div>

            <div>

                <div class="teacher-name">
                    Teacher
                </div>

                <div class="teacher-role">
                    Primary School
                </div>

            </div>

        </div>
        """
    )


# ============================================================
# HOME
# ============================================================

if page == "Home":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                Every Child. Every Language.
            </div>

            <div class="hero-text">
                Janani helps teachers deliver
                mother-tongue-based education using
                translation, interactive lessons and
                offline learning resources.
            </div>

            <div class="hero-tree">
                🌳
            </div>

        </div>
        """
    )


    st.markdown("### Quick Actions")


    action_cols = st.columns(4)


    actions = [
        (
            "▶",
            "Start Teaching",
            "Open a classroom lesson",
            "Classroom",
        ),

        (
            "📄",
            "Upload Material",
            "Use curriculum material",
            "My Content",
        ),

        (
            "文",
            "Quick Translate",
            "Speak & translate",
            "Translate",
        ),

        (
            "📚",
            "My Content",
            "View learning material",
            "My Content",
        ),
    ]


    for col, action in zip(
        action_cols,
        actions
    ):

        icon, title, description, destination = action


        with col:

            ui_html(
                f"""
                <div class="card">

                    <div class="card-icon">
                        {icon}
                    </div>

                    <div class="card-title">
                        {esc(title)}
                    </div>

                    <div class="card-text">
                        {esc(description)}
                    </div>

                </div>
                """
            )


            if st.button(
                "Open →",
                key=f"home_{title}",
                use_container_width=True,
            ):

                st.session_state.page = destination

                st.rerun()


    st.markdown("### Your Classroom")


    stats = [
        ("Students", "28", "+4 this month"),
        ("Lessons", "24", "+6 completed"),
        ("Activities", "18", "Ready offline"),
        ("Progress", "80%", "Class average"),
    ]


    stat_cols = st.columns(4)


    for col, (
        label,
        value,
        change
    ) in zip(
        stat_cols,
        stats
    ):

        with col:

            ui_html(
                f"""
                <div class="stat">

                    <div class="stat-label">
                        {esc(label)}
                    </div>

                    <div class="stat-value">
                        {esc(value)}
                    </div>

                    <div class="stat-change">
                        {esc(change)}
                    </div>

                </div>
                """
            )


    st.markdown("### Recent Lessons")


    lessons = [
        ("🌱", "Plants", "Class 4 · EVS"),
        ("🐘", "Animals", "Class 3 · EVS"),
        ("🔢", "Numbers", "Class 2 · Maths"),
        ("💧", "Water Cycle", "Class 4 · EVS"),
    ]


    lesson_cols = st.columns(4)


    for col, lesson in zip(
        lesson_cols,
        lessons
    ):

        icon, title, subtitle = lesson


        with col:

            ui_html(
                f"""
                <div class="card">

                    <div class="card-icon">
                        {icon}
                    </div>

                    <div class="card-title">
                        {esc(title)}
                    </div>

                    <div class="card-text">
                        {esc(subtitle)}
                    </div>

                </div>
                """
            )


# ============================================================
# CLASSROOM
# ============================================================

elif page == "Classroom":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                🌱 Primary Classroom
            </div>

            <div class="hero-text">
                Mother-tongue learning resources
                for Classes 1–5.
            </div>

            <div class="hero-tree">
                📚
            </div>

        </div>
        """
    )


    st.markdown("### Select Class")


    class_cols = st.columns(5)


    for i in range(1, 6):

        with class_cols[i - 1]:

            if st.button(
                f"Class {i}",
                key=f"class_{i}",
                use_container_width=True,
            ):

                st.session_state.selected_class = i


    selected_class = st.session_state.selected_class


    st.success(
        f"📚 Class {selected_class} selected"
    )


    topics = {

        1: [
            ("🔤", "Alphabet & Sounds"),
            ("🔢", "Numbers 1–20"),
            ("🍎", "Fruits"),
            ("🐾", "Animals"),
            ("👨‍👩‍👧", "Family"),
            ("🏫", "My School"),
        ],

        2: [
            ("🔢", "Numbers 1–50"),
            ("🎨", "Colours"),
            ("🔷", "Shapes"),
            ("🍎", "Fruits"),
            ("🌳", "Nature"),
            ("💬", "Simple Sentences"),
        ],

        3: [
            ("🔢", "Numbers 1–100"),
            ("🐦", "Birds & Animals"),
            ("🌱", "Plants"),
            ("🍚", "Food"),
            ("🧍", "Body Parts"),
            ("💬", "Daily Sentences"),
        ],

        4: [
            ("📖", "Reading"),
            ("✍️", "Writing"),
            ("🌳", "Environment"),
            ("🏘️", "Community"),
            ("🔢", "Numbers 1–100"),
            ("💬", "Conversation"),
        ],

        5: [
            ("📚", "Reading"),
            ("🧠", "Vocabulary"),
            ("🌍", "Environment"),
            ("➕", "Mathematics"),
            ("🔢", "Numbers 1–100"),
            ("💬", "Dialogue"),
        ],
    }


    lesson_cols = st.columns(3)


    for index, (
        icon,
        title
    ) in enumerate(
        topics[selected_class]
    ):

        with lesson_cols[index % 3]:

            ui_html(
                f"""
                <div class="card">

                    <div class="card-icon">
                        {icon}
                    </div>

                    <div class="card-title">
                        {esc(title)}
                    </div>

                    <div class="card-text">
                        Class {selected_class}
                        primary learning activity
                    </div>

                </div>
                """
            )


            if st.button(
                "Start Lesson →",
                key=f"lesson_{selected_class}_{index}",
                use_container_width=True,
            ):

                lower = title.lower()


                if "number" in lower:

                    st.session_state.page = "Numbers"

                elif "fruit" in lower:

                    st.session_state.page = "Fruits"

                elif (
                    "sentence" in lower
                    or "conversation" in lower
                    or "dialogue" in lower
                ):

                    st.session_state.page = "Sentences"

                else:

                    st.session_state.page = "Flash Cards"


                st.rerun()


# ============================================================
# TRANSLATION
# ============================================================

elif page == "Translate":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                🌐 Quick Translate
            </div>

            <div class="hero-text">
                English / Hindi → Santhali · Ol Chiki
            </div>

            <div class="hero-tree">
                🌳
            </div>

        </div>
        """
    )


    if backend_online:

        ui_html(
            """
            <div class="offline">

                <div class="dot"></div>

                AI Translation Backend Online

            </div>
            """
        )

    else:

        st.warning(
            "Start the FastAPI backend for AI translation."
        )


    st.write("")


    mode = st.radio(
        "Input Mode",
        [
            "⌨️ Text",
            "🎤 Voice",
        ],
        horizontal=True,
    )


    # ========================================================
    # RESULT FUNCTION
    # ========================================================

    def show_result(data):

        detected = data.get(
            "detected_language",
            "Unknown"
        )


        language_names = {

            "en": "English 🇬🇧",
            "english": "English 🇬🇧",

            "hi": "Hindi 🇮🇳",
            "hindi": "Hindi 🇮🇳",
        }


        detected_display = language_names.get(
            str(detected).lower(),
            str(detected)
        )


        st.success(
            f"Detected: {detected_display}"
        )


        st.markdown("### Input")


        ui_html(
            f"""
            <div class="card">

                <div class="card-text"
                     style="
                        color:#18251D !important;
                        font-size:14px;
                        font-weight:700;
                     ">

                    {esc(data.get("input_text", ""))}

                </div>

            </div>
            """
        )


        st.markdown("### 🌿 Santali · Ol Chiki")


        santali_text = data.get(
            "santali_text",
            ""
        )


        ui_html(
            f"""
            <div class="flashcard">

                <div class="flash-language">
                    SANTHALI · OL CHIKI
                </div>

                <div class="flash-answer">
                    {esc(santali_text)}
                </div>

            </div>
            """
        )


        audio_file = data.get(
            "audio_file"
        )


        if audio_file:

            st.markdown("### 🔊 Santali Voice")


            try:

                audio_response = requests.get(
                    f"{API_URL}/audio/{audio_file}",
                    timeout=20,
                )


                if audio_response.status_code == 200:

                    st.audio(
                        audio_response.content,
                        format="audio/wav",
                    )

                else:

                    st.warning(
                        "Audio could not be loaded."
                    )

            except Exception:

                st.warning(
                    "Audio unavailable."
                )


    # ========================================================
    # TEXT TRANSLATION
    # ========================================================

    if mode == "⌨️ Text":

        language = st.selectbox(
            "Input Language",
            [
                "Auto Detect",
                "English",
                "Hindi",
            ],
        )


        text_input = st.text_area(
            "Enter classroom text",

            placeholder=(
                "Type English or Hindi here..."
            ),

            height=150,
        )


        if st.button(
            "Translate → Santali",
            type="primary",
            use_container_width=True,
        ):

            if not backend_online:

                st.error(
                    "FastAPI backend is not running."
                )

            elif not text_input.strip():

                st.warning(
                    "Please enter some text."
                )

            else:

                language_map = {

                    "Auto Detect": None,
                    "English": "en",
                    "Hindi": "hi",
                }


                selected_language = language_map[
                    language
                ]


                payload = {
                    "text": text_input.strip()
                }


                if selected_language:

                    payload["language"] = (
                        selected_language
                    )


                try:

                    with st.spinner(
                        "🌳 Janani is translating..."
                    ):

                        response = requests.post(
                            f"{API_URL}/translate/text",
                            json=payload,
                            timeout=120,
                        )


                    if response.status_code == 200:

                        show_result(
                            response.json()
                        )

                    else:

                        try:

                            error = response.json().get(
                                "detail",
                                "Translation failed."
                            )

                        except Exception:

                            error = response.text


                        st.error(
                            error
                        )


                except requests.exceptions.ConnectionError:

                    st.error(
                        "Cannot connect to FastAPI."
                    )

                except requests.exceptions.Timeout:

                    st.error(
                        "Translation timed out."
                    )

                except Exception as error:

                    st.error(
                        str(error)
                    )


    # ========================================================
    # VOICE TRANSLATION
    # ========================================================

    else:

        ui_html(
            """
            <div class="hero">

                <div class="hero-title">
                    🎤 Voice-to-Voice Translation
                </div>

                <div class="hero-text">
                    Speak English or Hindi and Janani
                    translates it into Santali and
                    generates voice output.
                </div>

                <div class="hero-tree">
                    🎙️
                </div>

            </div>
            """
        )


        st.markdown("### 🎙️ Your Recording")


        audio = st.audio_input(
            "Tap to record",
        )


        if audio:

            st.audio(
                audio,
                format="audio/wav",
            )


            if st.button(
                "Translate Voice →",
                type="primary",
                use_container_width=True,
            ):

                if not backend_online:

                    st.error(
                        "FastAPI backend is not running."
                    )

                else:

                    try:

                        files = {

                            "file": (
                                "recording.wav",
                                audio.getvalue(),
                                "audio/wav",
                            )

                        }


                        with st.spinner(
                            "🎤 Processing voice..."
                        ):

                            response = requests.post(
                                f"{API_URL}/translate/voice",
                                files=files,
                                timeout=180,
                            )


                        if response.status_code == 200:

                            show_result(
                                response.json()
                            )

                        else:

                            try:

                                error = response.json().get(
                                    "detail",
                                    "Voice translation failed."
                                )

                            except Exception:

                                error = response.text


                            st.error(
                                error
                            )


                    except requests.exceptions.ConnectionError:

                        st.error(
                            "Cannot connect to FastAPI."
                        )

                    except requests.exceptions.Timeout:

                        st.error(
                            "Voice translation timed out."
                        )

                    except Exception as error:

                        st.error(
                            str(error)
                        )


# ============================================================
# FLASH CARDS
# ============================================================

elif page == "Flash Cards":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                🃏 Learning Flash Cards
            </div>

            <div class="hero-text">
                Visual vocabulary for Classes 1–5.
                Learn • See • Speak • Practice.
            </div>

            <div class="hero-tree">
                🧒
            </div>

        </div>
        """
    )


    language = st.selectbox(
        "Learning Language",
        [
            "Santhali",
            "Mundari",
            "Ho",
        ],
        key="flash_language",
    )


    category = st.selectbox(
        "Learning Category",
        [
            "Fruits",
            "Animals",
            "Colours",
            "School",
            "Family",
            "Nature",
            "Body Parts",
        ],
        key="flash_category",
    )


    # --------------------------------------------------------
    # DEMO LEARNING DATA
    # --------------------------------------------------------
    #
    # Santhali examples are displayed in Ol Chiki.
    # Mundari/Ho sections are kept as learning cards so
    # the UI is ready for the verified local dataset.
    # --------------------------------------------------------

    flashcards = {

        "Santhali": {

            "Fruits": [
                ("🍎", "Apple", "ᱟᱯᱷᱨᱤᱠᱚᱴ"),
                ("🍌", "Banana", "ᱠᱮᱞᱟ"),
                ("🥭", "Mango", "ᱟᱢ"),
                ("🍊", "Orange", "ᱠᱟᱛᱷᱟ"),
                ("🍉", "Watermelon", "ᱛᱟᱨᱵᱩᱡ"),
            ],

            "Animals": [
                ("🐘", "Elephant", "ᱦᱟᱹᱛᱤ"),
                ("🐄", "Cow", "ᱜᱟᱹᱭ"),
                ("🐐", "Goat", "ᱢᱮᱨᱚᱢ"),
                ("🐕", "Dog", "ᱥᱮᱛᱟ"),
            ],

            "Colours": [
                ("🔴", "Red", "ᱞᱟᱞ"),
                ("🟢", "Green", "ᱥᱟᱵᱩᱡ"),
                ("⚪", "White", "ᱯᱩᱸᱰ"),
                ("⚫", "Black", "ᱠᱟᱞᱟ"),
            ],

            "School": [
                ("📚", "Book", "ᱯᱩᱛᱷᱤ"),
                ("✏️", "Pen", "ᱯᱮᱱ"),
                ("🏫", "School", "ᱥᱠᱩᱞ"),
            ],

            "Family": [
                ("👨", "Father", "ᱵᱟᱵᱟ"),
                ("👩", "Mother", "ᱢᱟᱭᱟᱹ"),
                ("👦", "Boy", "ᱠᱚᱲᱟ"),
                ("👧", "Girl", "ᱠᱩᱲᱤ"),
            ],

            "Nature": [
                ("🌳", "Tree", "ᱫᱟᱨᱮ"),
                ("☀️", "Sun", "ᱥᱤᱧ"),
                ("💧", "Water", "ᱫᱟᱜ"),
            ],

            "Body Parts": [
                ("👁️", "Eye", "ᱢᱮᱫ"),
                ("👂", "Ear", "ᱞᱩᱛᱩᱨ"),
                ("✋", "Hand", "ᱡᱟᱹᱛ"),
            ],
        },

        "Mundari": {

            "Fruits": [
                ("🍎", "Apple", "Apple"),
                ("🍌", "Banana", "Banana"),
                ("🥭", "Mango", "Mango"),
                ("🍊", "Orange", "Orange"),
            ],

            "Animals": [
                ("🐘", "Elephant", "Elephant"),
                ("🐄", "Cow", "Cow"),
                ("🐐", "Goat", "Goat"),
            ],

            "Colours": [
                ("🔴", "Red", "Red"),
                ("🟢", "Green", "Green"),
                ("⚪", "White", "White"),
            ],

            "School": [
                ("📚", "Book", "Book"),
                ("✏️", "Pen", "Pen"),
                ("🏫", "School", "School"),
            ],

            "Family": [
                ("👨", "Father", "Father"),
                ("👩", "Mother", "Mother"),
            ],

            "Nature": [
                ("🌳", "Tree", "Tree"),
                ("💧", "Water", "Water"),
            ],

            "Body Parts": [
                ("👁️", "Eye", "Eye"),
                ("👂", "Ear", "Ear"),
            ],
        },

        "Ho": {

            "Fruits": [
                ("🍎", "Apple", "Apple"),
                ("🍌", "Banana", "Banana"),
                ("🥭", "Mango", "Mango"),
                ("🍊", "Orange", "Orange"),
            ],

            "Animals": [
                ("🐘", "Elephant", "Elephant"),
                ("🐄", "Cow", "Cow"),
                ("🐐", "Goat", "Goat"),
            ],

            "Colours": [
                ("🔴", "Red", "Red"),
                ("🟢", "Green", "Green"),
                ("⚪", "White", "White"),
            ],

            "School": [
                ("📚", "Book", "Book"),
                ("✏️", "Pen", "Pen"),
                ("🏫", "School", "School"),
            ],

            "Family": [
                ("👨", "Father", "Father"),
                ("👩", "Mother", "Mother"),
            ],

            "Nature": [
                ("🌳", "Tree", "Tree"),
                ("💧", "Water", "Water"),
            ],

            "Body Parts": [
                ("👁️", "Eye", "Eye"),
                ("👂", "Ear", "Ear"),
            ],
        },
    }


    cards = flashcards[
        language
    ][
        category
    ]


    if (
        st.session_state.flash_index
        >= len(cards)
    ):

        st.session_state.flash_index = 0


    index = st.session_state.flash_index


    emoji, english, tribal = cards[index]


    left, center, right = st.columns(
        [1, 2.2, 1]
    )


    with center:

        ui_html(
            f"""
            <div class="flashcard">

                <div class="flash-emoji">
                    {emoji}
                </div>

                <div class="flash-word">
                    {esc(english)}
                </div>

                <div class="flash-language">
                    {esc(language)}
                </div>

                <div class="flash-answer">
                    {esc(tribal)}
                </div>

            </div>
            """
        )


    st.write("")


    previous, counter, next_col = st.columns(
        [1, 1, 1]
    )


    with previous:

        if st.button(
            "← Previous",
            use_container_width=True,
        ):

            st.session_state.flash_index = (
                index - 1
            ) % len(cards)

            st.rerun()


    with counter:

        ui_html(
            f"""
            <div style="
                text-align:center;
                padding:11px;
                color:#14532D;
                font-weight:900;
                font-size:13px;
            ">
                {index + 1} / {len(cards)}
            </div>
            """
        )


    with next_col:

        if st.button(
            "Next →",
            use_container_width=True,
        ):

            st.session_state.flash_index = (
                index + 1
            ) % len(cards)

            st.rerun()


# ============================================================
# NUMBERS 1–100
# ============================================================

elif page == "Numbers":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                🔢 Numbers 1–100
            </div>

            <div class="hero-text">
                Foundational numeracy practice
                for primary-school learners.
            </div>

            <div class="hero-tree">
                123
            </div>

        </div>
        """
    )


    language = st.selectbox(
        "Learning Language",
        [
            "Santhali",
            "Mundari",
            "Ho",
        ],
        key="number_language",
    )


    ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ]


    tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ]


    def number_name(number):

        if number == 100:

            return "One Hundred"


        if number < 20:

            return ones[number]


        if number % 10 == 0:

            return tens[number // 10]


        return (
            tens[number // 10]
            + "-"
            + ones[number % 10]
        )


    st.markdown(
        f"### 📚 {language} Number Practice"
    )


    for start in range(
        1,
        101,
        10
    ):

        cols = st.columns(5)


        for i, number in enumerate(
            range(
                start,
                min(
                    start + 10,
                    101
                )
            )
        ):

            with cols[i % 5]:

                ui_html(
                    f"""
                    <div class="number-card">

                        <div class="number">
                            {number}
                        </div>

                        <div class="number-name">
                            {number_name(number)}
                        </div>

                    </div>
                    """
                )


# ============================================================
# FRUITS
# ============================================================

elif page == "Fruits":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                🍎 Fruits
            </div>

            <div class="hero-text">
                Visual vocabulary for primary learners.
            </div>

            <div class="hero-tree">
                🍎
            </div>

        </div>
        """
    )


    language = st.selectbox(
        "Learning Language",
        [
            "Santhali",
            "Mundari",
            "Ho",
        ],
        key="fruit_language",
    )


    fruits = [
        ("🍎", "Apple"),
        ("🍌", "Banana"),
        ("🥭", "Mango"),
        ("🍊", "Orange"),
        ("🍉", "Watermelon"),
        ("🍇", "Grapes"),
        ("🍍", "Pineapple"),
        ("🥥", "Coconut"),
        ("🍋", "Lemon"),
        ("🍓", "Strawberry"),
        ("🍐", "Pear"),
        ("🥝", "Kiwi"),
    ]


    fruit_cols = st.columns(4)


    for i, (
        emoji,
        fruit
    ) in enumerate(fruits):

        with fruit_cols[i % 4]:

            ui_html(
                f"""
                <div class="card">

                    <div class="card-icon">
                        {emoji}
                    </div>

                    <div class="card-title">
                        {esc(fruit)}
                    </div>

                    <div class="card-text">
                        Primary vocabulary · {esc(language)}
                    </div>

                </div>
                """
            )


            if st.button(
                "Practice →",
                key=f"fruit_{i}",
                use_container_width=True,
            ):

                st.session_state.page = "Flash Cards"

                st.session_state.flash_language = language

                st.session_state.flash_category = "Fruits"

                st.rerun()


# ============================================================
# SENTENCES
# ============================================================

elif page == "Sentences":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                💬 Classroom Sentences
            </div>

            <div class="hero-text">
                Simple classroom and everyday
                communication for primary learners.
            </div>

            <div class="hero-tree">
                💬
            </div>

        </div>
        """
    )


    language = st.selectbox(
        "Learning Language",
        [
            "Santhali",
            "Mundari",
            "Ho",
        ],
        key="sentence_language",
    )


    sentence_data = {

        "Santhali": [

            (
                "Hello",
                "ᱡᱚᱦᱟᱨ"
            ),

            (
                "My name is Puneeth.",
                "ᱦᱟᱭ ᱤᱧᱟᱹᱜ ᱧᱩᱛᱩᱢ ᱫᱚ ᱯᱮᱱᱮᱛᱷ ᱾"
            ),

            (
                "Give praise.",
                "ᱥᱟᱨᱦᱟᱶ ᱮᱢ ᱾"
            ),

            (
                "Let us learn.",
                "ᱟᱵᱚ ᱥᱤᱠᱟᱹᱣ ᱢᱮ ᱾"
            ),
        ],

        "Mundari": [

            (
                "Hello",
                "Hello"
            ),

            (
                "Good morning",
                "Good morning"
            ),

            (
                "Let us learn.",
                "Let us learn."
            ),
        ],

        "Ho": [

            (
                "Hello",
                "Hello"
            ),

            (
                "Good morning",
                "Good morning"
            ),

            (
                "Let us learn.",
                "Let us learn."
            ),
        ],
    }


    sentences = sentence_data[
        language
    ]


    for i, (
        english_sentence,
        tribal_sentence
    ) in enumerate(
        sentences,
        start=1
    ):

        ui_html(
            f"""
            <div class="card"
                 style="margin-bottom:12px;">

                <div class="card-title">
                    {i}. {esc(english_sentence)}
                </div>

                <div style="
                    color:#14532D;
                    font-size:20px;
                    font-weight:900;
                    margin-top:12px;
                ">
                    {esc(tribal_sentence)}
                </div>

            </div>
            """
        )


# ============================================================
# MY CONTENT
# ============================================================

elif page == "My Content":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                📚 My Content
            </div>

            <div class="hero-text">
                Local learning resources and
                generated classroom materials.
            </div>

            <div class="hero-tree">
                📖
            </div>

        </div>
        """
    )


    content = [

        (
            "🌱",
            "Plants — Worksheet",
            "Class 4 · EVS"
        ),

        (
            "🐘",
            "Animals — Flashcards",
            "Class 3 · EVS"
        ),

        (
            "🔢",
            "Numbers — Quiz",
            "Class 2 · Maths"
        ),

        (
            "💧",
            "Water Cycle — Activity",
            "Class 4 · EVS"
        ),

        (
            "🍎",
            "Fruits — Vocabulary",
            "Class 1 · EVS"
        ),

        (
            "💬",
            "Sentences — Practice",
            "Class 1–5"
        ),
    ]


    content_cols = st.columns(3)


    for i, item in enumerate(content):

        icon, title, subtitle = item


        with content_cols[i % 3]:

            ui_html(
                f"""
                <div class="card">

                    <div class="card-icon">
                        {icon}
                    </div>

                    <div class="card-title">
                        {esc(title)}
                    </div>

                    <div class="card-text">
                        {esc(subtitle)}
                    </div>

                </div>
                """
            )


            st.button(
                "Open →",
                key=f"content_{i}",
                use_container_width=True,
            )


# ============================================================
# STUDENTS
# ============================================================

elif page == "Students":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                👩‍🎓 Students & Progress
            </div>

            <div class="hero-text">
                Monitor classroom learning progress.
            </div>

            <div class="hero-tree">
                👧
            </div>

        </div>
        """
    )


    stats = [

        ("Students", "28", "Total"),

        ("Present", "24", "Today"),

        ("Absent", "4", "Today"),

        ("Progress", "80%", "Average"),
    ]


    stat_cols = st.columns(4)


    for col, (
        label,
        value,
        subtitle
    ) in zip(
        stat_cols,
        stats
    ):

        with col:

            ui_html(
                f"""
                <div class="stat">

                    <div class="stat-label">
                        {esc(label)}
                    </div>

                    <div class="stat-value">
                        {esc(value)}
                    </div>

                    <div class="stat-change">
                        {esc(subtitle)}
                    </div>

                </div>
                """
            )


    st.markdown("### Recent Student Progress")


    students = [
        ("Ravi Hansda", "Present", "8 / 10", "80%"),
        ("Sita Murmu", "Present", "7 / 10", "70%"),
        ("Arjun Tudu", "Absent", "5 / 10", "50%"),
        ("Pooja Kisku", "Present", "9 / 10", "90%"),
    ]


    for name, attendance, lessons, progress in students:

        ui_html(
            f"""
            <div class="card"
                 style="margin-bottom:10px;
                        min-height:auto;">

                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:15px;
                    flex-wrap:wrap;
                ">

                    <div>

                        <div class="card-title"
                             style="margin-top:0;">
                            {esc(name)}
                        </div>

                        <div class="card-text">
                            {esc(attendance)}
                            · Lessons {esc(lessons)}
                        </div>

                    </div>

                    <div style="
                        color:#14532D;
                        font-size:17px;
                        font-weight:900;
                    ">
                        {esc(progress)}
                    </div>

                </div>

            </div>
            """
        )


# ============================================================
# SETTINGS
# ============================================================

elif page == "Settings":

    ui_html(
        """
        <div class="hero">

            <div class="hero-title">
                ⚙️ Janani Settings
            </div>

            <div class="hero-text">
                Configure language, voice and
                offline learning preferences.
            </div>

            <div class="hero-tree">
                ⚙️
            </div>

        </div>
        """
    )


    st.markdown("### 🌐 Language")


    st.selectbox(
        "Default Source Language",
        [
            "Hindi",
            "English",
        ],
    )


    st.selectbox(
        "Target Tribal Language",
        [
            "Santhali",
            "Mundari",
            "Ho",
        ],
    )


    st.markdown("### 🔊 Audio")


    st.selectbox(
        "Voice Output",
        [
            "Enabled",
            "Disabled",
        ],
    )


    st.markdown("### 💾 Offline")


    st.success(
        "Janani is designed for offline-first "
        "primary-school learning."
    )


    if backend_online:

        st.success(
            "🟢 AI backend is available."
        )

    else:

        st.warning(
            "🟡 AI backend is currently offline."
        )


# ============================================================
# FOOTER
# ============================================================

ui_html(
    """
    <div class="footer">

        📖 <b>Janani</b>
        &nbsp;•&nbsp;
        Every Child. Every Language.

        <br><br>

        Santhali • Mundari • Ho
        &nbsp;•&nbsp;
        Offline-first MTB-MLE

        <br>

        Whisper · IndicTrans2 · DhVaani

    </div>
    """
)