const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors({
  origin:"*",
  methods:["GET","PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const FILE = "data.json";

let db = { 
  users: [], 
  students: {},
  votes: []
};

if (fs.existsSync(FILE)) {
  db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!db.users) db.users = [];
  if (!db.students) db.students = {};
}

function saveData() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

// ================= AI INSIGHTS ENGINE =================
const AI_TEMPLATES = {
  leadership: [
    "Develop strategic vision through executive case studies",
    "Practice public speaking at Toastmasters weekly",
    "Lead a cross-functional project team",
    "Study decision-making patterns of Fortune 500 CEOs",
    "Mentor junior peers to build leadership muscle"
  ],
  communication: [
    "Join a debate club or improv theatre group",
    "Practice active listening with daily reflection journaling",
    "Write structured professional emails every morning",
    "Record presentations and do self-critique reviews",
    "Study cross-cultural communication frameworks"
  ],
  teamwork: [
    "Participate in collaborative team sports regularly",
    "Volunteer to lead group community initiatives",
    "Take a certified conflict resolution workshop",
    "Organize team-building events quarterly",
    "Develop emotional intelligence via EQ assessments"
  ],
  "problem solving": [
    "Solve LeetCode / HackerRank challenges daily",
    "Play competitive strategy games like Chess or Go",
    "Analyze Harvard Business School case studies",
    "Practice lateral thinking puzzles for 20 mins daily",
    "Participate in hackathons and innovation sprints"
  ],
  adaptability: [
    "Travel solo to a new city or country each quarter",
    "Learn a new software tool or framework monthly",
    "Volunteer for projects outside your comfort zone",
    "Practice mindfulness meditation with Headspace",
    "Attend change management and agile training programs"
  ]
};

const CAREER_PATHS = {
  "A+": { title: "C-Suite Executive", icon: "🏛️", desc: "Fortune 500 leadership trajectory" },
  "A":  { title: "Senior Director",   icon: "🚀", desc: "High-impact industry leader" },
  "B+": { title: "Team Lead",         icon: "⭐", desc: "Rising organizational star" },
  "B":  { title: "Senior Specialist", icon: "📈", desc: "Strong individual contributor" },
  "C":  { title: "Specialist",        icon: "🌱", desc: "Solid foundation to build upon" }
};

function getUniqueAIInsights(scores, studentName) {
  const values = Object.values(scores);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / values.length;

  let insight, tier;
 if (avg >= 8)      { insight = "🌟 Top Performer"; tier = "A+"; }
else if (avg >= 6) { insight = "🚀 Strong Performer"; tier = "A"; }
else if (avg >= 4) { insight = "🌟 All-Rounder"; tier = "B+"; }
else if (avg >= 2) { insight = "📈 Growing"; tier = "B"; }
else               { insight = "🌱 Beginner"; tier = "C"; }
  const skillsArray = Object.entries(scores);
  const bestSkill  = skillsArray.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  const worstSkill = skillsArray.reduce((a, b) => a[1] < b[1] ? a : b)[0];

  const seed = studentName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  
  const suggestions = [
    `🔑 Amplify strength: ${AI_TEMPLATES[bestSkill.toLowerCase().replace(" solving"," problem solving").replace("problem problem solving","problem solving")][seed % 5]}`,
    `🎯 Close the gap: ${AI_TEMPLATES[worstSkill.toLowerCase().replace("problem solving","problem solving")][( seed + 2) % 5]}`,
    ["📅 Build a 90-day skill mastery roadmap with weekly milestones",
     "🤝 Find an accountability partner from your peer group",
     "📖 Keep a weekly progress reflection journal",
     "🌐 Join a professional development network in your field",
     "🎓 Seek mentorship from a recognized top performer"][seed % 5]
  ];

  const career = CAREER_PATHS[tier] || CAREER_PATHS["C"];

  return {
    insight, suggestions,
    percentile: Math.min(99, 50 + (avg / 5)),
    performanceTier: tier,
    benchmark: `${avg.toFixed(1)} / 50 avg (${(avg / 50 * 100).toFixed(0)}%)`,
    career,
    strengths: skillsArray.filter(([,v]) => v >= avg).map(([k]) => k),
    growthAreas: skillsArray.filter(([,v]) => v < avg).map(([k]) => k)
  };
}

// ================= REGISTER =================
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ message: "❌ Username and password required!" });
  if (db.users.find(u => u.username === username)) {
    return res.json({ message: "❌ User already exists!" });
  }
  db.users.push({ username, password, credits: 25 });
  saveData();
  res.json({ message: "✅ Registered successfully! 🎁 25 credits added" });
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) return res.json({ user: null, message: "❌ Invalid credentials!" });

  user.credits = 25;
  saveData();
  res.json({ user: username, credits: user.credits });
});

// ================= FACULTY LOGIN =================
app.post("/faculty-login", (req, res) => {
  const { username, password } = req.body;
  
  // Hardcoded faculty credentials
  const facultyUsername = "GCOEK";
  const facultyPassword = "6036";

  if (username === facultyUsername && password === facultyPassword) {
    res.json({ success: true, message: "Welcome Faculty!" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// ================= STUDENTS =================
app.get("/students", (req, res) => {
  const list = Object.keys(db.students).map(name => ({
    name,
    totalVotes: db.students[name].voters?.length || 0,
    totalScore: Object.values(db.students[name].scores || {}).reduce((a,b)=>a+b,0)
  }));
  res.json(list);
});

// ================= ADD STUDENT =================
app.post("/add-student", (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === "") return res.json({ message: "❌ Student name required!" });
  const studentName = name.trim();
  if (!db.students[studentName]) {
    db.students[studentName] = {
      scores: {
        "Leadership": 0, "Communication": 0, "Teamwork": 0,
        "Problem Solving": 0, "Adaptability": 0
      },
      voters: []
    };
  }
  saveData();
  res.json({ message: `✅ "${studentName}" added successfully!` });
});

// ================= DELETE STUDENT =================
app.delete("/student/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  if (!db.students[name]) return res.json({ message: "❌ Student not found!" });
  delete db.students[name];
  saveData();
  res.json({ message: `✅ "${name}" removed.` });
});

// ================= VOTE =================
app.post("/vote", (req, res) => {
  const { student, user, skills } = req.body;
  if (!student || !user || !skills) return res.json({ message: "❌ Student, user, and skills required!" });

  const s = db.students[student];
  const u = db.users.find(x => x.username === user);
  if (!s || !u) return res.json({ message: "❌ Login first & add student!" });

  let cost = 0;
  Object.values(skills).forEach(v => cost += Math.pow(v, 2));

  if (cost > u.credits) return res.json({ message: `❌ Insufficient credits! Need ${cost}, have ${u.credits}` });

  u.credits -= cost;
  Object.keys(skills).forEach(skill => {
    if (skills[skill] > 0) s.scores[skill] = (s.scores[skill] || 0) + Number(skills[skill]);
  });
s.total = Object.values(s.scores).reduce((a, b) => a + b, 0);
  // ✅ Store full vote details
if (!db.votes) db.votes = [];

db.votes.push({
  voter: user,
  student: student,
  skills: skills,
  time: new Date().toISOString()
});

  saveData();

  res.json({ message: `✅ Vote submitted! Cost: ${cost} credits`, remainingCredits: u.credits });
});

// ================= LEADERBOARD =================
app.get("/leaderboard", (req, res) => {
  const result = {};
  Object.keys(db.students).forEach(name => {
    let scores = db.students[name].scores || {};
    ["Leadership","Communication","Teamwork","Problem Solving","Adaptability"].forEach(sk => {
      scores[sk] = scores[sk] || 0;
    });
    const total = Object.values(scores).reduce((a,b)=>a+b,0);
    const ai = getUniqueAIInsights(scores, name);
    result[name] = { scores, total, ai, voters: db.students[name].voters?.length || 0, rank: 0 };
  });

  const sorted = Object.entries(result).sort(([,a],[,b]) => b.total - a.total);

  const ranked = {};
  sorted.forEach(([name, data], i) => {
    ranked[name] = { ...data, rank: i + 1 };
  });

  res.json(ranked);
});

// ================= RESET =================
app.post("/reset", (req, res) => {
  db.students = {};
  db.users.forEach(u => u.credits = 25);
  saveData();
  res.json({ message: "✅ Data reset!" });
});

// ================= HEALTH =================
app.get("/", (req, res) => {
  res.json({
    message: "🚀 SkillLedger Pro Backend ✅",
    students: Object.keys(db.students).length,
    users: db.users.length
  });
});
app.get("/all-votes", (req, res) => {
  res.json(db.votes || []);
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
