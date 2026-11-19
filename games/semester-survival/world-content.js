/* Authored world, cast, dialogue and eight-semester campaign content.
 * Content is data-only so simulation, UI and rendering can consume one source of truth.
 */
(function (root) {
  'use strict';

  const districts = {
    residence: {
      title: 'Student Residence',
      mood: 'A compact shared student residence with lived-in corridors and a courtyard.',
      exits: ['township', 'campus'],
      places: [
        { id: 'room', name: 'Shared Room', actions: ['sleep', 'study', 'check-phone'] , exposure: 'indoor' },
        { id: 'courtyard', name: 'Residence Courtyard', actions: ['talk-roommate', 'socialize'] , exposure: 'outdoor' },
        { id: 'laundry', name: 'Laundry Corner', actions: ['wash-clothes'] , exposure: 'sheltered' }
      ]
    },
    township: {
      title: 'Township',
      mood: 'The everyday student district: affordable services, foot traffic and familiar faces.',
      exits: ['residence', 'campus', 'city'],
      places: [
        { id: 'mama-njeri-kiosk', name: 'Mama Njeri’s Food Kiosk', actions: ['buy-meal', 'talk-vendor'] , exposure: 'sheltered' },
        { id: 'print-hub', name: 'Print Hub', actions: ['print-notes', 'bind-assignment'] , exposure: 'indoor' },
        { id: 'barber', name: 'Barber Shop', actions: ['get-haircut', 'talk-barber'] , exposure: 'indoor' },
        { id: 'mini-mart', name: 'Corner Mini-Mart', actions: ['buy-supplies'] , exposure: 'indoor' },
        { id: 'matatu-stage', name: 'Transport Stage', actions: ['travel-campus', 'travel-city'] , exposure: 'sheltered' },
        { id: 'study-cafe', name: 'Study Café', actions: ['study', 'meet-friend'] , exposure: 'indoor' }
      ]
    },
    campus: {
      title: 'University Campus',
      mood: 'A busy academic core with lecture spaces, student services and quiet study corners.',
      exits: ['residence', 'township', 'city'],
      places: [
        { id: 'main-gate', name: 'Main Gate', actions: ['check-noticeboard', 'meet-students'] , exposure: 'outdoor' },
        { id: 'lecture-hall', name: 'Main Lecture Hall', actions: ['attend-lecture', 'ask-question'] , exposure: 'indoor' },
        { id: 'library', name: 'University Library', actions: ['study', 'borrow-book'] , exposure: 'indoor' },
        { id: 'data-lab', name: 'Computer and Data Lab', actions: ['lab-session', 'work-on-project'] , exposure: 'indoor' },
        { id: 'student-commons', name: 'Student Commons', actions: ['socialize', 'join-club'] , exposure: 'indoor' },
        { id: 'administration', name: 'Student Administration', actions: ['check-fees', 'resolve-record'] , exposure: 'indoor' },
        { id: 'lecturer-office', name: 'Lecturer Offices', actions: ['consult-lecturer'] , exposure: 'indoor' }
      ]
    },
    city: {
      title: 'Nairobi City',
      mood: 'A later-game destination for interviews, errands, events and new opportunities.',
      exits: ['township', 'campus'],
      places: [
        { id: 'career-centre', name: 'Career Centre', actions: ['career-advice', 'find-internship'] , exposure: 'indoor' },
        { id: 'interview-suite', name: 'Interview Suite', actions: ['attend-interview'] , exposure: 'indoor' },
        { id: 'bookshop', name: 'Bookshop Arcade', actions: ['buy-books'] , exposure: 'indoor' },
        { id: 'innovation-hub', name: 'Innovation Hub', actions: ['network', 'pitch-project'] , exposure: 'indoor' }
      ]
    }
  };

  const characters = {
    jay: {
      name: 'Jay', role: 'Protagonist', home: 'residence', traits: [],
      introduction: 'Your university journey begins here.',
      topics: {
        identity: ['Jay is the player character. His choices, actions and relationships shape the story.']
      },
      visualProfile: {
        status: 'design-baseline',
        ageRange: 'adult university student, approximately 18–22 at first year',
        skinTone: 'deep brown',
        hair: 'short textured natural curls',
        eyes: 'expressive dark eyes',
        build: 'lean, active, natural student proportions',
        outfit: 'open deep-blue overshirt, warm-white T-shirt, dark practical trousers, worn-in sneakers, dark backpack and simple wristwatch',
        artRule: 'Keep one consistent identity across all views and animation states.'
      }
    },
    brian: {
      name: 'Brian', role: 'Roommate', home: 'residence', traits: ['practical', 'witty', 'protective'],
      introduction: 'You must be the new roommate. I’m Brian. Top bunk is mine, by the way.',
      topics: {
        budget: ['Track your spending. Small things add up before the month ends.', 'I can show you where students get affordable meals.'],
        study: ['The library gets quieter after lunch. That is usually my best study window.'],
        personal: ['First week can feel strange. Give yourself time to settle in.']
      },
      conversationChoices: [{"id":"share-pressure","label":"Admit the week is getting heavy","response":"I get that. You don't have to pretend everything is sorted. Let's pick one thing to tackle tonight, then get some sleep.","expression":"concerned","effects":{"affinity":2,"trust":3}},{"id":"ask-routine","label":"Ask how he keeps a steady routine","response":"I keep it simple: class, food, one proper study block, then rest. When I try to do everything at once, nothing gets done.","expression":"encouraging","effects":{"affinity":1,"trust":2}},{"id":"ask-trust","label":"Ask for his honest opinion","response":"Honestly? You seem capable, but you put pressure on yourself. Let people help before things pile up.","requires":{"affinity":18},"expression":"serious","effects":{"affinity":2,"trust":4}}]
    },
    amina: {
      name: 'Amina', role: 'Main Cast · Coursemate', home: 'campus', traits: ['curious', 'ambitious', 'empathetic'],
      visualProfile: {
        status: 'model-sheet-required',
        clothing: 'Muslim-appropriate modest contemporary university clothing with a carefully designed hijab',
        artRule: 'Beautiful, individual design; preserve hijab styling and outfit continuity across every view and animation.'
      },
      introduction: 'Hey, you’re in my class, right? I’m Amina. Have you found the lecture hall yet?',
      topics: {
        study: ['Let’s compare notes after the lecture. I want to make sure I understood the examples.'],
        project: ['A good project starts with a question worth answering, not just a fancy title.'],
        personal: ['You do not have to figure out the whole degree this week. One step at a time.']
      },
      conversationChoices: [{"id":"compare-notes","label":"Suggest comparing lecture notes","response":"That would help. I'll bring my notes from the examples, and we can check where our methods differ.","expression":"bright","effects":{"affinity":2,"trust":2}},{"id":"ask-project","label":"Ask what kind of project excites her","response":"Something useful to real people. I like when the data tells a story that would otherwise stay hidden.","expression":"curious","effects":{"affinity":2,"trust":1}},{"id":"personal-checkin","label":"Ask how she is settling in","response":"A little overwhelmed, if I'm honest, but excited too. It helps when classmates look out for one another.","requires":{"affinity":17},"expression":"soft","effects":{"affinity":2,"trust":3}}]
    },
    einstein: {
      name: 'Einstein', role: 'Main Cast', home: 'campus', traits: [],
      introduction: 'Hey, I’m Einstein. Good to finally meet you.',
      topics: { introduction: ['Einstein is part of the main cast. His detailed personality and story are authored separately from his visual approval.'] },
      visualProfile: { status: 'awaiting-approved-model-sheet', artRule: 'Create a distinctive silhouette and identity; do not reuse another cast member’s face or proportions.' },
      conversationChoices: [{"id":"ask-speciality","label":"Ask what he is working on","response":"I've been exploring how small assumptions change a model's results. The interesting part is discovering which assumption matters most.","expression":"animated","effects":{"affinity":2,"trust":1}},{"id":"challenge-idea","label":"Challenge him to explain it simply","response":"Fair challenge. If I can't explain the idea without hiding behind jargon, I probably don't understand it well enough yet.","expression":"amused","effects":{"affinity":1,"trust":2}}]
    },
    ernest: {
      name: 'Ernest', role: 'Main Cast', home: 'campus', traits: [],
      introduction: 'What’s up? I’m Ernest.',
      topics: { introduction: ['Ernest is part of the main cast. His detailed personality and story are authored separately from his visual approval.'] },
      visualProfile: { status: 'awaiting-approved-model-sheet', artRule: 'Create a distinctive silhouette and identity; do not reuse another cast member’s face or proportions.' },
      conversationChoices: [{"id":"ask-weekend","label":"Ask what he does outside class","response":"I try to get out, meet people and clear my head. University can't be lectures and deadlines every single day.","expression":"relaxed","effects":{"affinity":2,"trust":1}},{"id":"offer-collab","label":"Suggest building something together","response":"Now you're speaking my language. Bring an idea and let's see if we can turn it into something people can actually use.","expression":"excited","effects":{"affinity":2,"trust":2}}]
    },
    sumeya: {
      name: 'Sumeya', role: 'Main Cast', home: 'campus', traits: [],
      introduction: 'Hi, I’m Sumeya. It’s nice to meet you.',
      topics: { introduction: ['Sumeya is part of the main cast. Her detailed personality and story are authored separately from her visual approval.'] },
      visualProfile: {
        status: 'model-sheet-required',
        clothing: 'Muslim-appropriate modest contemporary university clothing with her own distinctive hijab styling',
        artRule: 'Beautiful, individual design distinct from Amina; preserve hijab styling and outfit continuity across every view and animation.'
      },
      conversationChoices: [{"id":"study-together","label":"Invite her to a focused study session","response":"I'd like that. A quiet session with clear goals sounds much better than pretending we can revise everything in one evening.","expression":"warm","effects":{"affinity":2,"trust":2}},{"id":"ask-interests","label":"Ask what she enjoys learning","response":"I enjoy finding the idea underneath a difficult problem. Once the pattern clicks, the whole topic feels different.","expression":"thoughtful","effects":{"affinity":2,"trust":1}},{"id":"ask-support","label":"Ask what helps when university gets stressful","response":"Having a plan helps, and so does being around people who listen without judging. We all need that sometimes.","requires":{"affinity":17},"expression":"gentle","effects":{"affinity":2,"trust":3}}]
    },
    wanjiku: {
      name: 'Wanjiku', role: 'Class Representative', home: 'campus', traits: ['organised', 'direct', 'fair'],
      introduction: 'I’m Wanjiku, the class rep. Check the noticeboard and class group for updates.',
      topics: {
        deadlines: ['I post confirmed deadlines as soon as the department shares them. Do not rely on rumours.'],
        groupwork: ['Choose a group that communicates. A brilliant idea cannot rescue a team that disappears.']
      },
      conversationChoices: [{"id":"ask-confirmed","label":"Ask where official updates appear","response":"Use the department noticeboard and official class channels. If a date isn't confirmed there, treat it as unverified.","expression":"firm","effects":{"affinity":1,"trust":2}},{"id":"offer-help","label":"Offer to help organise the class","response":"I appreciate that. Clear communication makes everyone's semester easier. I'll let you know when we need another pair of hands.","expression":"appreciative","effects":{"affinity":2,"trust":3}}]
    },
    njeri: {
      name: 'Mama Njeri', role: 'Food Vendor', home: 'township', traits: ['warm', 'observant', 'business-minded'],
      introduction: 'Karibu! What are you having today? Tell me your budget and we will work something out.',
      topics: {
        budget: ['Plan your meals for the week. Buying whatever looks nice every day gets expensive.'],
        campus: ['The morning rush is real. If you are late, take something you can carry.']
      },
      conversationChoices: [{"id":"meal-plan","label":"Ask for an affordable weekly meal plan","response":"We can plan around what you have. A filling meal at the right time is better than spending little bits all day and still being hungry.","expression":"kind","effects":{"affinity":2,"trust":2}},{"id":"ask-township","label":"Ask what is useful around the township","response":"Learn the reliable places first: food, printing, transport and a shop for basics. It saves time and money.","expression":"knowing","effects":{"affinity":1,"trust":2}}]
    },
    mwangi: {
      name: 'Dr. Mwangi', role: 'Lecturer', home: 'campus', traits: ['demanding', 'measured', 'supportive'],
      introduction: 'Good morning. I expect questions, not silence. If a concept is unclear, ask early.',
      topics: {
        coursework: ['Show me the step where your reasoning changes. We can work from there.'],
        consultation: ['Bring your attempt and specific questions. Consultation is not a substitute for starting the work.']
      }
    }
  };

  const semesterArcs = [
    {
      semester: 1, title: 'Finding Your Footing', theme: 'belonging and first routines',
      chapters: [
        { id: 's1-arrival', title: 'A Room of Your Own', objective: 'Settle into the shared residence and meet Brian.', location: 'residence', character: 'brian' },
        { id: 's1-orientation', title: 'The Long Way to Class', objective: 'Navigate the township and reach the main campus gate.', location: 'township', character: 'njeri' },
        { id: 's1-first-lecture', title: 'Names on the Register', objective: 'Attend the first lecture and introduce yourself to Amina.', location: 'campus', character: 'amina' },
        { id: 's1-budget', title: 'The Month Is Longer Than the Money', objective: 'Make a basic food and transport budget before spending again.', location: 'township', character: 'njeri' },
        { id: 's1-first-assessment', title: 'Show Your Working', objective: 'Prepare for and complete the first CAT in every registered course.', location: 'campus', character: 'mwangi' }
      ],
      conversationChoices: [{"id":"show-method","label":"Ask how to improve your working","response":"Write each assumption, show the intermediate steps, and explain why the method applies. Correct reasoning matters as much as the final answer.","expression":"measured","effects":{"affinity":1,"trust":3}},{"id":"ask-feedback","label":"Ask for direct feedback","response":"Then be prepared to act on it. Bring a specific attempt next time, and we can identify exactly where your reasoning needs work.","requires":{"trust":8},"expression":"supportive","effects":{"affinity":1,"trust":4}}]
    },
    {
      semester: 2, title: 'Building a Rhythm', theme: 'habits and friendship',
      chapters: [
        { id: 's2-routine', title: 'A Week That Works', objective: 'Build a weekly study and rest routine.', location: 'residence', character: 'brian' },
        { id: 's2-study-circle', title: 'Better Together', objective: 'Form a reliable study circle and complete a shared revision session.', location: 'campus', character: 'amina' },
        { id: 's2-club', title: 'Beyond the Timetable', objective: 'Attend a student-club meeting and make a commitment.', location: 'campus', character: 'wanjiku' }
      ]
    },
    {
      semester: 3, title: 'Pressure and Independence', theme: 'group work and first income',
      chapters: [
        { id: 's3-group', title: 'The Group Chat Is Silent', objective: 'Organise a group assignment and resolve a missed commitment.', location: 'campus', character: 'amina' },
        { id: 's3-income', title: 'Earned, Not Found', objective: 'Complete a part-time shift and plan how the income will be used.', location: 'township', character: 'njeri' },
        { id: 's3-deadlines', title: 'Three Deadlines, One Week', objective: 'Submit two assignments before their deadlines.', location: 'campus', character: 'wanjiku' }
      ]
    },
    {
      semester: 4, title: 'The Midpoint', theme: 'reassessment and resilience',
      chapters: [
        { id: 's4-results', title: 'The Transcript Conversation', objective: 'Review results and identify one course that needs a new strategy.', location: 'campus', character: 'mwangi' },
        { id: 's4-wellbeing', title: 'No One Runs on Empty', objective: 'Balance study with rest and a supportive conversation.', location: 'residence', character: 'brian' },
        { id: 's4-direction', title: 'What Do You Want to Build?', objective: 'Choose an academic interest to explore more deeply.', location: 'campus', character: 'amina' }
      ]
    },
    {
      semester: 5, title: 'Deeper Work', theme: 'specialisation and practical skills',
      chapters: [
        { id: 's5-lab', title: 'The Lab Is Not a Lecture Hall', objective: 'Complete a practical lab session and document the result.', location: 'campus', character: 'mwangi' },
        { id: 's5-portfolio', title: 'Proof of Work', objective: 'Publish a substantial project entry in the student portfolio.', location: 'campus', character: 'amina' },
        { id: 's5-mentor', title: 'Ask Better Questions', objective: 'Seek feedback from a lecturer or mentor.', location: 'campus', character: 'mwangi' }
      ]
    },
    {
      semester: 6, title: 'Opportunity Has a Cost', theme: 'internships and trade-offs',
      chapters: [
        { id: 's6-search', title: 'The Application Trail', objective: 'Research and submit a tailored internship application.', location: 'city', character: 'wanjiku' },
        { id: 's6-interview', title: 'Tell Them What You Can Do', objective: 'Prepare for and attend an internship interview.', location: 'city', character: 'amina' },
        { id: 's6-balance', title: 'Keep the Degree Moving', objective: 'Protect academic progress while pursuing an opportunity.', location: 'campus', character: 'mwangi' }
      ]
    },
    {
      semester: 7, title: 'The Final Stretch', theme: 'research and career preparation',
      chapters: [
        { id: 's7-proposal', title: 'A Question Worth Researching', objective: 'Develop and defend a capstone research question.', location: 'campus', character: 'mwangi' },
        { id: 's7-team', title: 'People Behind the Project', objective: 'Resolve a project-team disagreement and agree on responsibilities.', location: 'campus', character: 'amina' },
        { id: 's7-career', title: 'Make Your Work Visible', objective: 'Prepare a CV and present a portfolio project.', location: 'city', character: 'wanjiku' }
      ]
    },
    {
      semester: 8, title: 'The Next Chapter', theme: 'completion and transition',
      chapters: [
        { id: 's8-capstone', title: 'The Work Must Stand', objective: 'Complete the capstone and respond to feedback.', location: 'campus', character: 'mwangi' },
        { id: 's8-finals', title: 'One Last Examination Season', objective: 'Complete all final assessments and clear outstanding academic tasks.', location: 'campus', character: 'amina' },
        { id: 's8-future', title: 'Beyond the Gate', objective: 'Attend a final interview or graduation preparation event.', location: 'city', character: 'brian' }
      ]
    }
  ];

  function validate() {
    const ids = new Set();
    Object.keys(districts).forEach(function (key) {
      const district = districts[key];
      district.places.forEach(function (place) {
        if (ids.has(place.id)) throw new Error('Duplicate place id: ' + place.id);
        ids.add(place.id);
        if (!Array.isArray(place.actions) || !place.actions.length) throw new Error('Place has no actions: ' + place.id);
        if (!['indoor', 'sheltered', 'outdoor'].includes(place.exposure)) throw new Error('Place requires explicit weather exposure: ' + place.id);
      });
      district.exits.forEach(function (exit) {
        if (!districts[exit] || !districts[exit].exits.includes(key)) throw new Error('World route must be reciprocal: ' + key + ' -> ' + exit);
      });
    });
    if (semesterArcs.length !== 8) throw new Error('Campaign must contain eight semester arcs.');
    semesterArcs.forEach(function (arc, index) {
      if (arc.semester !== index + 1 || !arc.chapters.length) throw new Error('Invalid semester arc: ' + arc.semester);
      arc.chapters.forEach(function (chapter) {
        if (!districts[chapter.location] || !characters[chapter.character]) throw new Error('Invalid chapter reference: ' + chapter.id);
      });
    });
    return true;
  }

  validate();
  root.SemesterWorldContent = Object.freeze({
    districts: districts,
    characters: characters,
    semesterArcs: semesterArcs,
    validate: validate
  });
})(typeof window !== 'undefined' ? window : globalThis);
